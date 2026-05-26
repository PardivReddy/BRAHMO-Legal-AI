'use client';

import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE_PREMIUM, fadeUp, fadeUpTransition } from '@/lib/motion';
import type { PipelineTrustSignals } from '@/types/generation';

export interface IKCaseView {
  doc_id?: string;
  title: string;
  headline?: string;
  court?: string;
  date?: string;
  citation?: string;
  snippet?: string;
  url?: string;
}

interface IKResearchPanelProps {
  cases: IKCaseView[];
  error?: string;
  warning?: string;
  query?: string;
  fromCache?: boolean;
  isLoading?: boolean;
  pipelineSignals?: PipelineTrustSignals;
}

function IKResearchPanel({
  cases,
  error,
  warning,
  query,
  fromCache,
  isLoading = false,
  pipelineSignals,
}: IKResearchPanelProps) {
  const hasLive = cases.length > 0;
  const statusLabel = isLoading
    ? null
    : hasLive
      ? fromCache
        ? 'cached precedent results'
        : 'retrieval grounded'
      : error
        ? 'live retrieval unavailable'
        : 'no live precedents';

  return (
    <motion.section {...fadeUp} transition={fadeUpTransition} className="surface rounded-2xl">
      <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label">Live precedent retrieval</p>
            <h2 className="mt-1 text-base font-semibold text-[#f5f5f5]">Indian Kanoon · Level 3 input</h2>
            {query ? (
              <p className="mt-2 max-w-2xl truncate text-xs text-[#71717a]" title={query}>
                {query}
              </p>
            ) : null}
          </div>
          {statusLabel ? <StatusChip label={statusLabel} active={hasLive} /> : null}
        </div>
        {pipelineSignals && !isLoading ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pipelineSignals.templateOrchestration ? (
              <MicroChip>template orchestration active</MicroChip>
            ) : null}
            {pipelineSignals.knowledgeFallbackActive ? (
              <MicroChip>knowledge fallback active</MicroChip>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-h-[100px] space-y-0 divide-y divide-[rgba(255,255,255,0.06)] p-1">
        {isLoading ? <ResearchLoadingSkeleton /> : null}

        {!isLoading && warning && !error ? <CalmNotice>{warning}</CalmNotice> : null}

        {!isLoading && error ? (
          <CalmNotice>
            Live retrieval unavailable. Level 3 continues with firm knowledge and template orchestration.
          </CalmNotice>
        ) : null}

        {!isLoading && hasLive
          ? cases.map((item, index) => (
              <ResearchCard
                key={item.doc_id || item.url || item.title}
                item={item}
                index={index}
              />
            ))
          : null}

        {!isLoading && !hasLive && !error ? (
          <p className="px-4 py-6 text-sm leading-6 text-[#71717a]">
            No live precedents retrieved for this query. Level 3 used firm knowledge and template
            intelligence. This does not indicate a pipeline failure.
          </p>
        ) : null}
      </div>
    </motion.section>
  );
}

export default memo(IKResearchPanel);

function StatusChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="metric-mono inline-flex items-center gap-2 rounded border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px] uppercase tracking-wider text-[#a1a1aa]">
      <span
        className={`h-1 w-1 rounded-full ${active ? 'bg-[#f5f5f5]' : 'bg-[#71717a]'}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

function MicroChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#71717a]">
      {children}
    </span>
  );
}

function CalmNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-3 my-3 rounded-lg border border-[rgba(255,255,255,0.06)] px-3 py-2.5 text-sm leading-6 text-[#a1a1aa]">
      {children}
    </p>
  );
}

function ResearchLoadingSkeleton() {
  return (
    <div className="space-y-0 p-3" aria-busy="true" aria-label="Loading precedents">
      <p className="mb-4 px-1 text-xs text-[#71717a] skeleton-pulse">Querying Indian Kanoon…</p>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="mb-2 h-[72px] rounded-lg border border-[rgba(255,255,255,0.06)] shimmer"
        />
      ))}
    </div>
  );
}

const ResearchCard = memo(function ResearchCard({
  item,
  index,
}: {
  item: IKCaseView;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const summary = item.snippet || item.headline || 'No excerpt available.';
  const court = item.court?.trim();
  const year = extractYear(item.date);

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04, duration: 0.35, ease: EASE_PREMIUM }}
      className="group px-4 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="metric-mono text-[10px] text-[#71717a]">
            {String(index + 1).padStart(2, '0')}
          </span>
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm font-medium leading-snug text-[#f5f5f5] underline decoration-[rgba(255,255,255,0.2)] underline-offset-2 transition hover:decoration-[rgba(255,255,255,0.45)]"
            >
              {item.title}
            </a>
          ) : (
            <h3 className="mt-1 text-sm font-medium text-[#f5f5f5]">{item.title}</h3>
          )}
          {(court || year) ? (
            <p className="mt-2 text-xs text-[#71717a]">
              {[court, year].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="focus-ring shrink-0 rounded border border-[rgba(255,255,255,0.08)] px-2 py-1 text-[10px] uppercase tracking-wider text-[#71717a] transition hover:bg-[rgba(255,255,255,0.03)] hover:text-[#a1a1aa]"
        >
          {open ? 'Hide' : 'Excerpt'}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: EASE_PREMIUM }}
            className="overflow-hidden"
          >
            <p className="mt-3 border-t border-[rgba(255,255,255,0.06)] pt-3 text-sm leading-7 text-[#a1a1aa]">
              {summary}
            </p>
          </motion.div>
        ) : (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#71717a]">{summary}</p>
        )}
      </AnimatePresence>
    </motion.article>
  );
});

function extractYear(date?: string): string {
  if (!date) return '';
  const match = date.match(/\b(19|20)\d{2}\b/);
  return match?.[0] ?? '';
}
