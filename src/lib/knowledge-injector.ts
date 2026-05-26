/**
 * knowledge-injector.ts
 * Retrieve, rank, and assemble knowledge nodes for injection into prompts.
 */
import { supabase } from '@/lib/supabase';
import type {
  KnowledgeNode,
  PracticeArea,
  InjectedKnowledge,
  ScoredKnowledgeNode,
} from '@/types/legal';

export interface InjectorOptions {
  practice_area: PracticeArea;
  tags?: string[]; // relevance tags to match
  client_id?: string | null;
  matter_id?: string | null;
  tokenBudget?: number; // max tokens allowed for injection
  limit?: number; // max nodes to consider
}

const DEFAULT_TOKEN_BUDGET = 800;

// Category priority (higher number = higher priority)
const CATEGORY_PRIORITY: Record<string, number> = {
  CONSTRAINT: 4,
  ANTI_PATTERN: 3,
  DECISION: 2,
  CLIENT_FACT: 1,
};

/**
 * Estimate tokens for a node when token_estimate is not provided.
 */
function estimateTokensFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // heuristic: ~0.75 words per token (GPT-family), so tokens ~= words / 0.75
  return Math.max(8, Math.ceil(words / 0.75));
}

/**
 * Compute simple intersection size for tags
 */
function intersectionSize(a: string[] = [], b: string[] = []): number {
  const set = new Set(a.map((s) => s.toLowerCase()));
  let c = 0;
  for (const x of b) if (set.has(x.toLowerCase())) c++;
  return c;
}

/**
 * Retrieve, rank and assemble injection payload.
 */
export async function injectKnowledge(opts: InjectorOptions): Promise<InjectedKnowledge & { token_usage: { used: number; budget: number } } > {
  const {
    practice_area,
    tags = [],
    client_id = null,
    matter_id = null,
    tokenBudget = DEFAULT_TOKEN_BUDGET,
    limit = 500,
  } = opts;

  // Fetch candidate nodes for the practice area
  const { data, error } = await supabase
    .from('knowledge_nodes')
    .select('*')
    .eq('practice_area', practice_area)
    .eq('is_active', true)
    .limit(limit);

  if (error) {
    throw new Error(`[knowledge-injector] Supabase read error: ${error.message}`);
  }

  const nodes = (data ?? []) as KnowledgeNode[];

  // Score candidates
  const scored: ScoredKnowledgeNode[] = nodes.map((node) => {
    const tagMatches = intersectionSize(node.relevance_tags || [], tags || []);

    // keywordMatches: count occurrences of provided tags inside node content
    let keywordMatches = 0;
    const contentLower = (node.content || '').toLowerCase();
    for (const t of tags) {
      if (!t) continue;
      if (contentLower.includes(t.toLowerCase())) keywordMatches++;
    }

    const clientMatch = node.client_id && client_id && node.client_id === client_id ? 1 : 0;
    const matterMatch = node.matter_id && matter_id && node.matter_id === matter_id ? 1 : 0;

    const relevance_score =
      tagMatches * 5 + keywordMatches * 3 + clientMatch * 10 + matterMatch * 10;

    return {
      node,
      relevance_score,
      matched_tags: (node.relevance_tags || []).filter((t) => (tags || []).map((x) => x.toLowerCase()).includes(t.toLowerCase())),
    } as ScoredKnowledgeNode;
  });

  // Group nodes by category priority, then sort by relevance_score desc
  const grouped: Record<number, ScoredKnowledgeNode[]> = {};
  for (const s of scored) {
    const catKey = String((s.node.category || '').toUpperCase());
    const priority = CATEGORY_PRIORITY[catKey] ?? 0;
    if (!grouped[priority]) grouped[priority] = [];
    grouped[priority].push(s);
  }

  const orderedPriorities = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => b - a);

  for (const p of orderedPriorities) {
    grouped[p].sort((a, b) => b.relevance_score - a.relevance_score);
  }

  // Select nodes honoring priority order while enforcing token budget
  const selected: ScoredKnowledgeNode[] = [];
  let usedTokens = 0;

  for (const p of orderedPriorities) {
    for (const s of grouped[p]) {
      const nodeTokenEstimate = s.node.token_estimate && s.node.token_estimate > 0
        ? s.node.token_estimate
        : estimateTokensFromText(s.node.content || '');

      if (usedTokens + nodeTokenEstimate > tokenBudget) {
        // skip if adding exceeds budget
        continue;
      }

      selected.push(s);
      usedTokens += nodeTokenEstimate;
    }
  }

  // Build injection text with markers
  const injectionParts: string[] = [];
  for (const s of selected) {
    injectionParts.push(`-- [${s.node.category}] ${s.node.title}`);
    injectionParts.push(s.node.content.trim());
    injectionParts.push('');
  }

  const injection_text = injectionParts.join('\n');

  return {
    practice_area,
    nodes: selected,
    total_nodes_found: scored.length,
    injection_timestamp: new Date().toISOString(),
    injection_text,
    // keep token usage meta
    token_usage: { used: usedTokens, budget: tokenBudget },
  } as InjectedKnowledge & { token_usage: { used: number; budget: number } };
}

export default injectKnowledge;
