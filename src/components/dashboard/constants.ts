import type { TabId } from './types';

// ====== CONSTANTS ======

export const COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#f59e0b',
  accent: '#8b5cf6',
  chart1: '#06b6d4',
  chart2: '#f97316',
  chart3: '#8b5cf6',
  chart4: '#ec4899',
  up: '#22c55e',
  down: '#ef4444',
  q1: '#06b6d4',
  q2: '#f97316',
  q3: '#8b5cf6',
  q4: '#ec4899',
};

export const QUARTER_COLORS: Record<string, string> = {
  Q1: COLORS.q1,
  Q2: COLORS.q2,
  Q3: COLORS.q3,
  Q4: COLORS.q4,
};

export const LIGHT_CHART_COLORS = {
  grid: '#e5e7eb',
  text: '#9ca3af',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
  divider: '#e5e7eb',
};

export const DARK_CHART_COLORS = {
  grid: '#333',
  text: '#aaa',
  tooltipBg: '#2a2a3e',
  tooltipBorder: '#3a3a4e',
  divider: '#555',
};

// ====== ANIMATION VARIANTS ======

export const tabVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};
