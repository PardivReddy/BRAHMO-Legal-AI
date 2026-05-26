/**
 * @module lib/relevance-ranker
 * @description TF-IDF-inspired relevance ranker for BRAHMO Legal AI.
 * Scores knowledge nodes against a user query using keyword overlap,
 * tag matching, and title weighting.
 */

import type { KnowledgeNode } from '@/types/legal';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** A knowledge node enriched with its relevance score */
export interface ScoredItem {
  item: KnowledgeNode;
  score: number;
  matched_terms: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Relative weight multipliers for different match locations */
const WEIGHT = {
  title: 3.0,
  relevance_tag: 2.5,
  content: 1.0,
  priority_bonus_factor: 0.1, // Added per priority level (1-10)
} as const;

/** Common legal stop-words to exclude from matching */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'shall', 'should', 'may', 'might', 'must', 'can', 'could',
  'would', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'by',
  'from', 'as', 'into', 'through', 'during', 'before', 'after',
  'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either',
  'neither', 'each', 'every', 'all', 'any', 'this', 'that', 'it',
  'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she',
  'his', 'her', 'they', 'their', 'what', 'which', 'who', 'whom',
  'how', 'when', 'where', 'why', 'if', 'then', 'than', 'no', 'yes',
  'up', 'out', 'about', 'just', 'also', 'very', 'much', 'such',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rank an array of knowledge nodes by relevance to a query.
 * Results are sorted in descending order of score.
 *
 * @param items - The knowledge nodes to rank
 * @param query - The user's search query
 * @returns Sorted array of {@link ScoredItem} with relevance scores
 */
export function rankByRelevance(items: KnowledgeNode[], query: string): ScoredItem[] {
  if (!items.length || !query.trim()) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  // Build a rudimentary IDF map across the corpus of items
  const idfMap = buildIdfMap(items, queryTokens);

  const scored: ScoredItem[] = items.map((item) => {
    const { score, matchedTerms } = scoreItem(item, queryTokens, idfMap);
    return { item, score, matched_terms: matchedTerms };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculate a single relevance score between a text and a query.
 * Useful for ad-hoc scoring outside the full ranking pipeline.
 *
 * @param text  - The text to compare against
 * @param query - The user query
 * @returns A relevance score (0-1 range, normalised)
 */
export function calculateRelevanceScore(text: string, query: string): number {
  const queryTokens = tokenize(query);
  const textTokens = tokenize(text);

  if (queryTokens.length === 0 || textTokens.length === 0) return 0;

  const textSet = new Set(textTokens);
  const matched = queryTokens.filter((t) => textSet.has(t));

  return matched.length / queryTokens.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tokenize text: lowercase, split on non-alphanumeric, strip stop-words.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Build an IDF (Inverse Document Frequency) map for query terms.
 * IDF = log(N / (1 + df)) where df = number of docs containing the term.
 */
function buildIdfMap(
  items: KnowledgeNode[],
  queryTokens: string[]
): Map<string, number> {
  const n = items.length;
  const docFreq = new Map<string, number>();

  for (const token of queryTokens) {
    docFreq.set(token, 0);
  }

  for (const item of items) {
    const docText = `${item.title} ${item.content} ${item.relevance_tags.join(' ')}`.toLowerCase();
    for (const token of queryTokens) {
      if (docText.includes(token)) {
        docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
      }
    }
  }

  const idf = new Map<string, number>();
  for (const [token, df] of docFreq.entries()) {
    idf.set(token, Math.log((n + 1) / (1 + df)) + 1); // smoothed IDF
  }

  return idf;
}

/**
 * Score a single knowledge node against query tokens using weighted TF-IDF.
 */
function scoreItem(
  item: KnowledgeNode,
  queryTokens: string[],
  idfMap: Map<string, number>
): { score: number; matchedTerms: string[] } {
  const titleLc = item.title.toLowerCase();
  const contentLc = item.content.toLowerCase();
  const tagsLc = item.relevance_tags.map((t) => t.toLowerCase());

  let score = 0;
  const matchedTerms: string[] = [];

  for (const token of queryTokens) {
    const idf = idfMap.get(token) ?? 1;
    let termScore = 0;

    // Title TF * weight
    const titleTf = countOccurrences(titleLc, token);
    if (titleTf > 0) {
      termScore += titleTf * WEIGHT.title * idf;
    }

    // Relevance tag match * weight
    const tagMatch = tagsLc.some((tag) => tag.includes(token));
    if (tagMatch) {
      termScore += WEIGHT.relevance_tag * idf;
    }

    // Content TF * weight (capped to avoid long-document bias)
    const contentTf = Math.min(countOccurrences(contentLc, token), 5);
    if (contentTf > 0) {
      termScore += contentTf * WEIGHT.content * idf;
    }

    if (termScore > 0) {
      matchedTerms.push(token);
      score += termScore;
    }
  }

  // Priority bonus (higher priority items get a small boost)
  score += item.priority * WEIGHT.priority_bonus_factor;

  return { score, matchedTerms };
}

/**
 * Count non-overlapping occurrences of a substring in text.
 */
function countOccurrences(text: string, sub: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}
