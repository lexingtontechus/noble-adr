'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { BacktestData } from './types';
import { SectionDivider } from './chart-card';
import { StreakAnalysis, CorrelationScatter, BootstrapConfidence, ProfitFactorCard } from './advanced-analytics';
import { RiskAdjustedMetrics, TradeCalendarHeatmap, RunningMetricsTimeline } from './risk-metrics';

// ====== CORRELATION MATRIX ======

function CorrelationMatrix({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const correlations = useMemo(() => {
    const trades = data.recent_trades;
    if (trades.length < 10) return [];

    // Compute ADR5 buckets (low/med/high) for correlation grouping
    const adrValues = trades.map(t => t.adr_5);
    const sortedAdr = [...adrValues].sort((a, b) => a - b);
    const p33 = sortedAdr[Math.floor(sortedAdr.length * 0.33)];
    const p67 = sortedAdr[Math.floor(sortedAdr.length * 0.67)];

    // Helper: Pearson correlation
    const pearson = (xs: number[], ys: number[]): number => {
      const n = xs.length;
      if (n < 5) return 0;
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((a, b, i) => a + b * ys[i], 0);
      const sumX2 = xs.reduce((a, b) => a + b * b, 0);
      const sumY2 = ys.reduce((a, b) => a + b * b, 0);
      const num = n * sumXY - sumX * sumY;
      const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      return den === 0 ? 0 : num / den;
    };

    // 1. ADR5 value vs Win Rate (bucketed by level)
    const adrByLevel: Record<string, { adr: number; wr: number }[]> = {};
    for (const level of data.level_breakdown) {
      const levelTrades = trades.filter(t => t.level === level.level);
      if (levelTrades.length > 0) {
        const avgAdr = levelTrades.reduce((s, t) => s + t.adr_5, 0) / levelTrades.length;
        adrByLevel[level.level] = [{ adr: avgAdr, wr: level.win_rate }];
      }
    }

    // Flatten for correlation: ADR5 vs WR across levels
    const levelAdrs = data.level_breakdown
      .filter(l => l.total_trades > 0)
      .map(l => {
        const lt = trades.filter(t => t.level === l.level);
        return { adr: lt.reduce((s, t) => s + t.adr_5, 0) / lt.length, wr: l.win_rate };
      });

    const adrVsWR = pearson(
      levelAdrs.map(d => d.adr),
      levelAdrs.map(d => d.wr)
    );

    // 2. Quarter level vs Expectancy
    const quarterNums = data.quarter_breakdown.map(q => {
      const qNum = parseInt(q.quarter.replace('Q', ''));
      return { quarter: qNum, exp: q.expectancy };
    });

    const quarterVsExp = pearson(
      quarterNums.map(d => d.quarter),
      quarterNums.map(d => d.exp)
    );

    // 3. Direction vs Win Rate (1 = Long, 0 = Short)
    const longTrades = trades.filter(t => t.direction === 'Long');
    const shortTrades = trades.filter(t => t.direction === 'Short');
    const longWR = longTrades.length > 0 ? longTrades.reduce((s, t) => s + t.win_prob, 0) / longTrades.length * 100 : 0;
    const shortWR = shortTrades.length > 0 ? shortTrades.reduce((s, t) => s + t.win_prob, 0) / shortTrades.length * 100 : 0;
    const dirVsWR = pearson(
      trades.map(t => t.direction === 'Long' ? 1 : 0),
      trades.map(t => t.win_prob * 100)
    );

    // 4. ADR5 bucket vs Expectancy
    const adrBuckets = [
      { label: 'Low ADR', trades: trades.filter(t => t.adr_5 <= p33) },
      { label: 'Mid ADR', trades: trades.filter(t => t.adr_5 > p33 && t.adr_5 <= p67) },
      { label: 'High ADR', trades: trades.filter(t => t.adr_5 > p67) },
    ];

    const bucketExp = adrBuckets.map(b => ({
      label: b.label,
      avgAdr: b.trades.length > 0 ? b.trades.reduce((s, t) => s + t.adr_5, 0) / b.trades.length : 0,
      expectancy: b.trades.length > 0 ? b.trades.reduce((s, t) => s + t.pnl_pct, 0) / b.trades.length : 0,
      wr: b.trades.length > 0 ? b.trades.reduce((s, t) => s + t.win_prob, 0) / b.trades.length * 100 : 0,
    }));

    // 5. Quarter vs Win Rate
    const quarterVsWR = pearson(
      quarterNums.map(d => d.quarter),
      data.quarter_breakdown.map(q => q.win_rate)
    );

    // 6. Direction vs Expectancy (proper Pearson correlation)
    const longExp = longTrades.length > 0 ? longTrades.reduce((s, t) => s + t.pnl_pct, 0) / longTrades.length : 0;
    const shortExp = shortTrades.length > 0 ? shortTrades.reduce((s, t) => s + t.pnl_pct, 0) / shortTrades.length : 0;
    // Encode direction as numeric: 1 = Long, 0 = Short
    const dirNums = trades.map(t => t.direction === 'Long' ? 1 : 0);
    const expNums = trades.map(t => t.pnl_pct);
    const dirVsExp = pearson(dirNums, expNums);

    // Build matrix data
    const factors = ['ADR5 vs WR', 'Quarter vs Exp', 'Dir vs WR', 'Quarter vs WR', 'Dir vs Exp'];
    const values = [adrVsWR, quarterVsExp, dirVsWR, quarterVsWR, dirVsExp];

    return { factors, values, bucketExp, longWR, shortWR, longExp, shortExp };
  }, [data]);

  if (!correlations || correlations.factors.length === 0) return null;

  const getCellColor = (r: number) => {
    const abs = Math.abs(r);
    if (r > 0) {
      if (abs >= 0.5) return 'rgba(34, 197, 94, 0.7)';
      if (abs >= 0.3) return 'rgba(34, 197, 94, 0.5)';
      if (abs >= 0.1) return 'rgba(34, 197, 94, 0.25)';
      return 'rgba(34, 197, 94, 0.1)';
    } else {
      if (abs >= 0.5) return 'rgba(239, 68, 68, 0.7)';
      if (abs >= 0.3) return 'rgba(239, 68, 68, 0.5)';
      if (abs >= 0.1) return 'rgba(239, 68, 68, 0.25)';
      return 'rgba(239, 68, 68, 0.1)';
    }
  };

  const getInterpretation = (r: number) => {
    const abs = Math.abs(r);
    if (abs < 0.1) return 'Negligible';
    if (abs < 0.3) return 'Weak';
    if (abs < 0.5) return 'Moderate';
    return 'Strong';
  };

  return (
    <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
        </svg>
        <div>
          <h3 className="font-semibold text-sm">Correlation Matrix</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Relationships between key strategy variables</p>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-1 gap-2">
        {correlations.factors.map((factor, i) => {
          const r = correlations.values[i];
          return (
            <motion.div
              key={factor}
              className={`flex items-center gap-3 rounded-lg border p-3 ${isDark ? 'border-white/10' : 'border-border'}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <div
                className="h-10 w-10 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: getCellColor(r), color: isDark ? '#fff' : '#1f2937' }}
              >
                {r >= 0 ? '+' : ''}{r.toFixed(2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{factor}</p>
                <p className="text-[10px] text-muted-foreground">
                  {getInterpretation(r)} {r >= 0 ? 'positive' : 'negative'} correlation
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 rounded-full" style={{
                  width: `${Math.abs(r) * 60}px`,
                  backgroundColor: r >= 0 ? '#22c55e' : '#ef4444',
                  opacity: 0.6,
                  maxWidth: '60px',
                }} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ADR Bucket Breakdown */}
      {correlations.bucketExp && correlations.bucketExp.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">ADR Regime Breakdown</p>
          <div className="grid grid-cols-3 gap-2">
            {correlations.bucketExp.map((b, i) => (
              <motion.div
                key={b.label}
                className={`rounded-lg border p-3 space-y-1 text-center ${isDark ? 'border-white/10' : 'border-border'}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}
              >
                <p className="text-[10px] text-muted-foreground font-medium">{b.label}</p>
                <p className="text-sm font-bold font-mono" style={{ color: b.expectancy >= 0 ? '#22c55e' : '#ef4444' }}>
                  {b.expectancy >= 0 ? '+' : ''}{b.expectancy.toFixed(3)}
                </p>
                <p className="text-[9px] text-muted-foreground">Exp · {b.wr.toFixed(1)}% WR</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Direction Breakdown */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}>
          <p className="text-[10px] text-muted-foreground font-medium">Long Direction</p>
          <p className="text-sm font-bold text-green-500">{correlations.longWR.toFixed(1)}% WR</p>
          <p className="text-[10px] text-muted-foreground">Exp: {correlations.longExp >= 0 ? '+' : ''}{correlations.longExp.toFixed(4)}</p>
        </div>
        <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}>
          <p className="text-[10px] text-muted-foreground font-medium">Short Direction</p>
          <p className="text-sm font-bold text-red-500">{correlations.shortWR.toFixed(1)}% WR</p>
          <p className="text-[10px] text-muted-foreground">Exp: {correlations.shortExp >= 0 ? '+' : ''}{correlations.shortExp.toFixed(4)}</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }} />
          <span>Positive</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }} />
          <span>Negative</span>
        </div>
        <span>|r| &lt; 0.1: Negligible, 0.1–0.3: Weak, 0.3–0.5: Moderate, &gt;0.5: Strong</span>
      </div>
    </div>
  );
}

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
        className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
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

      {/* Correlation Matrix */}
      <CorrelationMatrix data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Bootstrap Confidence */}
      <BootstrapConfidence data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Risk-Adjusted Metrics */}
      <RiskAdjustedMetrics data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Trade Calendar Heatmap */}
      <TradeCalendarHeatmap data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Running Metrics Timeline */}
      <RunningMetricsTimeline data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Methodology Note */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
      >
        <h3 className="font-semibold text-sm">Statistical Methodology Notes</h3>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p><span className="font-medium text-foreground">Streak Analysis:</span> Treats each trade as a &quot;win&quot; if win_prob &gt; 0.5 or pnl_pct &gt; 0, otherwise &quot;loss&quot;. Consecutive same-direction outcomes form streaks.</p>
          <p><span className="font-medium text-foreground">Correlation Analysis:</span> Uses Pearson correlation coefficient (r) to measure linear relationship between ADR₅ and trade P&amp;L. Simple linear regression provides a trendline.</p>
          <p><span className="font-medium text-foreground">Bootstrap CI:</span> Resampling with replacement from observed trade outcomes. 95% CI represents the range where the true win rate is expected to fall 95% of the time. P-value estimates P(WR ≥ 33.3%).</p>
          <p><span className="font-medium text-foreground">Profit Factor:</span> Ratio of gross profits to gross losses. Calculated using probability-weighted P&amp;L: Gross Profit = Σ(max(0, pnl) × win_prob), Gross Loss = Σ(|min(0, pnl)| × (1−win_prob)). PF &gt; 1.0 = profitable, PF &lt; 1.0 = losing strategy.</p>
          <p><span className="font-medium text-foreground">Risk-Adjusted Metrics:</span> Sharpe Ratio uses (mean return − Rf) / σ of daily equity returns, annualized by √252. Sortino divides by downside deviation only. Calmar = annualized return / max drawdown. Risk-free rate = 5% annualized.</p>
          <p><span className="font-medium text-foreground">Calendar Heatmap:</span> Probability-weighted P&amp;L aggregated by trade date. Cell intensity reflects magnitude relative to the max observed daily P&amp;L. Green = profitable, Red = losing, Gray = no trades.</p>
          <p><span className="font-medium text-foreground">Rolling Timeline:</span> Sliding 50-trade window computing probability-weighted win rate and average P&amp;L (expectancy). Reference lines at 33.3% WR and 0 expectancy mark breakeven thresholds.</p>
        </div>
      </motion.div>
    </div>
  );
}
