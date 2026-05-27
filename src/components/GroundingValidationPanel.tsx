'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, fadeUpTransition } from '@/lib/motion';

interface GroundingValidationPanelProps {
  precedentCount: number;
  knowledgeNodeCount: number;
  selectedTemplate?: string | null;
  templateOrchestration: boolean;
  normalizationCount: number | null;
  providerUsed?: string | null;
  liveRetrieval?: 'live' | 'cached' | 'empty' | 'failed';
  authorityNames?: string[];
  knowledgeAuthorities?: string[];
}

function GroundingValidationPanel({
  precedentCount,
  knowledgeNodeCount,
  selectedTemplate,
  templateOrchestration,
  normalizationCount,
  providerUsed,
  liveRetrieval,
  authorityNames,
  knowledgeAuthorities,
}: GroundingValidationPanelProps) {
  const items = [
    {
      label:
        precedentCount > 0
          ? `${precedentCount} Indian Kanoon authorities injected`
          : liveRetrieval === 'failed'
          ? 'Live retrieval failed — fallback orchestration used'
          : 'No live precedents retrieved',
      active: precedentCount > 0,
    },
    {
      label:
        knowledgeNodeCount > 0
          ? `${knowledgeNodeCount} institutional knowledge nodes applied`
          : 'No knowledge nodes injected',
      active: knowledgeNodeCount > 0,
    },
    {
      label: templateOrchestration
        ? `${selectedTemplate ?? 'Selected'} template applied`
        : 'No template orchestration selected',
      active: templateOrchestration,
    },
    {
      label:
        normalizationCount !== null
          ? normalizationCount > 0
            ? 'BNS/BNSS normalization verified'
            : 'Section normalization completed with no references'
          : 'Section normalization pending',
      active: normalizationCount !== null && normalizationCount > 0,
    },
    {
      label: providerUsed ? `${providerUsed} provider used for Level 3` : 'Provider metadata unavailable',
      active: Boolean(providerUsed),
    },
  ];

  const hasDetails = (authorityNames?.length ?? 0) > 0 || (knowledgeAuthorities?.length ?? 0) > 0;

  return (
    <motion.section {...fadeUp} transition={fadeUpTransition} className="surface rounded-2xl">
      <div className="border-b border-[rgba(255,255,255,0.08)] px-5 py-5">
        <p className="section-label">Grounding validation</p>
        <h2 className="mt-1 text-base font-semibold text-[#f5f5f5]">Orchestration transparency · Level 3</h2>
      </div>

      <div className="space-y-3 px-5 py-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3">
            <span
              className={`mt-0.5 text-sm ${item.active ? 'text-emerald-400' : 'text-[#71717a]'}`}
              aria-hidden="true"
            >
              {item.active ? '✓' : '•'}
            </span>
            <p className={`text-sm leading-6 ${item.active ? 'text-[#e5e7eb]' : 'text-[#a1a1aa]'}`}>
              {item.label}
            </p>
          </div>
        ))}

        {hasDetails ? (
          <div className="mt-4 space-y-4 border-t border-[rgba(255,255,255,0.06)] pt-4">
            {authorityNames?.length ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#71717a]">
                  Authorities used
                </p>
                <ul className="space-y-2 text-sm leading-6 text-[#e5e7eb]">
                  {authorityNames.map((authority) => (
                    <li key={authority} className="flex gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{authority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {knowledgeAuthorities?.length ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wider text-[#71717a]">
                  Knowledge applied
                </p>
                <ul className="space-y-2 text-sm leading-6 text-[#e5e7eb]">
                  {knowledgeAuthorities.map((knowledge) => (
                    <li key={knowledge} className="flex gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{knowledge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </motion.section>
  );
}

export default memo(GroundingValidationPanel);
