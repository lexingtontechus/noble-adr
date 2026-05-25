'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Play, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Cell, AreaChart, Area
} from 'recharts';
import { COLORS, LIGHT_CHART_COLORS, DARK_CHART_COLORS } from './constants';
import type { BacktestData } from './types';

// Simple seeded PRNG for reproducibility
function mulberry32(seed: number) {
  return function() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function MonteCarloSimulation({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const [simCount, setSimCount] = useState(500);
  const [simRunning, setSimRunning] = useState(false);
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const simResults = useMemo(() => {
    const winRate = data.overall.win_rate / 100;
    const rr = 2;
    const riskPerTrade = 0.02;
    const startingEquity = 10000;
    const tradesPerSim = data.overall.total_trades;

    const finalEquities: number[] = [];
    const paths: number[][] = [];

    // Run simulations
    const rng = mulberry32(42);
    for (let sim = 0; sim < simCount; sim++) {
      let equity = startingEquity;
      const path = [equity];
      for (let t = 0; t < tradesPerSim; t++) {
        if (equity <= 0) break;
        const riskAmount = equity * riskPerTrade;
        const isWin = rng() < winRate;
        if (isWin) {
          equity += riskAmount * rr;
        } else {
          equity -= riskAmount;
        }
        equity = Math.max(0, equity);
        path.push(equity);
      }
      finalEquities.push(equity);
      if (sim < 20) paths.push(path); // Save first 20 paths for visualization
    }

    // Calculate statistics
    finalEquities.sort((a, b) => a - b);
    const p5 = finalEquities[Math.floor(simCount * 0.05)];
    const p25 = finalEquities[Math.floor(simCount * 0.25)];
    const p50 = finalEquities[Math.floor(simCount * 0.50)];
    const p75 = finalEquities[Math.floor(simCount * 0.75)];
    const p95 = finalEquities[Math.floor(simCount * 0.95)];
    const mean = finalEquities.reduce((a, b) => a + b, 0) / simCount;
    const ruined = finalEquities.filter(e => e <= 0).length;
    const ruinPct = Math.round((ruined / simCount) * 100);
    const profitable = finalEquities.filter(e => e > startingEquity).length;
    const profitPct = Math.round((profitable / simCount) * 100);

    // Distribution histogram
    const minE = finalEquities[0];
    const maxE = finalEquities[finalEquities.length - 1];
    const bucketCount = 20;
    const bucketSize = Math.max((maxE - minE) / bucketCount, 1);
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `$${Math.round(minE + i * bucketSize).toLocaleString()}`,
      count: 0,
      midpoint: minE + (i + 0.5) * bucketSize,
    }));
    finalEquities.forEach(e => {
      const idx = Math.min(Math.floor((e - minE) / bucketSize), bucketCount - 1);
      if (idx >= 0) buckets[idx].count++;
    });

    // Sample paths for chart (use every Nth point)
    const samplePaths = paths.map(path => {
      const step = Math.max(1, Math.floor(path.length / 100));
      return path.filter((_, i) => i % step === 0 || i === path.length - 1);
    });

    return {
      p5, p25, p50, p75, p95, mean,
      ruinPct, profitPct,
      buckets,
      samplePaths,
      startingEquity,
    };
  }, [data, simCount]);

  const percentileData = [
    { label: '5th', value: simResults.p5, color: '#ef4444' },
    { label: '25th', value: simResults.p25, color: '#f97316' },
    { label: '50th', value: simResults.p50, color: '#f59e0b' },
    { label: '75th', value: simResults.p75, color: '#22c55e' },
    { label: '95th', value: simResults.p95, color: '#06b6d4' },
  ];

  return (
    <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-500" />
          <div>
            <h3 className="font-semibold text-sm">Monte Carlo Simulation</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Random walk simulation based on observed win rate and R:R ratio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={simCount}
            onChange={(e) => setSimCount(Number(e.target.value))}
            className="text-xs border border-border rounded-md px-2 py-1 bg-card"
          >
            <option value={100}>100 sims</option>
            <option value={500}>500 sims</option>
            <option value={1000}>1,000 sims</option>
          </select>
        </div>
      </div>

      {/* Key Outcome Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Ruin Probability</p>
          <p className="text-xl font-bold text-red-500">{simResults.ruinPct}%</p>
          <p className="text-[10px] text-muted-foreground">Equity → $0</p>
        </motion.div>
        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Profitable Sims</p>
          <p className="text-xl font-bold text-green-500">{simResults.profitPct}%</p>
          <p className="text-[10px] text-muted-foreground">Equity &gt; $10K</p>
        </motion.div>
        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Median Outcome</p>
          <p className="text-xl font-bold font-mono">${simResults.p50.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground">50th percentile</p>
        </motion.div>
        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.15 }}
        >
          <p className="text-xs text-muted-foreground">Best Case (P95)</p>
          <p className="text-xl font-bold font-mono text-cyan-500">${simResults.p95.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-[10px] text-muted-foreground">95th percentile</p>
        </motion.div>
      </div>

      {/* Distribution Chart */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Final Equity Distribution</h4>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={simResults.buckets} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="range" tick={{ fontSize: 8 }} stroke={cc.text} interval={2} />
              <YAxis tick={{ fontSize: 9 }} stroke={cc.text} />
              <RechartsTooltip
                contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '11px', color: isDark ? '#e0e0e0' : undefined }}
                formatter={(value: number) => [`${value} sims`, 'Count']}
              />
              <ReferenceLine x={simResults.buckets.findIndex(b => b.midpoint <= simResults.startingEquity && b.midpoint + (simResults.buckets[1]?.midpoint - simResults.buckets[0]?.midpoint) > simResults.startingEquity)} stroke="#f59e0b" strokeDasharray="3 3" />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {simResults.buckets.map((entry, index) => (
                  <Cell key={index} fill={entry.midpoint >= simResults.startingEquity ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Percentile Table */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground mb-2">Outcome Percentiles</h4>
        <div className="grid grid-cols-5 gap-2">
          {percentileData.map(p => (
            <div key={p.label} className="text-center space-y-1">
              <p className="text-[10px] text-muted-foreground">{p.label}</p>
              <p className="text-sm font-bold font-mono" style={{ color: p.color }}>
                ${p.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Methodology Note */}
      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
        <p className="text-xs text-amber-500 font-medium">Methodology</p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
          Each simulation runs {data.overall.total_trades.toLocaleString()} trades using the observed {data.overall.win_rate}% win rate and 2:1 R:R.
          Each trade risks 2% of current equity. Results show the distribution of possible outcomes,
          not predictions. The high ruin rate ({simResults.ruinPct}%) reflects the negative expectancy of the base strategy.
        </p>
      </div>
    </div>
  );
}
