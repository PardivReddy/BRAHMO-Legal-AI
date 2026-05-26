/**
 * Removes placeholder-style case citations and unresolved template placeholders from generated drafts.
 */

import { sanitizeUnresolvedPlaceholders } from '@/lib/placeholder-extractor';

const PLACEHOLDER_CITATION_PATTERNS = [
  /\bState\s+v\.?\s*X\s*(?:\([^)]*\))?/gi,
  /\bX\s+v\.?\s*State\b/gi,
  /\b(?:In\s+)?State\s+v\.?\s*X\b[^.\n]*/gi,
  /\bKey case:\s*State\s+v\.?\s*X[^.\n]*/gi,
];

export function sanitizeDraftOutput(text: string): string {
  let cleaned = text;

  for (const pattern of PLACEHOLDER_CITATION_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  cleaned = cleaned
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Replace unresolved template placeholders with safe labels
  cleaned = sanitizeUnresolvedPlaceholders(cleaned);

  return cleaned;
}
