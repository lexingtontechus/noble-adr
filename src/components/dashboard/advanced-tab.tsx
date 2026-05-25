'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { BacktestData } from './types';
import { SectionDivider } from './chart-card';
import { StreakAnalysis, CorrelationScatter, BootstrapConfidence, ProfitFactorCard } from './advanced-analytics';

// ====== ADVANCED ANALYTICS TAB ======

export function AnalyticsTab({ data, isDark = false }: {
  data: BacktestData;
  isDark?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}
      >
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="h-4 w-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12c0 1.2-4 6-9 6s-9-4.8-9-6c0-1.2 4-6 9-6s9 4.8 9 6z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="font-semibold text-sm">Advanced Statistical Analysis</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Deep-dive analytics including streak analysis, correlation testing, bootstrap confidence intervals, and profit factor breakdown.
              These tools help assess the statistical significance and robustness of the strategy&apos;s observed performance.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Profit Factor */}
      <ProfitFactorCard data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Streak Analysis */}
      <StreakAnalysis data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Correlation Scatter */}
      <CorrelationScatter data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Bootstrap Confidence */}
      <BootstrapConfidence data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Methodology Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}
      >
        <h3 className="font-semibold text-sm">Statistical Methodology Notes</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p><span className="font-medium text-foreground">Streak Analysis:</span> Treats each trade as a &quot;win&quot; if win_prob &gt; 0.5 or pnl_pct &gt; 0, otherwise &quot;loss&quot;. Consecutive same-direction outcomes form streaks.</p>
          <p><span className="font-medium text-foreground">Correlation Analysis:</span> Uses Pearson correlation coefficient (r) to measure linear relationship between ADR₅ and trade P&amp;L. Simple linear regression provides a trendline.</p>
          <p><span className="font-medium text-foreground">Bootstrap CI:</span> Resampling with replacement from observed trade outcomes. 95% CI represents the range where the true win rate is expected to fall 95% of the time. P-value estimates P(WR ≥ 33.3%).</p>
          <p><span className="font-medium text-foreground">Profit Factor:</span> Ratio of gross profits to gross losses. Calculated using probability-weighted P&amp;L: Gross Profit = Σ(max(0, pnl) × win_prob), Gross Loss = Σ(|min(0, pnl)| × (1−win_prob)). PF &gt; 1.0 = profitable, PF &lt; 1.0 = losing strategy.</p>
        </div>
      </motion.div>
    </div>
  );
}
