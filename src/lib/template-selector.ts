/**
 * @module lib/template-selector
 * @description Core classification engine for BRAHMO Legal AI.
 *
 * Uses a data-driven keyword registry to classify user queries into
 * practice areas and document types. Adding a new practice area means
 * only adding entries to KEYWORD_REGISTRY — zero code changes required.
 */

import type {
  QueryClassification,
  PracticeArea,
  LegalTemplate,
} from '@/types/legal';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Registry — the single source of truth for classification
// ─────────────────────────────────────────────────────────────────────────────

/** A single registry entry that maps keywords to a classification target */
export interface KeywordRegistryEntry {
  /** Keywords / phrases that trigger this classification (lowercase) */
  keywords: string[];
  /** Target practice area */
  practice_area: PracticeArea;
  /** Target document type */
  document_type: string;
  /** Applicable court type (use 'na' when not court-specific) */
  court_type: string;
  /** Static base weight — higher = stronger signal when keywords match */
  base_weight: number;
}

/**
 * KEYWORD_REGISTRY — extend this array to support new practice areas
 * or document types without touching any classification logic.
 */
export const KEYWORD_REGISTRY: KeywordRegistryEntry[] = [
  // ── Criminal ─────────────────────────────────────────────────────────────
  {
    keywords: [
      'anticipatory bail', 'anticipatory', 'section 438', 'pre-arrest bail',
      'apprehension of arrest', 'custodial interrogation',
    ],
    practice_area: 'criminal',
    document_type: 'anticipatory_bail',
    court_type: 'high_court',
    base_weight: 1.0,
  },
  {
    keywords: [
      'regular bail', 'bail application', 'bail bond', 'section 439',
      'default bail', 'bail plea',
    ],
    practice_area: 'criminal',
    document_type: 'regular_bail',
    court_type: 'sessions_court',
    base_weight: 1.0,
  },
  {
    keywords: [
      'quashing petition', 'quash fir', 'quashing of fir', 'section 482',
      'quash proceedings', 'inherent powers', 'quashing',
    ],
    practice_area: 'criminal',
    document_type: 'quashing_petition',
    court_type: 'high_court',
    base_weight: 1.0,
  },
  {
    keywords: [
      'criminal appeal', 'appeal against conviction', 'appeal against sentence',
      'appellate court', 'criminal revision',
    ],
    practice_area: 'criminal',
    document_type: 'criminal_appeal',
    court_type: 'high_court',
    base_weight: 1.0,
  },
  {
    keywords: [
      'fir quashing', 'quash fir', 'false fir', 'fir cancellation',
      'set aside fir',
    ],
    practice_area: 'criminal',
    document_type: 'fir_quashing',
    court_type: 'high_court',
    base_weight: 1.0,
  },
  {
    keywords: [
      'discharge application', 'discharge petition', 'section 227',
      'section 239', 'discharge accused', 'no prima facie',
    ],
    practice_area: 'criminal',
    document_type: 'discharge_application',
    court_type: 'sessions_court',
    base_weight: 1.0,
  },

  // ── Corporate ────────────────────────────────────────────────────────────
  {
    keywords: [
      'nda', 'non-disclosure', 'non disclosure', 'confidentiality agreement',
      'nda review', 'confidentiality',
    ],
    practice_area: 'corporate',
    document_type: 'nda_review',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'board resolution', 'board meeting', 'directors resolution',
      'circular resolution', 'board approval',
    ],
    practice_area: 'corporate',
    document_type: 'board_resolution',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'shareholders agreement', 'sha', 'shareholder rights',
      'shareholders pact', 'equity agreement', 'share subscription',
    ],
    practice_area: 'corporate',
    document_type: 'shareholders_agreement',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'merger', 'acquisition', 'm&a', 'merger and acquisition',
      'amalgamation', 'scheme of arrangement', 'takeover',
    ],
    practice_area: 'corporate',
    document_type: 'merger_acquisition',
    court_type: 'nclt',
    base_weight: 1.0,
  },
  {
    keywords: [
      'compliance report', 'regulatory compliance', 'annual compliance',
      'statutory compliance', 'compliance audit',
    ],
    practice_area: 'corporate',
    document_type: 'compliance_report',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'compliance notice', 'regulatory notice', 'statutory notice',
      'show cause notice', 'regulatory show cause',
    ],
    practice_area: 'corporate',
    document_type: 'compliance_notice',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'shareholder dispute', 'shareholder notice', 'dispute notice',
      'oppression and mismanagement', 'oppression mismanagement', 'section 241',
      'section 242 companies act',
    ],
    practice_area: 'corporate',
    document_type: 'shareholder_dispute_notice',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'arbitration clause', 'arbitration agreement', 'dispute resolution clause',
      'seat of arbitration', 'arbitral tribunal', 'arbitration drafting',
    ],
    practice_area: 'corporate',
    document_type: 'arbitration_clause',
    court_type: 'na',
    base_weight: 1.0,
  },
  {
    keywords: [
      'ipo', 'initial public offering', 'ipo documentation',
      'prospectus', 'drhp', 'draft red herring', 'public issue',
    ],
    practice_area: 'corporate',
    document_type: 'ipo_documentation',
    court_type: 'na',
    base_weight: 1.0,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify a user query into practice area, document type, and court type
 * by scoring it against the keyword registry.
 *
 * @param query - The raw user query string
 * @returns A {@link QueryClassification} with the best match and confidence
 *
 * @example
 * ```ts
 * classifyQuery('Draft anticipatory bail application');
 * // → { practice_area: 'criminal', document_type: 'anticipatory_bail',
 * //     court_type: 'high_court', confidence: 0.9, … }
 *
 * classifyQuery('Hello world');
 * // → { practice_area: 'generic', document_type: 'general_query',
 * //     court_type: 'na', confidence: 0.1, … }
 * ```
 */
export function classifyQuery(query: string): QueryClassification {
  const normalized = query.toLowerCase().trim();

  if (!normalized) {
    return fallbackClassification(query);
  }

  let bestEntry: KeywordRegistryEntry | null = null;
  let bestScore = 0;
  let bestMatches: string[] = [];

  for (const entry of KEYWORD_REGISTRY) {
    const { score, matches } = scoreEntry(normalized, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
      bestMatches = matches;
    }
  }

  // If the best score is too low, fall back to generic
  if (!bestEntry || bestScore < 0.15) {
    return fallbackClassification(query);
  }

  // Confidence: scale the raw score into 0-1 (capped at 1.0)
  const confidence = Math.min(1.0, Math.round(bestScore * 100) / 100);

  return {
    practice_area: bestEntry.practice_area,
    document_type: bestEntry.document_type,
    court_type: bestEntry.court_type,
    confidence,
    matched_keywords: bestMatches,
    raw_query: query,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select the best active Supabase template for a given classification.
 *
 * @param classification - The query classification result
 * @returns The matching {@link LegalTemplate} or null if none found
 */
export async function selectTemplate(
  classification: QueryClassification
): Promise<LegalTemplate | null> {
  try {
    // Primary lookup: exact match on practice_area + document_type
    let query = supabase
      .from('legal_templates')
      .select('*')
      .eq('practice_area', classification.practice_area)
      .eq('document_type', classification.document_type)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1);

    // Optionally narrow by court_type when it's meaningful
    if (classification.court_type && classification.court_type !== 'na') {
      query = query.eq('court_type', classification.court_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[BRAHMO TemplateSelector] Supabase query error:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      return data[0] as unknown as LegalTemplate;
    }

    // Fallback: match on practice_area + document_type only (ignore court_type)
    if (classification.court_type && classification.court_type !== 'na') {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('legal_templates')
        .select('*')
        .eq('practice_area', classification.practice_area)
        .eq('document_type', classification.document_type)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1);

      if (fallbackError) {
        console.error('[BRAHMO TemplateSelector] Fallback query error:', fallbackError.message);
        return null;
      }

      if (fallbackData && fallbackData.length > 0) {
        return fallbackData[0] as unknown as LegalTemplate;
      }
    }

    return null;
  } catch (err) {
    console.error('[BRAHMO TemplateSelector] Unexpected error:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring Internals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Score a normalised query against a single registry entry.
 * Uses a combination of exact phrase match (high value) and
 * individual keyword overlap (additive).
 */
function scoreEntry(
  normalized: string,
  entry: KeywordRegistryEntry
): { score: number; matches: string[] } {
  const matches: string[] = [];
  let raw = 0;

  for (const keyword of entry.keywords) {
    if (normalized.includes(keyword)) {
      matches.push(keyword);

      // Multi-word phrases are stronger signals
      const wordCount = keyword.split(/\s+/).length;
      raw += wordCount >= 2 ? 0.35 : 0.15;
    }
  }

  if (matches.length === 0) return { score: 0, matches: [] };

  // Apply base weight and coverage bonus
  const coverageBonus = matches.length / entry.keywords.length;
  const score = (raw + coverageBonus * 0.2) * entry.base_weight;

  return { score: Math.min(1.0, score), matches };
}

/**
 * Return a generic fallback classification for unrecognised queries.
 */
function fallbackClassification(query: string): QueryClassification {
  return {
    practice_area: 'generic',
    document_type: 'general_query',
    court_type: 'na',
    confidence: 0.1,
    matched_keywords: [],
    raw_query: query,
  };
}
