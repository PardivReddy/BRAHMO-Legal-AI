'use client';

import { useEffect, useState } from 'react';

interface QualityScoreProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { svgSize: 64, strokeWidth: 4, fontSize: 'text-sm', labelSize: 'text-[10px]' },
  md: { svgSize: 96, strokeWidth: 5, fontSize: 'text-xl', labelSize: 'text-xs' },
  lg: { svgSize: 128, strokeWidth: 6, fontSize: 'text-2xl', labelSize: 'text-sm' },
};

function getScoreColor(score: number) {
  if (score < 40) return { stroke: '#ef4444', text: 'text-red-400', glow: 'rgba(239,68,68,0.2)', label: 'Needs Improvement' };
  if (score <= 70) return { stroke: '#f59e0b', text: 'text-amber-400', glow: 'rgba(245,158,11,0.2)', label: 'Good' };
  return { stroke: '#22c55e', text: 'text-emerald-400', glow: 'rgba(34,197,94,0.2)', label: 'Excellent' };
}

export default function QualityScore({ score, label, size = 'md' }: QualityScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const config = SIZE_CONFIG[size];
  const radius = (config.svgSize - config.strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score);

  useEffect(() => {
    // Animate score from 0 to target
    const duration = 1200;
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }, [score]);

  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative"
        style={{ filter: `drop-shadow(0 0 8px ${color.glow})` }}
      >
        <svg
          width={config.svgSize}
          height={config.svgSize}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.svgSize / 2}
            cy={config.svgSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(71, 85, 105, 0.3)"
            strokeWidth={config.strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={config.svgSize / 2}
            cy={config.svgSize / 2}
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth={config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-100"
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.fontSize} font-bold tabular-nums ${color.text}`}>
            {animatedScore}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className={`${config.labelSize} font-medium ${color.text}`}>
          {label || color.label}
        </p>
      </div>
    </div>
  );
}
