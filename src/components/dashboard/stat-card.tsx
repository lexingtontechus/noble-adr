'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

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

  return (
    <motion.div
      className={`rounded-xl border p-4 space-y-2 cursor-default relative group ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}
      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
    >
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
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
      {progressPct !== undefined && (
        <div className="pt-1">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden relative">
            <div
              className={`h-full rounded-full ${progressPct >= (progressBreakevenPct ?? 33.3) ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, progressPct)}%` }}
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
