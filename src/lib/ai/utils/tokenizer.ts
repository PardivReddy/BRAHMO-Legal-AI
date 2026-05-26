export function estimateTokens(text: string): number {
  const cleaned = text.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return 0;
  }

  const words = cleaned.split(' ').length;
  const approximate = Math.ceil(words * 1.3);
  return Math.max(1, approximate);
}

export function truncateTextToTokenLimit(text: string, maxTokens: number): string {
  const tokens = estimateTokens(text);
  if (tokens <= maxTokens) {
    return text;
  }

  const words = text.trim().split(/\s+/);
  if (words.length <= maxTokens) {
    return text;
  }

  return words.slice(0, maxTokens).join(' ');
}

export function compressContext(text: string): string {
  return text
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
