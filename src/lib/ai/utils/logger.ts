import type { AIProviderName } from '@/lib/ai/providers/types';

export interface LogMeta {
  [key: string]: unknown;
  provider?: AIProviderName | null;
  model?: string;
  latencyMs?: number;
  retries?: number;
  errorCode?: string;
  fallback?: boolean;
  degraded?: boolean;
  tokens?: { input: number; output: number; total: number };
  requestId?: string;
}

function formatMeta(meta: LogMeta): string {
  const entries = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`);
  return entries.length ? ` | ${entries.join(' | ')}` : '';
}

export const logger = {
  info(message: string, meta: LogMeta = {}): void {
    console.info(`[AI][INFO] ${message}${formatMeta(meta)}`);
  },
  warn(message: string, meta: LogMeta = {}): void {
    console.warn(`[AI][WARN] ${message}${formatMeta(meta)}`);
  },
  error(message: string, meta: LogMeta = {}): void {
    console.error(`[AI][ERROR] ${message}${formatMeta(meta)}`);
  },
  debug(message: string, meta: LogMeta = {}): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[AI][DEBUG] ${message}${formatMeta(meta)}`);
    }
  },
};
