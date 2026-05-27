'use client';

import { FormEvent, memo, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import IKResearchPanel from '@/components/IKResearchPanel';
import IntegrationStatusPanel from '@/components/IntegrationStatusPanel';
import KnowledgePanel from '@/components/KnowledgePanel';
import PremiumHero from '@/components/PremiumHero';
import PremiumQueryInput from '@/components/PremiumQueryInput';
import ThreeLevelComparison, { type DraftLevel } from '@/components/ThreeLevelComparison';
import { fadeUp, fadeUpTransition } from '@/lib/motion';
import type {
  ClassificationResult,
  GenerateResponse,
  IntegrationStatus,
  TemplateResult,
} from '@/types/generation';

const SAMPLE_QUERY =
  'Draft an anticipatory bail application under Section 438 CrPC for a director accused in an economic offence, where arrest is apprehended but documents are already seized.';

const DEMO_PRESETS = [
  {
    label: 'Criminal · Anticipatory bail',
    query: SAMPLE_QUERY,
  },
  {
    label: 'Corporate · NDA review',
    query:
      'Review and tighten a mutual NDA for a SaaS vendor: limit confidentiality term, define permitted disclosures, and add IP carve-outs.',
  },
  {
    label: 'Corporate · Board resolution',
    query:
      'Draft a board resolution under the Companies Act approving investment in a wholly owned subsidiary and authorising a director to execute transaction documents.',
  },
  {
    label: 'Corporate · Arbitration clause',
    query:
      'Draft an arbitration clause for a shareholders agreement with seat in Mumbai, SIAC rules, and interim relief from courts.',
  },
] as const;

export default function Home() {
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const response = await fetch('/api/integration-status');
        const payload = (await response.json()) as IntegrationStatus;
        if (!cancelled) {
          setStatus(payload);
        }
      } catch {
        if (!cancelled) {
          setStatus(null);
        }
      } finally {
        if (!cancelled) {
          setIsStatusLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const levels = useMemo<[DraftLevel, DraftLevel, DraftLevel]>(() => {
    return [
      {
        title: 'Generic',
        subtitle: 'Query-only drafting without firm or precedent context.',
        output: result?.outputs.level1 ?? '',
        intelligence: result?.intelligence.level1,
        tokenUsage: result?.tokenUsage.level1,
      },
      {
        title: 'Template',
        subtitle: 'Structured document skeleton matched to practice area and court.',
        output: result?.outputs.level2 ?? '',
        intelligence: result?.intelligence.level2,
        tokenUsage: result?.tokenUsage.level2,
      },
      {
        title: 'Knowledge + Precedent',
        subtitle: 'Template, ranked firm knowledge, and live Indian Kanoon authorities.',
        output: result?.outputs.level3 ?? '',
        intelligence: result?.intelligence.level3,
        tokenUsage: result?.tokenUsage.level3,
        emphasis: 'strong',
        liveAuthorities: result?.intelligence.liveAuthorities,
        knowledgeAuthorities: result?.intelligence.knowledgeAuthorities,
        trustSignals: result?.pipelineSignals,
      },
    ];
  }, [result]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmed }),
      });

      const payload = (await response.json()) as GenerateResponse | { details?: string; error?: string };

      if (!response.ok) {
        throw new Error('details' in payload ? payload.details ?? payload.error : 'Generation failed.');
      }

      setResult(payload as GenerateResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Generation failed.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="premium-bg min-h-screen text-[#f5f5f5]">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <PremiumHero status={status} />

        <section className="grid gap-5 xl:grid-cols-[1.12fr_0.88fr]">
          <PremiumQueryInput
            query={query}
            isLoading={isLoading}
            error={error}
            demoPresets={[...DEMO_PRESETS]}
            onQueryChange={setQuery}
            onSubmit={handleGenerate}
          />
          <IntegrationStatusPanel
            status={status}
            isLoading={isStatusLoading}
            providerUsed={result?.providerUsed ?? null}
            providerFallback={result?.providerFallback ?? false}
          />
        </section>

        {(isLoading || result) && (
          <IKResearchPanel
            cases={result?.knowledge.ikResearch?.results ?? []}
            error={result?.knowledge.ikResearch?.error}
            warning={result?.knowledge.ikResearch?.warning}
            query={result?.knowledge.ikResearch?.query}
            fromCache={result?.knowledge.ikResearch?.fromCache}
            isLoading={isLoading}
            pipelineSignals={result?.pipelineSignals}
          />
        )}

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-8"
            >
              <section className="grid gap-5 lg:grid-cols-2">
                <ClassificationCard classification={result.classification} />
                <TemplateCard template={result.template} totalTokens={result.tokenUsage.total.total} />
              </section>

              <ThreeLevelComparison levels={levels} />

              <KnowledgePanel
                nodes={result.knowledge.nodes ?? []}
                error={result.knowledge.error}
                tokenUsage={result.knowledge.token_usage ?? null}
              />
            </motion.div>
          ) : !isLoading ? (
            <EmptyState key="empty" levels={levels} />
          ) : null}
        </AnimatePresence>
      </div>
    </main>
  );
}

