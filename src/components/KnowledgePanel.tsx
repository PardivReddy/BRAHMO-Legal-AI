'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { EASE_PREMIUM, fadeUp, fadeUpTransition } from '@/lib/motion';

export interface KnowledgeNodeView {
  node: {
    id: string;
    category: string;
    title: string;
    content: string;
    priority?: number;
    token_estimate?: number;
  };
  relevance_score: number;
  matched_tags?: string[];
}

interface KnowledgePanelProps {
  nodes: KnowledgeNodeView[];
  error?: string;
  tokenUsage?: {
    used: number;
    budget: number;
  } | null;
}

const CATEGORY_TONE: Record<string, string> = {
  CONSTRAINT: 'text-[#f5f5f5]',
  ANTI_PATTERN: 'text-[#a1a1aa]',
  DECISION: 'text-[#f5f5f5]',
  CLIENT_FACT: 'text-[#a1a1aa]',
};

function KnowledgePanel({ nodes, error, tokenUsage }: KnowledgePanelProps) {
  const used = tokenUsage?.used ?? 0;
  const budget = tokenUsage?.budget ?? 0;
  const tokenPercent = budget > 0 ? Math.min((used / budget) * 100, 100) : 0;

  return (
    <motion.section {...fadeUp} transition={fadeUpTransition} className="surface rounded-2xl">
      <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-label">Knowledge graph</p>
            <h2 className="mt-1 text-base font-semibold text-[#f5f5f5]">Firm context · Level 3</h2>
          </div>
          <div className="min-w-48">
            <div className="mb-1.5 flex justify-between text-[10px] uppercase tracking-wider text-[#71717a]">
              <span>Token budget</span>
              <span className="metric-mono normal-case tracking-normal text-[#a1a1aa]">
                {used.toLocaleString()} / {budget.toLocaleString()}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <motion.div
                className="h-full rounded-full bg-[#a1a1aa]"
                initial={{ width: 0 }}
                animate={{ width: `${tokenPercent}%` }}
                transition={{ duration: 0.7, ease: EASE_PREMIUM }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="premium-scrollbar max-h-[480px] space-y-0 divide-y divide-[rgba(255,255,255,0.06)] overflow-auto">
        {error ? (
          <p className="px-5 py-4 text-sm text-[#a1a1aa]">Knowledge unavailable: {error}</p>
        ) : null}
        {nodes.length ? (
          nodes.map((item, index) => (
            <KnowledgeNodeCard key={item.node.id} item={item} index={index} />
          ))
        ) : (
          <p className="px-5 py-8 text-sm text-[#71717a]">No knowledge nodes injected for this query.</p>
        )}
      </div>
    </motion.section>
  );
}

export default memo(KnowledgePanel);

const KnowledgeNodeCard = memo(function KnowledgeNodeCard({
  item,
  index,
}: {
  item: KnowledgeNodeView;
  index: number;
}) {
  const category = item.node.category.toUpperCase();
  const tone = CATEGORY_TONE[category] ?? 'text-[#a1a1aa]';

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
      className="px-5 py-4 transition-colors hover:bg-[rgba(255,255,255,0.03)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={`text-[10px] font-medium uppercase tracking-widest ${tone}`}>
            {category}
          </span>
          <h3 className="mt-1.5 text-sm font-medium text-[#f5f5f5]">{item.node.title}</h3>
        </div>
        <div className="flex gap-3">
          <Metric label="Rel" value={item.relevance_score.toFixed(0)} />
          <Metric label="Tok" value={String(item.node.token_estimate ?? 0)} />
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-[#a1a1aa]">{item.node.content}</p>
      {item.matched_tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {item.matched_tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-[rgba(255,255,255,0.06)] px-1.5 py-0.5 text-[10px] text-[#71717a]"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
    </motion.article>
  );
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-wider text-[#71717a]">{label}</div>
      <div className="metric-mono text-xs text-[#a1a1aa]">{value}</div>
    </div>
  );
}
