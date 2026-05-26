/**
 * Deterministic intelligence metrics derived from pipeline metadata and output signals.
 * No LLM scoring — all values are reproducible from generation artifacts.
 */

import type { QueryClassification } from '@/types/legal';

export interface IntelligenceScore {
  overall: number;
  retrieval: number;
  structure: number;
  reasoning: number;
  grounding: number;
}

export type PipelineLevel = 'level1' | 'level2' | 'level3';

export interface IntelligenceScoreInput {
  level: PipelineLevel;
  output: string;
  classification: Pick<QueryClassification, 'confidence' | 'matched_keywords'>;
  hasTemplate: boolean;
  knowledgeNodeCount: number;
  knowledgeTokensUsed: number;
  precedentCount: number;
  precedents: Array<{ title: string }>;
  tokens: { input: number; output: number; total: number };
  sectionReferenceCount?: number;
}

const LEGAL_STRUCTURE_MARKERS = [
  /^#{1,4}\s/m,
  /^(?:IN THE |BEFORE THE |HON'BLE )/im,
  /^(?:MOST RESPECTFULLY|RESPECTFULLY SUBMITTED)/im,
  /^(?:PRAYER|RELief|GROUNDS|FACTS|INDEX)/im,
];

const REASONING_MARKERS = [
  /\b(?:held|observed|laid down|settled|principle)\b/gi,
  /\b(?:jurisdiction|maintainability|discretion|proportionality)\b/gi,
  /\b(?:petitioner|respondent|applicant|accused)\b/gi,
  /\b(?:section|article|rule|regulation)\s+\d+/gi,
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.round(Math.min(max, Math.max(min, value)));
}

function countMatches(text: string, patterns: RegExp[]): number {
  let total = 0;
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const matches = text.match(new RegExp(pattern.source, flags));
    total += matches?.length ?? 0;
  }
  return total;
}

function scoreStructure(output: string): number {
  if (!output.trim()) return 0;

  const lengthScore = clamp((output.length / 2200) * 35, 0, 35);
  const headingHits = countMatches(output, LEGAL_STRUCTURE_MARKERS);
  const headingScore = clamp(headingHits * 12, 0, 40);
  const paragraphScore = clamp((output.split(/\n\n+/).length / 6) * 25, 0, 25);

  return clamp(lengthScore + headingScore + paragraphScore);
}

function scoreReasoning(output: string, level?: PipelineLevel, knowledgeNodes = 0): number {
  if (!output.trim()) return 0;
  const hits = countMatches(output, REASONING_MARKERS);
  let score = clamp(18 + hits * 6, 0, 100);
  if (level === 'level3') {
    score = clamp(score + knowledgeNodes * 4 + (hits > 4 ? 8 : 0), 0, 100);
  }
  return score;
}

function scoreCitationAwareness(output: string, precedents: Array<{ title: string }>): number {
  if (!precedents.length) {
    const genericCites = countMatches(output, [/\bvs?\.?\b/i, /\bSC\b/, /\bHC\b/]);
    return clamp(genericCites * 8, 0, 35);
  }

  const normalizedOutput = output.toLowerCase();
  let matched = 0;

  for (const precedent of precedents) {
    const key = normalizeTitleForMatch(precedent.title);
    if (key.length < 8) continue;
    if (normalizedOutput.includes(key)) matched += 1;
  }

  return clamp((matched / precedents.length) * 100, 0, 100);
}

function scoreRetrieval(input: IntelligenceScoreInput): number {
  if (input.level === 'level1') return 0;

  if (input.level === 'level2') {
    return clamp((input.hasTemplate ? 55 : 18) + input.classification.confidence * 25);
  }

  const precedentScore = clamp(input.precedentCount * 22, 0, 66);
  const knowledgeScore = clamp(input.knowledgeNodeCount * 12, 0, 36);
  const templateScore = input.hasTemplate ? 14 : 0;
  const citationBoost =
    input.precedents.length > 0
      ? scoreCitationAwareness(input.output, input.precedents) * 0.15
      : 0;

  return clamp(precedentScore + knowledgeScore + templateScore + citationBoost);
}

