'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LIGHT_CHART_COLORS, DARK_CHART_COLORS } from './constants';

// ====== CHART CARD ======

// Chart card wrapper with gradient top border, glassmorphism, hover effects, and entrance animation
export function ChartCard({ title, subtitle, children, gradientFrom = 'cyan', gradientTo = 'purple', isDark = false }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  isDark?: boolean;
}) {
  const gradientMap: Record<string, string> = {
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
    amber: '#f59e0b',
  };

  return (
    <motion.div
      className={`rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <div
        className="h-1"
        style={{
          background: `linear-gradient(to right, ${gradientMap[gradientFrom] || gradientMap.cyan}, ${gradientMap[gradientTo] || gradientMap.purple})`,
        }}
      />
      <div className="p-5 space-y-4 relative">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {children}
        {/* Subtle gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none rounded-b-xl" style={{
          background: `linear-gradient(to top, ${isDark ? 'rgba(139,92,246,0.03)' : 'rgba(139,92,246,0.02)'}, transparent)`
        }} />
      </div>
    </motion.div>
  );
}

// ====== SECTION DIVIDER ======

// Section divider with gradient
export function SectionDivider({ isDark = false }: { isDark?: boolean } = {}) {
  return (
    <motion.div
      className="h-px w-full my-2"
      style={{
        background: `linear-gradient(to right, transparent, ${isDark ? DARK_CHART_COLORS.divider : LIGHT_CHART_COLORS.divider}, transparent)`,
      }}
      initial={{ opacity: 0, scaleX: 0.3 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    />
  );
}
