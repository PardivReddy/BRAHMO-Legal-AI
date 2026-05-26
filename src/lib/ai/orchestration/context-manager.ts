import { compressContext, estimateTokens, truncateTextToTokenLimit } from '@/lib/ai/utils/tokenizer';

const DEFAULT_MAX_INPUT_TOKENS = 10240;

export interface ContextAdjustmentResult {
  prompt: string;
  trimmed: boolean;
}

export function ensurePromptWithinLimit(
  prompt: string,
  maxInputTokens: number = DEFAULT_MAX_INPUT_TOKENS
): ContextAdjustmentResult {
  const cleaned = compressContext(prompt);
  const tokens = estimateTokens(cleaned);

  if (tokens <= maxInputTokens) {
    return { prompt: cleaned, trimmed: false };
  }

  const words = cleaned.split(/\s+/);
  const head = words.slice(0, Math.floor(maxInputTokens / 2));
  const tail = words.slice(-Math.floor(maxInputTokens / 2));
  const trimmed = `${head.join(' ')}\n\n...\n\n${tail.join(' ')}`;

  return {
    prompt: truncateTextToTokenLimit(trimmed, maxInputTokens),
    trimmed: true,
  };
}
