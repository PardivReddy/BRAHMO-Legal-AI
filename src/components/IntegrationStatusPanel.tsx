'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, fadeUpTransition } from '@/lib/motion';
import type { IntegrationStatus } from '@/types/generation';

interface IntegrationStatusPanelProps {
  status: IntegrationStatus | null;
  isLoading: boolean;
  providerUsed?: string | null;
  providerFallback?: boolean;
}

function IntegrationStatusPanel({ status, isLoading, providerUsed, providerFallback }: IntegrationStatusPanelProps) {
  const providerStatusItems = status?.gemini.providers
    ? (Object.entries(status.gemini.providers) as [string, boolean][])
        .filter(([name]) => ['gemini', 'openai', 'groq'].includes(name))
        .map(([provider, ok]) => ({
          label: provider.charAt(0).toUpperCase() + provider.slice(1),
          ok,
          meta: ok ? 'available' : 'unavailable',
        }))
    : [];

  const providerBadge = providerUsed
    ? `${providerUsed}${providerFallback ? ' (Fallback)' : ''}`
    : null;

  return (
    <motion.section {...fadeUp} transition={{ ...fadeUpTransition, delay: 0.1 }} className="surface rounded-2xl p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="section-label">Infrastructure</p>
          <h2 className="mt-1 text-base font-medium text-[#f5f5f5]">Runtime telemetry</h2>
        </div>
        <span className="metric-mono rounded border border-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[10px] text-[#71717a]">
          env
        </span>
      </div>

      {providerBadge ? (
        <div className="mb-4 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#050505]/80 px-3 py-2 text-sm text-[#f5f5f5]">
          <span className="font-medium">Provider used:</span> {providerBadge}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-9 rounded-md bg-[rgba(255,255,255,0.04)] shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          <StatusGroup
            title="Environment"
            items={(status?.env ?? []).map((item) => ({
              label: item.name,
              ok: item.configured,
              meta: item.fallback ? item.fallback : item.required ? 'required' : 'opt',
            }))}
          />
          {providerStatusItems.length ? (
            <StatusGroup title="Providers" items={providerStatusItems} />
          ) : null}
          <StatusGroup
            title="Data plane"
            items={(status?.supabase.tables ?? []).map((item) => ({
              label: item.table,
              ok: item.ok,
              meta: item.ok ? `${item.count ?? 0}` : '—',
            }))}
          />
        </div>
      )}
    </motion.section>
  );
}

export default memo(IntegrationStatusPanel);

function StatusGroup({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; ok: boolean; meta: string }>;
}) {
  return (
    <div className="surface-inset rounded-lg p-3">
      <div className="mb-2 section-label">{title}</div>
      <div className="space-y-1">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.ok ? 'bg-[#f5f5f5]' : 'bg-[#71717a]'}`}
                  aria-hidden
                />
                <span className="truncate text-xs text-[#a1a1aa]">{item.label}</span>
              </div>
              <span className="metric-mono shrink-0 text-[10px] text-[#71717a]">{item.meta}</span>
            </div>
          ))
        ) : (
          <p className="px-2 py-1.5 text-xs text-[#71717a]">Status unavailable</p>
        )}
      </div>
    </div>
  );
}