function scoreGrounding(input: IntelligenceScoreInput): number {
  const classificationScore = clamp(input.classification.confidence * 40, 0, 40);
  const keywordScore = clamp(input.classification.matched_keywords.length * 8, 0, 24);
  const templateScore = input.hasTemplate ? 16 : 0;
  const sectionScore = clamp((input.sectionReferenceCount ?? 0) * 5, 0, 20);

  // Enhanced precedent grounding for Level 3
  let precedentGrounding = 0;
  if (input.level === 'level3') {
    const citationScore = scoreCitationAwareness(input.output, input.precedents);
    // Increase weight: grounding boosted when precedents are retrieved AND referenced
    precedentGrounding = clamp(
      (input.precedentCount * 8) + // Active retrieval bonus
      (citationScore * 0.35) + // Citation usage bonus
      (input.knowledgeNodeCount * 3) // Knowledge injection bonus
    , 0, 32);
  }

  // Knowledge injection boost for all levels
  const knowledgeBoost = clamp(input.knowledgeNodeCount * 2, 0, 8);

  return clamp(classificationScore + keywordScore + templateScore + sectionScore + precedentGrounding + knowledgeBoost);
}

function scoreTokenEfficiency(tokens: { input: number; output: number; total: number }): number {
  if (tokens.total <= 0) return 0;
  const ratio = tokens.output / Math.max(tokens.input, 1);
  return clamp(50 + ratio * 25, 40, 100);
}

/** Generic titles that should not appear as authorities */
const GENERIC_AUTHORITY_TITLES =
  /^(?:full\s*document|judgment|order|document|doc|untitled|read\s*more|view\s*doc)$/i;

export function sanitizeAuthorityTitle(title: string): string | null {
  const cleaned = title.replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned.length < 6) return null;
  if (GENERIC_AUTHORITY_TITLES.test(cleaned)) return null;
  return cleaned;
}

export function extractLiveAuthorities(precedents: Array<{ title: string }>): string[] {
  const seen = new Set<string>();

  return precedents
    .map((p) => sanitizeAuthorityTitle(p.title))
    .filter((title): title is string => {
      if (!title) return false;
      if (isPlaceholderAuthority(title)) return false;
      const key = title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** @deprecated Use extractLiveAuthorities */
export function extractAuthoritiesUsed(precedents: Array<{ title: string }>): string[] {
  return extractLiveAuthorities(precedents);
}

const PLACEHOLDER_AUTHORITY =
  /\bstate\s+v\.?\s*x\b|\bxxx\b|\bplaceholder\b|\bexample\s+case\b|\bkey case:\s*state\b/i;

function isPlaceholderAuthority(title: string): boolean {
  return PLACEHOLDER_AUTHORITY.test(title);
}

export interface KnowledgeAuthorityNode {
  node: {
    category: string;
    title: string;
    citations?: unknown;
  };
}

export function extractKnowledgeAuthorities(nodes: KnowledgeAuthorityNode[]): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const item of nodes) {
    const category = (item.node.category || 'KNOWLEDGE').toUpperCase();
    const title = item.node.title?.replace(/^key case:\s*/i, '').trim() ?? '';

    if (title && !isPlaceholderAuthority(title)) {
      const label = `[${category}] ${title}`;
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        results.push(label);
      }
    }

    const citations = item.node.citations;
    if (Array.isArray(citations)) {
      for (const entry of citations) {
        if (!entry || typeof entry !== 'object') continue;
        const record = entry as Record<string, unknown>;
        const citationTitle =
          typeof record.title === 'string' ? record.title.trim() : '';
        if (!citationTitle || isPlaceholderAuthority(citationTitle)) continue;
        const label = `[${category}] ${citationTitle} (internal reference)`;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(label);
      }
    }
  }

  return results;
}

function normalizeTitleForMatch(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 48);
}

/**
 * Compute deterministic intelligence metrics for a single pipeline level.
 */
