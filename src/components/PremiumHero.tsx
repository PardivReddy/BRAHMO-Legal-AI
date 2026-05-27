'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import ParticlesBackground from '@/components/ParticlesBackground';
import { EASE_PREMIUM, fadeUp, fadeUpTransition } from '@/lib/motion';
import type { IntegrationStatus } from '@/types/generation';

interface PremiumHeroProps {
  status: IntegrationStatus | null;
}

function PremiumHero({ status }: PremiumHeroProps) {
  const ready = status
    ? status.gemini.configured && status.supabase.tables.every((table) => table.ok)
    : false;

  return (
    <header className="relative overflow-hidden surface rounded-2xl px-6 py-8 sm:px-8 lg:px-10">
      <ParticlesBackground className="pointer-events-none opacity-30" />
      <div className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_24%)] opacity-40 pointer-events-none" />
      <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <motion.div {...fadeUp} transition={fadeUpTransition}>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <StatusIndicator ready={ready} label={ready ? 'Systems ready' : 'Checking services'} />
            <MetaChip>Gemini</MetaChip>
            <MetaChip>Supabase</MetaChip>
          </div>

          <p className="section-label">BRAHMO Legal AI</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.035em] text-[#f5f5f5] sm:text-5xl lg:text-[3.2rem] lg:leading-[1.02]">
            Legal drafting pipeline
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[#a1a1aa] sm:text-[17px]">
            Run one instruction through three orchestration depths. Metrics and authorities are derived from pipeline metadata.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45, ease: EASE_PREMIUM }}
          className="surface-secondary rounded-xl p-4"
        >
          <p className="section-label mb-3">Pipeline depth</p>
          <div className="grid grid-cols-3 gap-2">
            <LadderStep index="01" title="Generic" active={false} />
            <LadderStep index="02" title="Template" active={false} />
            <LadderStep index="03" title="Knowledge" active />
          </div>
          <div className="mt-4 border-t border-[rgba(255,255,255,0.08)] pt-4">
            <div className="mb-2 flex justify-between text-xs text-[#71717a]">
              <span>Context enrichment</span>
              <span className="metric-mono text-[#a1a1aa]">L3</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <motion.div
                className="h-full rounded-full bg-[#f5f5f5]"
                initial={{ width: '12%' }}
                animate={{ width: '100%' }}
                transition={{ delay: 0.3, duration: 1.1, ease: EASE_PREMIUM }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}

export default memo(PremiumHero);

function StatusIndicator({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-2.5 py-1 text-xs font-medium text-[#a1a1aa]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-[#f5f5f5]' : 'bg-[#71717a] skeleton-pulse'}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-[rgba(255,255,255,0.08)] px-2.5 py-1 text-xs text-[#71717a]">
      {children}
    </span>
  );
}

function LadderStep({ index, title, active }: { index: string; title: string; active: boolean }) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 transition-colors duration-200 ${
        active
          ? 'border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] text-[#f5f5f5]'
          : 'border-[rgba(255,255,255,0.06)] bg-transparent text-[#71717a]'
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest opacity-60">{index}</div>
      <div className="mt-1.5 text-sm font-medium">{title}</div>
    </div>
  );
}
