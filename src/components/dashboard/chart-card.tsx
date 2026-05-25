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
      className={`rounded-xl border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ripple-container ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onClick={handleClick}
    >
      <div
        className="h-1"
        style={{
          background: `linear-gradient(to right, ${gradientMap[gradientFrom] || gradientMap.cyan}, ${gradientMap[gradientTo] || gradientMap.purple})`,
        }}
      />
      <div className="p-5 space-y-4 relative" style={isDark ? { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' } : undefined}>
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

// ====== CUSTOM CHART TOOLTIP ======

// Known data key to color mapping for tooltip colored dots
const DATA_KEY_COLORS: Record<string, string> = {
  winRate: '#06b6d4',
  expectancy: '#8b5cf6',
  kelly: '#f59e0b',
  trades: '#22c55e',
  longWR: '#22c55e',
  shortWR: '#ef4444',
  equity: '#ef4444',
  drawdown: '#ef4444',
  count: '#06b6d4',
  avgPnl: '#f97316',
};

const DATA_KEY_LABELS: Record<string, string> = {
  winRate: 'Win Rate',
  expectancy: 'Expectancy',
  kelly: 'Kelly %',
  trades: 'Trades',
  longWR: 'Long',
  shortWR: 'Short',
  equity: 'Equity',
  drawdown: 'Drawdown',
  count: 'Count',
  avgPnl: 'Avg P&L',
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color?: string;
    dataKey: string;
  }>;
  label?: string;
  isDark?: boolean;
  formatter?: (value: number, name: string) => [string, string];
  labelFormatter?: (label: string) => string;
}

export function CustomChartTooltip({ active, payload, label, isDark = false, formatter, labelFormatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const bgColor = isDark ? '#2a2a3e' : '#ffffff';
  const borderColor = isDark ? '#3a3a4e' : '#e5e7eb';
  const textColor = isDark ? '#e0e0e0' : '#1f2937';
  const mutedColor = isDark ? '#999' : '#6b7280';

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '8px 12px',
        fontSize: '12px',
        color: textColor,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {label && (
        <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '11px', color: mutedColor }}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      {payload.map((entry, i) => {
        const dotColor = entry.color || DATA_KEY_COLORS[entry.dataKey] || '#06b6d4';
        const displayName = DATA_KEY_LABELS[entry.dataKey] || entry.name;
        const [formattedValue, formattedName] = formatter
          ? formatter(entry.value, entry.dataKey)
          : [String(entry.value), displayName];

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '2px 0',
              borderLeft: `3px solid ${dotColor}`,
              paddingLeft: '8px',
              marginTop: i === 0 ? 0 : 2,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: dotColor,
                flexShrink: 0,
              }}
            />
            <span style={{ color: mutedColor, fontSize: '11px' }}>{formattedName || displayName}</span>
            <span style={{ fontWeight: 600, marginLeft: 'auto', paddingLeft: '8px' }}>{formattedValue}</span>
          </div>
        );
      })}
    </div>
  );
}