const ClassificationCard = memo(function ClassificationCard({
  classification,
}: {
  classification: ClassificationResult;
}) {
  const confidence = Math.round(classification.confidence * 100);

  return (
    <motion.section {...fadeUp} transition={fadeUpTransition} className="surface rounded-2xl p-5">
      <p className="section-label">Classification</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <InfoMetric label="Practice" value={classification.practice_area} />
        <InfoMetric label="Document" value={classification.document_type} />
        <InfoMetric label="Court" value={classification.court_type} />
      </div>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-[#71717a]">
          <span>Confidence</span>
          <span className="metric-mono text-[#a1a1aa]">{confidence}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <motion.div
            className="h-full rounded-full bg-[#a1a1aa]"
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {classification.matched_keywords.length ? (
          classification.matched_keywords.map((keyword) => (
            <span
              key={keyword}
              className="rounded border border-[rgba(255,255,255,0.06)] px-2 py-0.5 text-xs text-[#71717a]"
            >
              {keyword}
            </span>
          ))
        ) : (
          <span className="text-sm text-[#71717a]">Generic classification</span>
        )}
      </div>
    </motion.section>
  );
});

const TemplateCard = memo(function TemplateCard({
  template,
  totalTokens,
}: {
  template: TemplateResult;
  totalTokens: number;
}) {
  const hasTemplate = Boolean(template.id);

  return (
    <motion.section
      {...fadeUp}
      transition={{ ...fadeUpTransition, delay: 0.05 }}
      className="surface rounded-2xl p-5"
    >
      <p className="section-label">Template</p>
      <h2 className="mt-2 text-base font-semibold text-[#f5f5f5]">
        {hasTemplate ? template.title : 'No template match'}
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#71717a]">
        {hasTemplate
          ? template.description || 'Matched by practice area and document type.'
          : 'Fallback structure applied. Seed templates improve Levels 2 and 3.'}
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <InfoMetric label="Version" value={String(template.version ?? '—')} />
        <InfoMetric label="Court" value={template.court_type ?? '—'} />
        <InfoMetric label="Pipeline Σ" value={totalTokens.toLocaleString()} />
      </div>
    </motion.section>
  );
});

function InfoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-inset rounded-lg px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-[#71717a]">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-[#f5f5f5]">{value}</div>
    </div>
  );
}

function PipelineLoading() {
  return (
    <motion.section
      {...fadeUp}
      exit={{ opacity: 0 }}
      className="surface rounded-2xl p-5"
      aria-busy="true"
      aria-label="Generation in progress"
    >
      <p className="text-sm font-medium text-[#f5f5f5]">Pipeline running</p>
      <p className="mt-1 text-xs text-[#71717a] skeleton-pulse">
        Classify → template → knowledge → Indian Kanoon → draft (L1/L2/L3)
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-28 rounded-xl border border-[rgba(255,255,255,0.06)] shimmer"
          />
        ))}
      </div>
    </motion.section>
  );
}

function EmptyState({ levels }: { levels: [DraftLevel, DraftLevel, DraftLevel] }) {
  return (
    <motion.section
      {...fadeUp}
      exit={{ opacity: 0 }}
      className="flex flex-col gap-8"
    >
      <div className="surface rounded-2xl px-6 py-8">
        <p className="section-label">Workspace</p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight text-[#f5f5f5]">
          Pipeline idle
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[#71717a]">
          Submit a matter instruction to run classification, template matching, knowledge injection, and Level 3 precedent retrieval. Metrics are computed from pipeline metadata.
        </p>
      </div>
      <ThreeLevelComparison levels={levels} />
    </motion.section>
  );
}
