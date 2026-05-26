'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface QueryInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export default function QueryInput({ onSubmit, isLoading }: QueryInputProps) {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxChars = 2000;

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSubmit(trimmed);
    }
  }, [query, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [query]);

  const charPercent = Math.min((query.length / maxChars) * 100, 100);
  const isOverLimit = query.length > maxChars;

  return (
    <div className="relative group">
      {/* Ambient glow behind the card */}
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-blue-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-sm" />

      <div className="relative glass rounded-2xl border border-slate-700/50 bg-slate-900/80 p-6 transition-all duration-300 group-focus-within:border-amber-500/40 group-focus-within:glow-amber">
        {/* Label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400/80">
            Legal Query
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe your legal matter... e.g., Draft anticipatory bail application for economic offenses"
          disabled={isLoading}
          rows={3}
          className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 text-base leading-relaxed resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-sans"
        />

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/30">
          {/* Char count & hint */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOverLimit
                      ? 'bg-red-500'
                      : charPercent > 80
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${charPercent}%` }}
                />
              </div>
              <span
                className={`text-xs tabular-nums ${
                  isOverLimit ? 'text-red-400' : 'text-zinc-500'
                }`}
              >
                {query.length}/{maxChars}
              </span>
            </div>
            <span className="hidden sm:inline text-xs text-zinc-600">
              Ctrl+Enter to submit
            </span>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim() || isOverLimit}
            className="relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.97]"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span>Generating…</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.27 3.13a.75.75 0 011.012-.855L21 12l-16.718 9.725a.75.75 0 01-1.012-.855L6 12zm0 0h7.5"
                  />
                </svg>
                <span>Analyze & Draft</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
