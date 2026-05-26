/**
 * @module lib/token-manager
 * @description Token usage tracking and estimation for BRAHMO Legal AI.
 * Tracks consumption across models, estimates costs, and provides session summaries.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Per-model usage breakdown */
export interface ModelUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  call_count: number;
  estimated_cost_usd: number;
}

/** Aggregated session token usage summary */
export interface TokenUsageSummary {
  total_input_tokens: number;
  total_output_tokens: number;
  total_tokens: number;
  total_calls: number;
  total_estimated_cost_usd: number;
  by_model: ModelUsage[];
  session_start: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cost Table (USD per 1 M tokens — update as pricing changes)
// ─────────────────────────────────────────────────────────────────────────────

/** Cost per 1 million tokens for supported models */
const MODEL_COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.0-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
};

const DEFAULT_COST_PER_MILLION = { input: 0.15, output: 0.60 };

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Store
// ─────────────────────────────────────────────────────────────────────────────

const sessionStart = new Date().toISOString();
const usageByModel = new Map<string, ModelUsage>();

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Estimate the number of tokens in a text string.
 * Uses the widely-adopted heuristic of ~4 characters per token for
 * English / mixed-language text processed by modern LLMs.
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count (always ≥ 0)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Record token usage for a specific model invocation.
 *
 * @param model       - Model identifier (e.g. 'gemini-2.0-flash')
 * @param inputTokens - Number of prompt/input tokens consumed
 * @param outputTokens - Number of completion/output tokens consumed
 */
export function trackUsage(
  model: string,
  inputTokens: number,
  outputTokens: number
): void {
  const existing = usageByModel.get(model);
  const cost = calculateCost(model, inputTokens, outputTokens);

  if (existing) {
    existing.input_tokens += inputTokens;
    existing.output_tokens += outputTokens;
    existing.total_tokens += inputTokens + outputTokens;
    existing.call_count += 1;
    existing.estimated_cost_usd += cost;
  } else {
    usageByModel.set(model, {
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      call_count: 1,
      estimated_cost_usd: cost,
    });
  }
}

/**
 * Retrieve an aggregated usage summary for the current session.
 *
 * @returns Summary with totals and per-model breakdown
 */
export function getUsageSummary(): TokenUsageSummary {
  const byModel = Array.from(usageByModel.values());

  const totals = byModel.reduce(
    (acc, m) => ({
      input: acc.input + m.input_tokens,
      output: acc.output + m.output_tokens,
      tokens: acc.tokens + m.total_tokens,
      calls: acc.calls + m.call_count,
      cost: acc.cost + m.estimated_cost_usd,
    }),
    { input: 0, output: 0, tokens: 0, calls: 0, cost: 0 }
  );

  return {
    total_input_tokens: totals.input,
    total_output_tokens: totals.output,
    total_tokens: totals.tokens,
    total_calls: totals.calls,
    total_estimated_cost_usd: Math.round(totals.cost * 1_000_000) / 1_000_000, // 6 dp
    by_model: byModel,
    session_start: sessionStart,
  };
}

/**
 * Reset all tracked usage data. Useful for testing or session rotation.
 */
export function resetUsage(): void {
  usageByModel.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Internals
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate the estimated cost in USD for a given model call.
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = MODEL_COST_PER_MILLION[model] ?? DEFAULT_COST_PER_MILLION;
  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  );
}
