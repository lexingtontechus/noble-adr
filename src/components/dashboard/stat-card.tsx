'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

// ====== MINI SPARKLINE ======

function MiniSparkline({ color, isDark }: { color: 'cyan' | 'green' | 'red' | 'amber'; isDark?: boolean }) {
  const colorMap = {
    cyan: '#06b6d4',
    green: '#22c55e',
    red: '#ef4444',
    amber: '#f59e0b',
  };

  // Generate deterministic sparkline points based on color
  const points = [3, 5, 2, 7, 4, 8, 5, 3, 6, 4, 7, 2, 5, 8, 3];
  const max = Math.max(...points);
  const width = 60;
  const height = 16;
  const stepX = width / (points.length - 1);

  const pathD = points.map((p, i) => {
    const x = i * stepX;
    const y = height - (p / max) * height;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaD = pathD + ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className="opacity-30">
      <path d={areaD} fill={colorMap[color]} fillOpacity={0.2} />
      <path d={pathD} fill="none" stroke={colorMap[color]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ====== STAT CARD ======

export function StatCard({ icon, label, value, subtext, color, isDark = false, tooltip, progressPct, progressBreakevenPct }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'cyan' | 'green' | 'red' | 'amber';
  isDark?: boolean;
  tooltip?: string;
  progressPct?: number;
  progressBreakevenPct?: number;
}) {
  const iconColorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  const gradientColorMap = {
    cyan: 'from-cyan-500 to-cyan-600',
    green: 'from-green-500 to-emerald-600',
    red: 'from-red-500 to-rose-600',
    amber: 'from-amber-500 to-orange-600',
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;
    e.currentTarget.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  };

  return (
    <motion.div
      className={`rounded-xl border p-4 space-y-2 cursor-default relative group overflow-hidden ripple-container ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
      onClick={handleClick}
    >
      {/* Background sparkline */}
      <div className="absolute bottom-2 right-2 pointer-events-none">
        <MiniSparkline color={color} isDark={isDark} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-md flex items-center justify-center ${iconColorMap[color]}`}>
            {icon}
          </div>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        {tooltip && (
          <div className="relative">
            <Info className="h-3 w-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
            <div className="absolute right-0 top-6 w-56 rounded-lg bg-foreground text-background text-[10px] p-2.5 leading-relaxed shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <p className={`responsive-stat-value font-bold tracking-tight bg-gradient-to-r ${gradientColorMap[color]} bg-clip-text text-transparent`}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
      {progressPct !== undefined && (
        <div className="pt-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
            <motion.div
              className={`h-full rounded-full ${progressPct >= (progressBreakevenPct ?? 33.3) ? 'bg-green-500' : 'bg-red-500'}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, progressPct)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {progressBreakevenPct !== undefined && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
                style={{ left: `${Math.min(100, progressBreakevenPct)}%` }}
                title={`Breakeven: ${progressBreakevenPct}%`}
              />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
