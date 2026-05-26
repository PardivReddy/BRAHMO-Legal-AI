/**
 * @module lib/quality-evaluator
 * @description Heuristic-based quality evaluator for generated legal content.
 * Scores on accuracy, completeness, formatting, and citation quality
 * without requiring an additional AI call.
 */

import type { QualityScore, QueryClassification, PracticeArea } from '@/types/legal';

// ─────────────────────────────────────────────────────────────────────────────
// Legal-term lexicons (keyed by practice area)
// ─────────────────────────────────────────────────────────────────────────────

const LEGAL_TERMS: Record<string, string[]> = {
  criminal: [
    'accused', 'bail', 'cognizable', 'non-bailable', 'fir',
    'chargesheet', 'section', 'ipc', 'bns', 'crpc', 'bnss',
    'prosecution', 'investigation', 'magistrate', 'sessions',
    'complainant', 'surety', 'anticipatory', 'remand', 'custody',
    'evidence', 'witness', 'confession', 'statement', 'trial',
  ],
  corporate: [
    'company', 'director', 'shareholder', 'board', 'resolution',
    'memorandum', 'articles', 'sebi', 'roc', 'compliance',
    'dividend', 'ipo', 'nda', 'merger', 'acquisition',
    'due diligence', 'indemnity', 'representation', 'warranty',
    'fiduciary', 'confidentiality', 'non-compete', 'valuation',
  ],
  civil: [
    'plaintiff', 'defendant', 'suit', 'decree', 'injunction',
    'specific relief', 'cpc', 'order', 'rule', 'plaint',
    'written statement', 'issues', 'hearing', 'evidence', 'appeal',
  ],
  family: [
    'petition', 'divorce', 'custody', 'maintenance', 'alimony',
    'succession', 'guardian', 'marriage', 'conjugal', 'dowry',
  ],
  generic: [
    'court', 'law', 'legal', 'act', 'section', 'order',
    'petition', 'application', 'tribunal', 'jurisdiction',
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Formatting signals
// ─────────────────────────────────────────────────────────────────────────────

/** Regex patterns that indicate proper legal formatting */
const FORMATTING_PATTERNS: { pattern: RegExp; weight: number; label: string }[] = [
  { pattern: /^\d+\.\s/m, weight: 8, label: 'Numbered list' },
  { pattern: /^[IVXLCDM]+\.\s/m, weight: 6, label: 'Roman numeral list' },
  { pattern: /^[a-z]\)\s/m, weight: 5, label: 'Alphabetic sub-list' },
  { pattern: /\b(PRAYER|RELIEF|GROUNDS|FACTS|SUBMISSIONS)\b/i, weight: 10, label: 'Legal section heading' },
  { pattern: /\b(HUMBLE|RESPECTFULLY|HON'BLE|HONOURABLE)\b/i, weight: 6, label: 'Formal language' },
  { pattern: /\b(PETITIONER|RESPONDENT|APPLICANT|COMPLAINANT)\b/i, weight: 7, label: 'Party designation' },
  { pattern: /\bIN THE .+ COURT\b/i, weight: 10, label: 'Court header' },
  { pattern: /\bVerified at .+ on\b/i, weight: 5, label: 'Verification clause' },
  { pattern: /\b(WHEREAS|NOW THEREFORE|HEREINAFTER)\b/i, weight: 7, label: 'Contractual clause' },
  { pattern: /\bSchedule [A-Z]\b/i, weight: 5, label: 'Schedule reference' },
];

/** Regex patterns that indicate case citations */
const CITATION_PATTERNS: RegExp[] = [
  /\(\d{4}\)\s*\d+\s*SCC\s*\d+/i,                   // (2023) 5 SCC 123
  /AIR\s*\d{4}\s*(SC|HC|Del|Bom|Mad|Cal|Kar)\s*\d+/i, // AIR 2023 SC 456
  /\d{4}\s*\(\d+\)\s*SCR\s*\d+/i,                    // 2023 (4) SCR 789
  /\d{4}\s+SCC\s+\(Cri\)\s+\d+/i,                   // 2023 SCC (Cri) 123
  /\d{4}\s+CriLJ\s+\d+/i,                           // 2023 CriLJ 456
  /\bv\.?\s+(?:State|Union)\b/i,                     // ... v. State / Union
  /\bManupatra\b/i,
  /\bSCC\s+Online\b/i,
];

// ─────────────────────────────────────────────────────────────────────────────
// Thresholds
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum word counts per completeness tier */
const COMPLETENESS_THRESHOLDS = {
  excellent: 800,
  good: 400,
  fair: 200,
  poor: 50,
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate the quality of AI-generated legal content using heuristic scoring.
 *
 * @param content         - The generated text to evaluate
 * @param classification  - The query classification that produced the content
 * @returns A {@link QualityScore} with an overall score (0-100) and recommendations
 */
export function evaluateQuality(
  content: string,
  classification: QueryClassification
): QualityScore {
  if (!content || content.trim().length === 0) {
    return {
      overall: 0,
      accuracy: 0,
      completeness: 0,
      formatting: 0,
      citation_quality: 0,
      recommendations: ['Generated content is empty. Retry the generation.'],
    };
  }

  const accuracy = scoreAccuracy(content, classification.practice_area);
  const completeness = scoreCompleteness(content);
  const formatting = scoreFormatting(content);
  const citationQuality = scoreCitations(content);

  const overall = Math.round(
    accuracy * 0.30 +
    completeness * 0.25 +
    formatting * 0.25 +
    citationQuality * 0.20
  );

  const recommendations = buildRecommendations(
    accuracy,
    completeness,
    formatting,
    citationQuality,
    classification
  );

  return {
    overall,
    accuracy,
    completeness,
    formatting,
    citation_quality: citationQuality,
    recommendations,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scorers (each returns 0-100)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score based on how many practice-area-specific legal terms appear.
 */
function scoreAccuracy(content: string, practiceArea: PracticeArea): number {
  const lc = content.toLowerCase();
  const areaTerms = LEGAL_TERMS[practiceArea] ?? LEGAL_TERMS.generic;
  const genericTerms = practiceArea !== 'generic' ? LEGAL_TERMS.generic : [];
  const allTerms = [...new Set([...areaTerms, ...genericTerms])];

  if (allTerms.length === 0) return 50;

  const matched = allTerms.filter((term) => lc.includes(term));
  const ratio = matched.length / allTerms.length;

  // Non-linear scaling: a 40 % term hit rate already indicates good accuracy
  return Math.min(100, Math.round(ratio * 250));
}

/**
 * Score based on word count and presence of distinct sections.
 */
function scoreCompleteness(content: string): number {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const sectionCount = (content.match(/^\s*#{1,3}\s|\b[A-Z]{2,}[:\s]/gm) || []).length;

  let score = 0;

  if (wordCount >= COMPLETENESS_THRESHOLDS.excellent) score += 60;
  else if (wordCount >= COMPLETENESS_THRESHOLDS.good) score += 45;
  else if (wordCount >= COMPLETENESS_THRESHOLDS.fair) score += 30;
  else if (wordCount >= COMPLETENESS_THRESHOLDS.poor) score += 15;
  else score += 5;

  // Bonus for distinct sections (max 40 pts)
  score += Math.min(40, sectionCount * 8);

  return Math.min(100, score);
}

/**
 * Score based on presence of proper legal formatting signals.
 */
function scoreFormatting(content: string): number {
  let score = 0;
  const maxPossible = FORMATTING_PATTERNS.reduce((s, p) => s + p.weight, 0);

  for (const { pattern, weight } of FORMATTING_PATTERNS) {
    if (pattern.test(content)) {
      score += weight;
    }
  }

  return Math.min(100, Math.round((score / maxPossible) * 100));
}

/**
 * Score based on presence and diversity of case citations.
 */
function scoreCitations(content: string): number {
  let matchCount = 0;
  let patternHits = 0;

  for (const pattern of CITATION_PATTERNS) {
    const matches = content.match(new RegExp(pattern.source, 'gi'));
    if (matches) {
      matchCount += matches.length;
      patternHits += 1;
    }
  }

  if (matchCount === 0) return 0;

  // Reward both quantity and variety of citation formats
  const quantityScore = Math.min(50, matchCount * 10);
  const varietyScore = Math.min(50, patternHits * 12);

  return Math.min(100, quantityScore + varietyScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations builder
// ─────────────────────────────────────────────────────────────────────────────

function buildRecommendations(
  accuracy: number,
  completeness: number,
  formatting: number,
  citationQuality: number,
  classification: QueryClassification
): string[] {
  const recs: string[] = [];

  if (accuracy < 40) {
    recs.push(
      `Add more ${classification.practice_area}-specific legal terminology to strengthen relevance.`
    );
  }

  if (completeness < 40) {
    recs.push(
      'Expand the content with additional sections, grounds, or arguments for a more thorough document.'
    );
  }

  if (formatting < 40) {
    recs.push(
      'Improve formatting: use numbered paragraphs, section headings (FACTS, GROUNDS, PRAYER), and party designations.'
    );
  }

  if (citationQuality < 30) {
    recs.push(
      'Include relevant case citations (e.g. "(2023) 5 SCC 123" or "AIR 2023 SC 456") to strengthen legal authority.'
    );
  }

  if (recs.length === 0) {
    recs.push('Content quality is satisfactory across all evaluated dimensions.');
  }

  return recs;
}
