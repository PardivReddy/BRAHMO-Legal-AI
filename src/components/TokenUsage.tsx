'use client';

interface TokenUsageProps {
  usage: {
    totalTokens: number;
    estimatedCost: number;
    breakdown: Record<string, number>;
  };
}

const COLORS = [
  'bg-amber-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-rose-500',
];

export default function TokenUsage({ usage }: TokenUsageProps) {
  const breakdownEntries = Object.entries(usage.breakdown);
  const maxTokens = Math.max(...breakdownEntries.map(([, v]) => v), 1);

  return (
    <div className="glass rounded-xl border border-slate-700/50 bg-slate-900/80 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-3.5 h-3.5 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5"
          />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Token Usage
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-baseline gap-4 mb-3">
        <div>
          <span className="text-lg font-bold text-zinc-100 tabular-nums">
            {usage.totalTokens.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500 ml-1">tokens</span>
        </div>
        <div className="text-xs text-zinc-500">
          ~$
          <span className="text-zinc-300 font-medium tabular-nums">
            {usage.estimatedCost.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="space-y-1.5">
        {breakdownEntries.map(([model, tokens], idx) => (
          <div key={model} className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 w-20 truncate font-mono">
              {model}
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
              <div
                className={`h-full rounded-full ${COLORS[idx % COLORS.length]} transition-all duration-700`}
                style={{ width: `${(tokens / maxTokens) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-500 tabular-nums w-12 text-right">
              {tokens.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