export function computeIntelligenceScore(input: IntelligenceScoreInput): IntelligenceScore {
  const structure = scoreStructure(input.output);
  const reasoning = scoreReasoning(input.output, input.level, input.knowledgeNodeCount);
  const retrieval = scoreRetrieval(input);
  const grounding = scoreGrounding(input);
  const citationAwareness = scoreCitationAwareness(input.output, input.precedents);
  const tokenEfficiency = scoreTokenEfficiency(input.tokens);

  const weights =
    input.level === 'level1'
      ? { structure: 0.35, reasoning: 0.3, grounding: 0.25, retrieval: 0, citation: 0.1 }
      : input.level === 'level2'
        ? { structure: 0.3, reasoning: 0.25, grounding: 0.25, retrieval: 0.12, citation: 0.08 }
        : { structure: 0.1, reasoning: 0.25, grounding: 0.28, retrieval: 0.32, citation: 0.05 };

  let overall = clamp(
    structure * weights.structure +
      reasoning * weights.reasoning +
      grounding * weights.grounding +
      retrieval * weights.retrieval +
      citationAwareness * weights.citation +
      tokenEfficiency * 0.04
  );

  if (input.level === 'level3') {
    const enrichmentBonus = clamp(
      input.precedentCount * 5 +
        input.knowledgeNodeCount * 4 +
        (input.hasTemplate ? 6 : 0) +
        citationAwareness * 0.08,
      0,
      18
    );
    overall = clamp(overall + enrichmentBonus);
  }

  return {
    overall,
    retrieval,
    structure,
    reasoning,
    grounding: clamp(grounding * 0.6 + citationAwareness * 0.4),
  };
}

export function buildLevelIntelligenceScores(params: {
  outputs: { level1: string; level2: string; level3: string };
  classification: QueryClassification;
  hasTemplate: boolean;
  knowledgeNodeCount: number;
  knowledgeTokensUsed: number;
  knowledgeNodes?: KnowledgeAuthorityNode[];
  precedents: Array<{ title: string }>;
  tokens: {
    level1: { input: number; output: number; total: number };
    level2: { input: number; output: number; total: number };
    level3: { input: number; output: number; total: number };
  };
  sectionReferences?: { level1: number; level2: number; level3: number };
}): {
  level1: IntelligenceScore;
  level2: IntelligenceScore;
  level3: IntelligenceScore;
  liveAuthorities: string[];
  knowledgeAuthorities: string[];
  /** @deprecated Use liveAuthorities */
  authoritiesUsed: string[];
} {
  const precedentCount = params.precedents.length;

  return {
    level1: computeIntelligenceScore({
      level: 'level1',
      output: params.outputs.level1,
      classification: params.classification,
      hasTemplate: false,
      knowledgeNodeCount: 0,
      knowledgeTokensUsed: 0,
      precedentCount: 0,
      precedents: [],
      tokens: params.tokens.level1,
      sectionReferenceCount: params.sectionReferences?.level1,
    }),
    level2: computeIntelligenceScore({
      level: 'level2',
      output: params.outputs.level2,
      classification: params.classification,
      hasTemplate: params.hasTemplate,
      knowledgeNodeCount: 0,
      knowledgeTokensUsed: 0,
      precedentCount: 0,
      precedents: [],
      tokens: params.tokens.level2,
      sectionReferenceCount: params.sectionReferences?.level2,
    }),
    level3: computeIntelligenceScore({
      level: 'level3',
      output: params.outputs.level3,
      classification: params.classification,
      hasTemplate: params.hasTemplate,
      knowledgeNodeCount: params.knowledgeNodeCount,
      knowledgeTokensUsed: params.knowledgeTokensUsed,
      precedentCount,
      precedents: params.precedents,
      tokens: params.tokens.level3,
      sectionReferenceCount: params.sectionReferences?.level3,
    }),
    liveAuthorities: extractLiveAuthorities(params.precedents),
    knowledgeAuthorities: extractKnowledgeAuthorities(params.knowledgeNodes ?? []),
    authoritiesUsed: extractLiveAuthorities(params.precedents),
  };
}
