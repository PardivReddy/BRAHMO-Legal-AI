'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { IntelligenceScore } from '@/lib/intelligence-score';
import { staggerContainer, staggerItem } from '@/lib/motion';
import type { DraftTokenUsage, PipelineTrustSignals } from '@/types/generation';

export type { DraftTokenUsage };

export interface DraftLevel {
  title: string;
  subtitle: string;
  output: string;
  intelligence?: IntelligenceScore;
  tokenUsage?: DraftTokenUsage;
  emphasis?: 'standard' | 'strong';
  liveAuthorities?: string[];
  knowledgeAuthorities?: string[];
  trustSignals?: PipelineTrustSignals;
}

interface ThreeLevelComparisonProps {
  levels: [DraftLevel, DraftLevel, DraftLevel];
}

function ThreeLevelComparison({ levels }: ThreeLevelComparisonProps) {
  return (
    <section className="space-y-6">
      <div className="sticky top-0 z-10 -mx-1 border-b border-[rgba(255,255,255,0.08)] bg-[#050505]/90 px-1 py-4 backdrop-blur-md sm:flex sm:items-end sm:justify-between sm:gap-8">
        <div>
          <p className="section-label">Draft comparison</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#f5f5f5]">
            Three pipeline depths
          </h2>
        </div>
        <p className="mt-2 max-w-md text-sm leading-6 text-[#71717a] sm:mt-0">
          Index scores are computed from pipeline metadata. Live and knowledge authorities are listed separately.
        </p>
      </div>

      <motion.div
        className="grid gap-5 xl:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={staggerContainer}
      >
        {levels.map((level, index) => (
          <DraftCard key={level.title} level={level} index={index} />
        ))}
      </motion.div>
    </section>
  );
}

export default memo(ThreeLevelComparison);

