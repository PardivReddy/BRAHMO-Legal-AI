'use client';

import { FormEvent, memo } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, fadeUpTransition } from '@/lib/motion';

export interface DemoPreset {
  label: string;
  query: string;
}

interface PremiumQueryInputProps {
  query: string;
  isLoading: boolean;
  error: string | null;
  demoPresets?: DemoPreset[];
  onQueryChange: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function PremiumQueryInput({
  query,
  isLoading,
  error,
  demoPresets = [],
  onQueryChange,
  onSubmit,
}: PremiumQueryInputProps) {
  const canSubmit = Boolean(query.trim()) && !isLoading;

  return (
    <motion.form
      onSubmit={onSubmit}
      {...fadeUp}
      transition={{ ...fadeUpTransition, delay: 0.06 }}
      className="surface rounded-2xl p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label htmlFor="query" className="text-sm font-medium text-[#f5f5f5]">
            Matter instruction
          </label>
          <p className="mt-1 text-xs leading-5 text-[#71717a]">
            Document type, court, statute, facts, and relief improve orchestration quality.
          </p>
        </div>
        <span className="section-label shrink-0">Generation</span>
      </div>

      {demoPresets.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {demoPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isLoading}
              onClick={() => onQueryChange(preset.query)}
              className="focus-ring rounded border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[11px] text-[#a1a1aa] transition hover:bg-[rgba(255,255,255,0.03)] hover:text-[#f5f5f5] disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        id="query"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        disabled={isLoading}
        rows={5}
        className="focus-ring premium-scrollbar min-h-32 w-full resize-y rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050505] p-4 text-sm leading-7 text-[#f5f5f5] outline-none transition placeholder:text-[#71717a] disabled:cursor-not-allowed disabled:opacity-50"
        placeholder="Draft an anticipatory bail application under Section 438 CrPC…"
      />

      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {['classify', 'template', 'knowledge', 'precedent'].map((tag) => (
            <span
              key={tag}
              className="rounded border border-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[11px] text-[#71717a]"
            >
              {tag}
            </span>
          ))}
        </div>

        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileHover={canSubmit ? { opacity: 0.92 } : undefined}
          whileTap={canSubmit ? { scale: 0.99 } : undefined}
          transition={{ duration: 0.15 }}
          className="focus-ring inline-flex h-11 min-w-[200px] items-center justify-center rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#f5f5f5] px-5 text-sm font-medium text-[#050505] transition disabled:cursor-not-allowed disabled:border-[rgba(255,255,255,0.06)] disabled:bg-[#111214] disabled:text-[#71717a]"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#050505] skeleton-pulse" aria-hidden />
              Orchestrating…
            </span>
          ) : (
            'Generate comparison'
          )}
        </motion.button>
      </div>

      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] px-3 py-2.5 text-sm text-[#a1a1aa]"
          role="alert"
        >
          {error}
        </motion.div>
      ) : null}
    </motion.form>
  );
}

export default memo(PremiumQueryInput);
