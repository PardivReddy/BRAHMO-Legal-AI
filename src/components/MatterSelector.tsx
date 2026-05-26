'use client';

import { useState, useMemo } from 'react';
import { PRACTICE_AREAS, type PracticeArea } from '@/types/legal';

interface MatterSelectorProps {
  onSelect: (selection: {
    practice_area: string;
    document_type: string;
    court_type: string;
  }) => void;
}

const PRACTICE_AREA_ICONS: Record<PracticeArea, string> = {
  criminal: '⚖️',
  corporate: '🏢',
  civil: '📜',
  family: '👨‍👩‍👧',
  tax: '💰',
  labour: '🔧',
  constitutional: '🏛️',
  generic: '📋',
};

const DOCUMENT_TYPES: Record<string, string[]> = {
  criminal: [
    'Anticipatory Bail Application',
    'Regular Bail Application',
    'FIR Quashing Petition',
    'Criminal Revision',
    'Discharge Application',
    'Complaint under CrPC',
  ],
  corporate: [
    'Board Resolution',
    'Shareholders Agreement',
    'MoU / Term Sheet',
    'Due Diligence Report',
    'NCLT Application',
    'Legal Opinion',
  ],
  civil: [
    'Civil Suit',
    'Written Statement',
    'Injunction Application',
    'Execution Petition',
    'Appeal Memo',
  ],
  family: [
    'Divorce Petition',
    'Maintenance Application',
    'Custody Petition',
    'Domestic Violence Complaint',
  ],
  tax: [
    'Appeal before CIT(A)',
    'Writ Petition – Tax',
    'GST Refund Application',
    'Advance Ruling Application',
  ],
  labour: [
    'Industrial Dispute Petition',
    'Workmen Compensation Claim',
    'Unfair Labour Practice Complaint',
  ],
  constitutional: [
    'Writ Petition – Article 32',
    'Writ Petition – Article 226',
    'PIL Petition',
    'SLP Petition',
  ],
  generic: ['Legal Notice', 'Legal Opinion', 'Affidavit', 'Memo of Appearance'],
};

const COURT_TYPES = [
  'Supreme Court of India',
  'High Court',
  'District Court',
  'Sessions Court',
  'NCLT',
  'Consumer Forum',
  'Tribunal',
  'Other',
];

export default function MatterSelector({ onSelect }: MatterSelectorProps) {
  const [practiceArea, setPracticeArea] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [courtType, setCourtType] = useState<string>('');

  const filteredDocTypes = useMemo(() => {
    if (!practiceArea) return [];
    return DOCUMENT_TYPES[practiceArea] ?? DOCUMENT_TYPES.generic;
  }, [practiceArea]);

  const handlePracticeAreaChange = (area: string) => {
    setPracticeArea(area);
    setDocumentType('');
    if (area && courtType) {
      onSelect({ practice_area: area, document_type: '', court_type: courtType });
    }
  };

  const handleDocTypeChange = (dt: string) => {
    setDocumentType(dt);
    if (practiceArea) {
      onSelect({
        practice_area: practiceArea,
        document_type: dt,
        court_type: courtType,
      });
    }
  };

  const handleCourtTypeChange = (ct: string) => {
    setCourtType(ct);
    if (practiceArea) {
      onSelect({
        practice_area: practiceArea,
        document_type: documentType,
        court_type: ct,
      });
    }
  };

  const selectStyles =
    'w-full appearance-none bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 cursor-pointer hover:border-slate-600/70 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="glass rounded-2xl border border-slate-700/50 bg-slate-900/80 p-5">
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-4 h-4 text-amber-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Matter Configuration
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Practice Area */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 font-medium pl-1">
            Practice Area
          </label>
          <div className="relative">
            <select
              value={practiceArea}
              onChange={(e) => handlePracticeAreaChange(e.target.value)}
              className={selectStyles}
            >
              <option value="" className="bg-slate-800">
                Select area…
              </option>
              {(Object.keys(PRACTICE_AREAS) as PracticeArea[]).map((key) => (
                <option key={key} value={key} className="bg-slate-800">
                  {PRACTICE_AREA_ICONS[key]} {PRACTICE_AREAS[key].label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          </div>
          {practiceArea && (
            <p className="text-[11px] text-zinc-600 pl-1">
              {PRACTICE_AREAS[practiceArea as PracticeArea]?.description}
            </p>
          )}
        </div>

        {/* Document Type */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 font-medium pl-1">
            Document Type
          </label>
          <div className="relative">
            <select
              value={documentType}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              disabled={!practiceArea}
              className={selectStyles}
            >
              <option value="" className="bg-slate-800">
                {practiceArea ? 'Select type…' : 'Choose area first'}
              </option>
              {filteredDocTypes.map((dt) => (
                <option key={dt} value={dt} className="bg-slate-800">
                  {dt}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Court Type */}
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-500 font-medium pl-1">
            Court / Forum
          </label>
          <div className="relative">
            <select
              value={courtType}
              onChange={(e) => handleCourtTypeChange(e.target.value)}
              className={selectStyles}
            >
              <option value="" className="bg-slate-800">
                Select court…
              </option>
              {COURT_TYPES.map((ct) => (
                <option key={ct} value={ct} className="bg-slate-800">
                  {ct}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
              <svg
                className="w-4 h-4 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Active selection badges */}
      {practiceArea && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-700/30">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
            {PRACTICE_AREA_ICONS[practiceArea as PracticeArea]}{' '}
            {PRACTICE_AREAS[practiceArea as PracticeArea]?.label}
          </span>
          {documentType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
              📄 {documentType}
            </span>
          )}
          {courtType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
              🏛️ {courtType}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
