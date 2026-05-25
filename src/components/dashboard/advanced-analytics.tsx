'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine,
  Legend, ZAxis,
} from 'recharts';
import { Flame, GitBranch, BarChart3, DollarSign } from 'lucide-react';
import type { BacktestData, TradeRecord } from './types';
import { COLORS, LIGHT_CHART_COLORS, DARK_CHART_COLORS } from './constants';
import { ChartCard, SectionDivider } from './chart-card';

// ====== SEEDED PRNG (mulberry32) ======

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ====== HELPER: Animated number display ======

function useAnimatedNumber(target: number, decimals: number = 2, duration: number = 1200) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(target);
  const startTime = useRef(Date.now());

  useEffect(() => {
    prevTarget.current = target;
    startTime.current = Date.now();

    const startVal = value;
    const animate = () => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(startVal + (target - startVal) * eased);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  if (Number.isNaN(value) || !Number.isFinite(value)) return '0';
  return value.toFixed(decimals);
}

// ====== 1. STREAK ANALYSIS ======

function isTradeWin(trade: TradeRecord): boolean {
  return trade.win_prob > 0.5 || trade.pnl_pct > 0;
}

interface StreakInfo {
  type: 'win' | 'loss';
  length: number;
}

function computeStreaks(trades: TradeRecord[]): StreakInfo[] {
  const streaks: StreakInfo[] = [];
  if (trades.length === 0) return streaks;

  let currentType = isTradeWin(trades[0]) ? 'win' : 'loss';
  let currentLength = 1;

  for (let i = 1; i < trades.length; i++) {
    const win = isTradeWin(trades[i]);
    if ((win && currentType === 'win') || (!win && currentType === 'loss')) {
      currentLength++;
    } else {
      streaks.push({ type: currentType, length: currentLength });
      currentType = win ? 'win' : 'loss';
      currentLength = 1;
    }
  }
  streaks.push({ type: currentType, length: currentLength });
  return streaks;
}

export function StreakAnalysis({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const streakData = useMemo(() => {
    const trades = data.recent_trades;
    const streaks = computeStreaks(trades);

    if (streaks.length === 0) {
      return {
        chartData: [],
        longestWin: 0,
        longestLoss: 0,
        currentStreak: { type: 'win' as const, length: 0 },
        avgStreak: 0,
      };
    }

    // Build distribution: bucket by length 1, 2, 3, 4+
    const winDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4+': 0 };
    const lossDist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4+': 0 };

    for (const s of streaks) {
      const key = s.length >= 4 ? '4+' : String(s.length);
      if (s.type === 'win') winDist[key]++;
      else lossDist[key]++;
    }

    const chartData = ['1', '2', '3', '4+'].map(label => ({
      label,
      winStreaks: winDist[label],
      lossStreaks: lossDist[label],
    }));

    const longestWin = Math.max(0, ...streaks.filter(s => s.type === 'win').map(s => s.length));
    const longestLoss = Math.max(0, ...streaks.filter(s => s.type === 'loss').map(s => s.length));
    const currentStreak = streaks[streaks.length - 1];
    const avgStreak = streaks.length > 0 ? streaks.reduce((a, s) => a + s.length, 0) / streaks.length : 0;

    return { chartData, longestWin, longestLoss, currentStreak, avgStreak };
  }, [data]);

  const currentDir = streakData.currentStreak?.type === 'win' ? 'Win' : 'Loss';
  const currentColor = streakData.currentStreak?.type === 'win' ? COLORS.positive : COLORS.negative;

  return (
    <div className="space-y-4">
      {/* Streak Distribution Chart */}
      <ChartCard title="Streak Distribution" subtitle="Frequency of consecutive win/loss streaks" gradientFrom="green" gradientTo="red" isDark={isDark}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streakData.chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke={cc.text} label={{ value: 'Streak Length', position: 'insideBottom', offset: -2, fontSize: 10, fill: cc.text }} />
              <YAxis tick={{ fontSize: 10 }} stroke={cc.text} allowDecimals={false} />
              <RechartsTooltip
                contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
                formatter={(value: number, name: string) => {
                  const label = name === 'winStreaks' ? 'Win Streaks' : 'Loss Streaks';
                  return [`${value}`, label];
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="winStreaks" name="winStreaks" fill={COLORS.positive} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
              <Bar dataKey="lossStreaks" name="lossStreaks" fill={COLORS.negative} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-green-500/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Longest Win</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{streakData.longestWin}</p>
          <p className="text-xs text-muted-foreground">consecutive wins</p>
        </motion.div>

        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-red-500/10 flex items-center justify-center">
              <Flame className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Longest Loss</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{streakData.longestLoss}</p>
          <p className="text-xs text-muted-foreground">consecutive losses</p>
        </motion.div>

        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-md flex items-center justify-center ${currentColor === COLORS.positive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <GitBranch className="h-4 w-4" style={{ color: currentColor }} />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Current Streak</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: currentColor }}>{streakData.currentStreak?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">{currentDir} streak</p>
        </motion.div>

        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Avg Streak</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{streakData.avgStreak.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">average length</p>
        </motion.div>
      </div>
    </div>
  );
}

// ====== 2. CORRELATION SCATTER ======

export function CorrelationScatter({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const { scatterData, pearsonR, regression, interpretation } = useMemo(() => {
    const trades = data.recent_trades;
    if (trades.length < 2) {
      return { scatterData: [], pearsonR: 0, regression: { slope: 0, intercept: 0 }, interpretation: 'Insufficient data' };
    }

    const points = trades.map(t => ({
      adr5: t.adr_5,
      pnl: t.pnl_pct,
      isWin: t.pnl_pct > 0,
    }));

    // Pearson correlation coefficient
    const n = points.length;
    const sumX = points.reduce((a, p) => a + p.adr5, 0);
    const sumY = points.reduce((a, p) => a + p.pnl, 0);
    const sumXY = points.reduce((a, p) => a + p.adr5 * p.pnl, 0);
    const sumX2 = points.reduce((a, p) => a + p.adr5 * p.adr5, 0);
    const sumY2 = points.reduce((a, p) => a + p.pnl * p.pnl, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    const r = denominator === 0 ? 0 : numerator / denominator;

    // Simple linear regression: y = slope * x + intercept
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
    const intercept = (sumY - slope * sumX) / n;

    // Interpretation text
    const absR = Math.abs(r);
    let interpretation = '';
    if (absR < 0.1) interpretation = 'Negligible correlation between ADR₅ and trade P&L';
    else if (absR < 0.3) interpretation = r > 0 ? 'Weak positive correlation — higher ADR₅ slightly favors P&L' : 'Weak negative correlation — higher ADR₅ slightly hurts P&L';
    else if (absR < 0.5) interpretation = r > 0 ? 'Moderate positive correlation — higher ADR₅ tends to improve P&L' : 'Moderate negative correlation — higher ADR₅ tends to hurt P&L';
    else interpretation = r > 0 ? 'Strong positive correlation — ADR₅ strongly influences P&L upward' : 'Strong negative correlation — ADR₅ strongly influences P&L downward';

    // For Recharts scatter, we need {x, y} format
    const scatterData = points.map(p => ({
      x: p.adr5,
      y: p.pnl,
      isWin: p.isWin,
    }));

    return { scatterData, pearsonR: r, regression: { slope, intercept }, interpretation };
  }, [data]);

  // Compute trendline endpoints for ReferenceLine
  const trendlineData = useMemo(() => {
    if (scatterData.length === 0) return { x1: 0, y1: 0, x2: 1, y2: 0 };
    const xs = scatterData.map(p => p.x);
    const x1 = Math.min(...xs);
    const x2 = Math.max(...xs);
    return {
      x1,
      y1: regression.slope * x1 + regression.intercept,
      x2,
      y2: regression.slope * x2 + regression.intercept,
    };
  }, [scatterData, regression]);

  const rColor = Math.abs(pearsonR) >= 0.3
    ? (pearsonR > 0 ? COLORS.positive : COLORS.negative)
    : COLORS.neutral;

  return (
    <ChartCard title="ADR₅ vs Trade P&L Correlation" subtitle="Scatter plot with linear trendline" gradientFrom="cyan" gradientTo="amber" isDark={isDark}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
            <XAxis
              type="number"
              dataKey="x"
              name="ADR₅"
              tick={{ fontSize: 10 }}
              stroke={cc.text}
              label={{ value: 'ADR₅ (pts)', position: 'insideBottom', offset: -2, fontSize: 10, fill: cc.text }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="P&L"
              tick={{ fontSize: 10 }}
              stroke={cc.text}
              label={{ value: 'P&L (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: cc.text }}
            />
            <ZAxis range={[30, 30]} />
            <RechartsTooltip
              contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
              formatter={(value: number, name: string) => {
                if (name === 'ADR₅') return [value.toLocaleString(), name];
                if (name === 'P&L') return [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, name];
                return [value, name];
              }}
              cursor={{ strokeDasharray: '3 3' }}
            />
            <ReferenceLine
              segment={[
                { x: trendlineData.x1, y: trendlineData.y1 },
                { x: trendlineData.x2, y: trendlineData.y2 },
              ]}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
            <ReferenceLine y={0} stroke={cc.text} strokeDasharray="2 2" />
            <Scatter data={scatterData} name="Trades">
              {scatterData.map((entry, index) => (
                <Cell key={index} fill={entry.isWin ? COLORS.positive : COLORS.negative} fillOpacity={0.7} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <SectionDivider isDark={isDark} />

      {/* Correlation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div
          className={`rounded-lg border p-4 space-y-2 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground font-medium">Pearson Correlation (r)</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold font-mono" style={{ color: rColor }}>{pearsonR.toFixed(4)}</p>
            <div
              className="h-3 rounded-full"
              style={{
                width: `${Math.min(Math.abs(pearsonR) * 200, 100)}px`,
                backgroundColor: rColor,
                opacity: 0.5,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{interpretation}</p>
        </motion.div>

        <motion.div
          className={`rounded-lg border p-4 space-y-2 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground font-medium">Regression Equation</p>
          <p className="text-sm font-mono">
            P&amp;L = {regression.slope >= 0 ? '' : '−'}{Math.abs(regression.slope).toFixed(6)} × ADR₅ {regression.intercept >= 0 ? '+' : '−'} {Math.abs(regression.intercept).toFixed(4)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            R² = {(pearsonR * pearsonR).toFixed(4)} — {pearsonR * pearsonR < 0.05 ? 'ADR₅ explains very little P&L variance' : 'ADR₅ explains some P&L variance'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.positive }} />
            <span className="text-[10px] text-muted-foreground">Profitable trade</span>
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.negative }} />
            <span className="text-[10px] text-muted-foreground">Losing trade</span>
          </div>
        </motion.div>
      </div>
    </ChartCard>
  );
}

// ====== 3. BOOTSTRAP CONFIDENCE ======

export function BootstrapConfidence({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const [iterations, setIterations] = useState(1000);
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const bootstrapResults = useMemo(() => {
    const trades = data.recent_trades;
    const n = trades.length;
    if (n === 0) {
      return { ci95Low: 0, ci95High: 0, ci90Low: 0, ci90High: 0, pValue: 0, observedWR: 0, containsBreakeven: false };
    }

    // Determine win/loss for each trade
    const tradeWins = trades.map(t => isTradeWin(t));
    const observedWR = tradeWins.filter(Boolean).length / n;

    // Bootstrap resampling
    const rng = mulberry32(12345);
    const bootstrapWRs: number[] = [];

    for (let i = 0; i < iterations; i++) {
      let wins = 0;
      for (let j = 0; j < n; j++) {
        // Resample with replacement
        const idx = Math.floor(rng() * n);
        if (tradeWins[idx]) wins++;
      }
      bootstrapWRs.push(wins / n);
    }

    bootstrapWRs.sort((a, b) => a - b);

    // Confidence intervals
    const ci95Low = bootstrapWRs[Math.floor(iterations * 0.025)];
    const ci95High = bootstrapWRs[Math.floor(iterations * 0.975)];
    const ci90Low = bootstrapWRs[Math.floor(iterations * 0.05)];
    const ci90High = bootstrapWRs[Math.floor(iterations * 0.95)];

    // P-value: fraction of bootstrap samples with WR >= 33.3% (breakeven)
    const breakeven = 1 / 3;
    const pValue = bootstrapWRs.filter(wr => wr >= breakeven).length / iterations;

    const containsBreakeven = ci95Low <= breakeven && ci95High >= breakeven;

    return {
      ci95Low: ci95Low * 100,
      ci95High: ci95High * 100,
      ci90Low: ci90Low * 100,
      ci90High: ci90High * 100,
      pValue,
      observedWR: observedWR * 100,
      containsBreakeven,
    };
  }, [data, iterations]);

  const breakevenWR = 33.3;

  // Gauge position calculation (map WR to 0-100 scale)
  const gaugeMin = Math.max(0, bootstrapResults.ci95Low - 5);
  const gaugeMax = Math.min(100, bootstrapResults.ci95High + 5);
  const gaugeRange = gaugeMax - gaugeMin || 1;

  const observedPos = ((bootstrapResults.observedWR - gaugeMin) / gaugeRange) * 100;
  const ci95LowPos = ((bootstrapResults.ci95Low - gaugeMin) / gaugeRange) * 100;
  const ci95HighPos = ((bootstrapResults.ci95High - gaugeMin) / gaugeRange) * 100;
  const breakevenPos = ((breakevenWR - gaugeMin) / gaugeRange) * 100;

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            <div>
              <h3 className="font-semibold text-sm">Bootstrap Confidence Intervals</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Resampling-based win rate confidence intervals</p>
            </div>
          </div>
          <select
            value={iterations}
            onChange={(e) => setIterations(Number(e.target.value))}
            className={`text-xs border rounded-md px-2 py-1 ${isDark ? 'bg-white/10 border-white/20 text-white' : 'border-border bg-card'}`}
          >
            <option value={500}>500 iterations</option>
            <option value={1000}>1,000 iterations</option>
            <option value={5000}>5,000 iterations</option>
          </select>
        </div>

        {/* Confidence Interval Visual Gauge */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">95% Confidence Interval</p>
          <div className="relative h-8 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#1e1e2e' : '#f3f4f6' }}>
            {/* CI range gradient */}
            <motion.div
              className="absolute h-full rounded-full"
              style={{
                left: `${ci95LowPos}%`,
                width: `${ci95HighPos - ci95LowPos}%`,
                background: `linear-gradient(to right, ${COLORS.negative}66, ${COLORS.neutral}88, ${COLORS.negative}66)`,
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {/* Breakeven marker */}
            {breakevenPos >= 0 && breakevenPos <= 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 z-10"
                style={{ left: `${breakevenPos}%`, backgroundColor: '#f59e0b' }}
              />
            )}
            {/* Observed WR marker */}
            <div
              className="absolute top-1 bottom-1 w-1.5 rounded-full z-20"
              style={{
                left: `calc(${observedPos}% - 3px)`,
                backgroundColor: bootstrapResults.observedWR >= breakevenWR ? COLORS.positive : COLORS.negative,
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{gaugeMin.toFixed(1)}%</span>
            <span className="font-mono text-xs">
              CI: [{bootstrapResults.ci95Low.toFixed(1)}%, {bootstrapResults.ci95High.toFixed(1)}%]
            </span>
            <span>{gaugeMax.toFixed(1)}%</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div
            className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-muted-foreground">95% CI</p>
            <p className="text-lg font-bold font-mono">
              [{bootstrapResults.ci95Low.toFixed(1)}%, {bootstrapResults.ci95High.toFixed(1)}%]
            </p>
          </motion.div>

          <motion.div
            className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-muted-foreground">90% CI</p>
            <p className="text-lg font-bold font-mono">
              [{bootstrapResults.ci90Low.toFixed(1)}%, {bootstrapResults.ci90High.toFixed(1)}%]
            </p>
          </motion.div>

          <motion.div
            className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-muted-foreground">Breakeven in CI?</p>
            <p className={`text-lg font-bold ${bootstrapResults.containsBreakeven ? 'text-amber-500' : 'text-red-500'}`}>
              {bootstrapResults.containsBreakeven ? 'Yes' : 'No'}
            </p>
            <p className="text-[10px] text-muted-foreground">33.3% threshold</p>
          </motion.div>

          <motion.div
            className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-xs text-muted-foreground">P-value</p>
            <p className={`text-lg font-bold font-mono ${bootstrapResults.pValue < 0.05 ? 'text-green-500' : bootstrapResults.pValue < 0.1 ? 'text-amber-500' : 'text-red-500'}`}>
              {bootstrapResults.pValue.toFixed(4)}
            </p>
            <p className="text-[10px] text-muted-foreground">P(WR ≥ 33.3%)</p>
          </motion.div>
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
          <span>Sample size: {data.recent_trades.length} trades</span>
          <span>Observed WR: {bootstrapResults.observedWR.toFixed(1)}%</span>
          <span>Bootstrap iterations: {iterations.toLocaleString()}</span>
        </div>

        {/* Interpretation Note */}
        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
          <p className="text-xs text-amber-500 font-medium">Interpretation</p>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
            {bootstrapResults.pValue < 0.05
              ? 'The observed win rate is significantly above the breakeven threshold (p < 0.05). The strategy shows statistical positive edge.'
              : bootstrapResults.pValue < 0.1
                ? 'Marginal evidence of positive edge (p < 0.1). More data needed for confidence.'
                : `The observed win rate (${bootstrapResults.observedWR.toFixed(1)}%) is NOT statistically above breakeven (33.3%). P-value of ${bootstrapResults.pValue.toFixed(4)} indicates the strategy's true win rate could easily be at or below breakeven.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ====== 4. PROFIT FACTOR CARD ======

export function ProfitFactorCard({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const pfData = useMemo(() => {
    const trades = data.recent_trades;
    if (trades.length === 0) {
      return {
        grossProfit: 0,
        grossLoss: 0,
        netPnL: 0,
        profitFactor: 0,
        recoveryFactor: 0,
        maxDrawdownPct: 0,
      };
    }

    // Gross Profit: sum of positive P&L weighted by win_prob for winning trades
    let grossProfit = 0;
    let grossLoss = 0;

    for (const trade of trades) {
      const winProb = trade.win_prob;
      if (winProb > 0) {
        // Probabilistic contribution
        grossProfit += Math.max(0, trade.pnl_pct) * winProb;
        grossLoss += Math.abs(Math.min(0, trade.pnl_pct)) * (1 - winProb);
      } else {
        // No positive probability — treat as loss
        grossLoss += Math.abs(trade.pnl_pct);
      }
      // Add loss contributions from trades with negative P&L
      if (trade.pnl_pct < 0 && winProb > 0) {
        grossLoss += Math.abs(trade.pnl_pct) * (1 - winProb);
      }
    }

    const netPnL = grossProfit - grossLoss;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max drawdown from equity curve
    const equityCurve = data.equity_curve;
    let maxDrawdown = 0;
    let peak = equityCurve.length > 0 ? equityCurve[0].equity : 0;
    for (const point of equityCurve) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = (peak - point.equity) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    const maxDrawdownPct = maxDrawdown * 100;

    // Recovery Factor = Net P&L / Max Drawdown
    const recoveryFactor = maxDrawdownPct > 0 ? (data.overall.total_return_pct) / maxDrawdownPct : 0;

    return { grossProfit, grossLoss, netPnL, profitFactor, recoveryFactor, maxDrawdownPct };
  }, [data]);

  // Color coding for profit factor
  const pfColor = pfData.profitFactor >= 1.5 ? COLORS.positive
    : pfData.profitFactor >= 1.0 ? COLORS.neutral
    : COLORS.negative;
  const pfLabel = pfData.profitFactor >= 2.0 ? 'Excellent'
    : pfData.profitFactor >= 1.5 ? 'Good'
    : pfData.profitFactor >= 1.0 ? 'Marginal'
    : 'Poor';

  // Animated profit factor display
  const animatedPF = useAnimatedNumber(Number.isFinite(pfData.profitFactor) ? pfData.profitFactor : 0, 2);

  // Gauge scale: 0 to 3.0
  const gaugeMax = 3.0;
  const pfClamped = Math.min(Math.max(pfData.profitFactor, 0), gaugeMax);
  const gaugePct = (pfClamped / gaugeMax) * 100;

  return (
    <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-green-500" />
        <div>
          <h3 className="font-semibold text-sm">Profit Factor Analysis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Gross profit vs gross loss ratio</p>
        </div>
      </div>

      {/* Large PF Display */}
      <div className="flex flex-col md:flex-row gap-5 items-center md:items-start">
        <motion.div
          className="flex flex-col items-center space-y-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="text-xs text-muted-foreground font-medium">Profit Factor</p>
          <motion.p
            className="text-5xl font-bold font-mono"
            style={{ color: pfColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {Number.isFinite(pfData.profitFactor) ? animatedPF : '∞'}
          </motion.p>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              backgroundColor: `${pfColor}20`,
              color: pfColor,
            }}
          >
            {pfLabel}
          </span>
        </motion.div>

        {/* Visual Gauge */}
        <div className="flex-1 w-full space-y-2">
          <div className="relative h-6 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? '#1e1e2e' : '#f3f4f6' }}>
            {/* Zone backgrounds */}
            <div className="absolute inset-0 flex">
              <div className="h-full" style={{ width: '33.3%', backgroundColor: `${COLORS.negative}15` }} />
              <div className="h-full" style={{ width: '16.7%', backgroundColor: `${COLORS.neutral}15` }} />
              <div className="h-full flex-1" style={{ backgroundColor: `${COLORS.positive}15` }} />
            </div>
            {/* Gauge fill */}
            <motion.div
              className="absolute top-0 bottom-0 left-0 rounded-full"
              style={{
                width: `${gaugePct}%`,
                background: `linear-gradient(to right, ${COLORS.negative}, ${COLORS.neutral}, ${COLORS.positive})`,
                opacity: 0.6,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${gaugePct}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            {/* 1.0 line (breakeven) */}
            <div
              className="absolute top-0 bottom-0 w-0.5 z-10"
              style={{ left: `${(1.0 / gaugeMax) * 100}%`, backgroundColor: COLORS.neutral }}
            />
          </div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>0</span>
            <span className="text-amber-500 font-medium">1.0 (Breakeven)</span>
            <span>1.5</span>
            <span>{gaugeMax.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <SectionDivider isDark={isDark} />

      {/* Breakdown Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Gross Profit</p>
          <p className="text-lg font-bold text-green-500 font-mono">+{pfData.grossProfit.toFixed(2)}%</p>
        </motion.div>

        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Gross Loss</p>
          <p className="text-lg font-bold text-red-500 font-mono">−{pfData.grossLoss.toFixed(2)}%</p>
        </motion.div>

        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Net P&L</p>
          <p className={`text-lg font-bold font-mono ${pfData.netPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {pfData.netPnL >= 0 ? '+' : ''}{pfData.netPnL.toFixed(2)}%
          </p>
        </motion.div>

        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Recovery Factor</p>
          <p className={`text-lg font-bold font-mono ${pfData.recoveryFactor >= 1 ? 'text-green-500' : pfData.recoveryFactor >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
            {pfData.recoveryFactor.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground">Return / Max DD</p>
        </motion.div>
      </div>

      {/* Methodology Note */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <p className="text-xs text-amber-500 font-medium">Calculation Note</p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
          Profit Factor uses probability-weighted P&amp;L: Gross Profit = Σ(max(0, pnl) × win_prob),
          Gross Loss = Σ(|min(0, pnl)| × (1 − win_prob)). Recovery Factor = Total Return / Max Drawdown.
          A PF &lt; 1.0 indicates the strategy loses more than it earns.
        </p>
      </div>
    </div>
  );
}