const DraftCard = memo(function DraftCard({ level, index }: { level: DraftLevel; index: number }) {
  const isStrong = level.emphasis === 'strong';

  return (
    <motion.article
      variants={staggerItem}
      layout="position"
      className={`flex min-h-[600px] flex-col overflow-hidden rounded-2xl border transition-colors duration-200 ${
        isStrong
          ? 'border-[rgba(255,255,255,0.14)] bg-[#111214] shadow-[0_8px_40px_rgba(0,0,0,0.45)] xl:-mt-2 xl:min-h-[660px]'
          : 'border-[rgba(255,255,255,0.08)] bg-[#0b0b0c]'
      }`}
    >
      <div
        className={`border-b px-5 py-5 ${
          isStrong ? 'border-[rgba(255,255,255,0.1)]' : 'border-[rgba(255,255,255,0.08)]'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2">
              <span className="metric-mono text-[10px] uppercase tracking-widest text-[#71717a]">
                L{index + 1}
              </span>
              {isStrong ? (
                <span className="rounded border border-[rgba(255,255,255,0.1)] px-1.5 py-0.5 text-[10px] text-[#a1a1aa]">
                  Full context
                </span>
              ) : null}
            </div>
            <h3 className="text-base font-semibold text-[#f5f5f5]">{level.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-[#71717a]">{level.subtitle}</p>
          </div>
          <IntelligenceSummary score={level.intelligence} emphasized={isStrong} />
        </div>
        {isStrong && level.trustSignals ? (
          <TrustSignalsRow signals={level.trustSignals} className="mt-4" />
        ) : null}
      </div>

      <div className="border-b border-[rgba(255,255,255,0.06)] px-5 py-3">
        <IntelligenceTelemetry score={level.intelligence} />
        <TokenStrip usage={level.tokenUsage} />
      </div>

      {isStrong ? (
        <div className="min-h-[140px] border-b border-[rgba(255,255,255,0.06)] px-5 py-3">
          <AuthoritySections
            live={level.liveAuthorities ?? []}
            knowledge={level.knowledgeAuthorities ?? []}
            signals={level.trustSignals}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
        <p className="mb-2 section-label">Output</p>
        <div
          className={`premium-scrollbar legal-draft min-h-[320px] flex-1 overflow-auto rounded-lg border p-4 leading-[1.8] ${
            isStrong
              ? 'border-[rgba(255,255,255,0.1)] bg-[#050505]'
              : 'border-[rgba(255,255,255,0.06)] bg-[#050505]/80'
          }`}
        >
          {level.output || (
            <span className="text-[#71717a]">Run generation to populate this level.</span>
          )}
        </div>
      </div>
    </motion.article>
  );
});

function TrustSignalsRow({
  signals,
  className = '',
}: {
  signals: PipelineTrustSignals;
  className?: string;
}) {
  const chips: string[] = [];

  if (signals.templateOrchestration) chips.push('template orchestration active');
  if (signals.liveRetrieval === 'live') chips.push('retrieval grounded');
  if (signals.liveRetrieval === 'cached') chips.push('cached precedent results');
  if (signals.liveRetrieval === 'empty') chips.push('no live precedents');
  if (signals.liveRetrieval === 'failed') chips.push('live retrieval unavailable');
  if (signals.knowledgeFallbackActive) chips.push('knowledge fallback active');
  if (signals.knowledgeInjected && !signals.knowledgeFallbackActive) chips.push('knowledge injected');

  if (!chips.length) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded border border-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[#71717a]"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function AuthoritySections({
  live,
  knowledge,
  signals,
}: {
  live: string[];
  knowledge: string[];
  signals?: PipelineTrustSignals;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="section-label mb-1.5">Live authorities</p>
        <p className="mb-2 text-[10px] text-[#71717a]">Source: Indian Kanoon retrieval only</p>
        {live.length > 0 ? (
          <AuthorityList items={live} />
        ) : (
          <p className="text-xs leading-5 text-[#71717a]">
            {signals?.liveRetrieval === 'failed'
              ? 'Live retrieval unavailable for this run.'
              : 'No live precedents retrieved for this query.'}
          </p>
        )}
      </div>
      <div className="border-t border-[rgba(255,255,255,0.06)] pt-3">
        <p className="section-label mb-1.5">Knowledge authorities</p>
        <p className="mb-2 text-[10px] text-[#71717a]">Source: firm knowledge graph / seeded principles</p>
        {knowledge.length > 0 ? (
          <AuthorityList items={knowledge} />
        ) : (
          <p className="text-xs leading-5 text-[#71717a]">
            No firm knowledge authorities injected for this query.
          </p>
        )}
      </div>
    </div>
  );
}

function AuthorityList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1">
      {items.map((authority) => (
        <li key={authority} className="text-xs leading-5 text-[#a1a1aa]">
          · {authority}
        </li>
      ))}
    </ul>
  );
}

function IntelligenceSummary({
  score,
  emphasized,
}: {
  score?: IntelligenceScore;
  emphasized?: boolean;
}) {
  const overall = score?.overall ?? 0;

  return (
    <div
      className={`shrink-0 rounded-lg border px-3 py-2 text-right ${
        emphasized
          ? 'border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)]'
          : 'border-[rgba(255,255,255,0.08)] bg-transparent'
      }`}
    >
      <div className="metric-mono text-xl font-semibold text-[#f5f5f5]">
        {overall > 0 ? overall : '—'}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-[#71717a]">Index</div>
    </div>
  );
}

function IntelligenceTelemetry({ score }: { score?: IntelligenceScore }) {
  if (!score) {
    return <p className="mb-2 text-xs text-[#71717a]">Metrics pending</p>;
  }

  const rows: Array<{ key: keyof IntelligenceScore; label: string }> = [
    { key: 'retrieval', label: 'Retrieval' },
    { key: 'structure', label: 'Structure' },
    { key: 'reasoning', label: 'Reasoning' },
    { key: 'grounding', label: 'Grounding' },
  ];

  return (
    <div className="mb-3 grid grid-cols-4 gap-1.5">
      {rows.map(({ key, label }) => (
        <div key={key} className="rounded border border-[rgba(255,255,255,0.06)] px-2 py-1.5">
          <div className="text-[9px] uppercase tracking-wider text-[#71717a]">{label}</div>
          <div className="metric-mono text-[11px] text-[#d4d4d8]">{score[key]}</div>
        </div>
      ))}
    </div>
  );
}

function TokenStrip({ usage }: { usage?: DraftTokenUsage }) {
  if (!usage) {
    return null;
  }

  return (
    <div className="grid grid-cols-3 gap-2 border-t border-[rgba(255,255,255,0.05)] pt-2">
      <TokenStat label="In" value={usage.input} />
      <TokenStat label="Out" value={usage.output} />
      <TokenStat label="Σ" value={usage.total} />
    </div>
  );
}

function TokenStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[rgba(255,255,255,0.05)] px-2 py-1">
      <div className="text-[9px] uppercase tracking-wider text-[#71717a]">{label}</div>
      <div className="metric-mono text-[10px] text-[#71717a]">{value.toLocaleString()}</div>
    </div>
  );
}
