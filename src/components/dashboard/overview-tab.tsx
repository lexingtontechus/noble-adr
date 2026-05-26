'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingDown, Clock, RefreshCw, Sliders, Shield, TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine, Legend,
  ComposedChart, Area, AreaChart
} from 'recharts';
import { motion } from 'framer-motion';
import type { BacktestData, EquityPoint, DrawdownInfo } from './types';
import { COLORS, LIGHT_CHART_COLORS, DARK_CHART_COLORS } from './constants';
import { ChartCard, SectionDivider, CustomChartTooltip } from './chart-card';

// ====== PERFORMANCE SCORE CARD ======

function PerformanceScoreCard({ data, drawdownPct, isDark = false }: {
  data: BacktestData;
  drawdownPct: number;
  isDark?: boolean;
}) {
  const wr = data.overall.win_rate;
  const exp = data.overall.expectancy;
  const kelly = data.overall.kelly_pct;

  // Calculate weighted score (0-100)
  // Win Rate component: 0-30 points (40% WR = max)
  const wrScore = Math.min(30, (wr / 40) * 30);
  // Expectancy component: 0-30 points
  const expScore = Math.max(0, Math.min(30, 15 + exp * 130));
  // Kelly component: 0-20 points
  const kellyScore = Math.max(0, Math.min(20, 10 + kelly * 0.9));
  // Drawdown component: 0-20 points (lower drawdown = higher score)
  const ddScore = Math.max(0, Math.min(20, 20 - drawdownPct * 0.5));

  const score = Math.round(Math.min(100, Math.max(0, wrScore + expScore + kellyScore + ddScore)));
  const scoreColor = score >= 60 ? '#22c55e' : score >= 30 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 60 ? 'Strong' : score >= 30 ? 'Moderate' : 'Weak';

  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col md:flex-row gap-4 items-center md:items-start">
      {/* Circular Score Indicator */}
      <div className={`rounded-xl border p-6 flex flex-col items-center ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
        <h3 className="font-semibold text-sm mb-4">Strategy Score</h3>
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            {/* Background ring */}
            <circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={isDark ? '#333' : '#e5e7eb'}
              strokeWidth="8"
            />
            {/* Animated progress ring */}
            <motion.circle
              cx="60" cy="60" r={radius}
              fill="none"
              stroke={scoreColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - score / 100) }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-3xl font-bold"
              style={{ color: scoreColor }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, duration: 0.3 }}
            >
              {score}
            </motion.span>
            <span className="text-xs text-muted-foreground">{scoreLabel}</span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className={`flex-1 rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
        <h3 className="font-semibold text-sm">Score Breakdown</h3>
        <div className="space-y-3">
          {[
            { label: 'Win Rate', weight: '30%', value: wrScore, max: 30, raw: `${wr}%`, color: wr >= 33.3 ? '#22c55e' : '#ef4444' },
            { label: 'Expectancy', weight: '30%', value: expScore, max: 30, raw: exp >= 0 ? `+${exp.toFixed(4)}` : exp.toFixed(4), color: exp >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Kelly %', weight: '20%', value: kellyScore, max: 20, raw: `${kelly}%`, color: kelly >= 0 ? '#22c55e' : '#ef4444' },
            { label: 'Max Drawdown', weight: '20%', value: ddScore, max: 20, raw: `${drawdownPct.toFixed(1)}%`, color: '#ef4444' },
          ].map(item => (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">({item.weight})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: item.color }} className="font-mono">{item.raw}</span>
                  <span className="text-muted-foreground">→ {Math.round(item.value)}/{item.max}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: item.color, opacity: 0.7 }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / item.max) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
          <span className="font-medium">Total Score</span>
          <span className="bold" style={{ color: scoreColor }}>{score}/100</span>
        </div>
      </div>
    </div>
  );
}

// ====== VOLATILITY REGIME INDICATOR ======

function VolatilityRegime({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const regimeData = useMemo(() => {
    const adrValues = data.recent_trades.map(t => t.adr_5);
    if (adrValues.length === 0) return { regime: 'Unknown', percentile: 0, currentAdr: 0, p33: 0, p67: 0 };

    const currentAdr = data.forecast.current_adr_5;
    const sorted = [...adrValues].sort((a, b) => a - b);
    const p33 = sorted[Math.floor(sorted.length * 0.33)];
    const p67 = sorted[Math.floor(sorted.length * 0.67)];

    const rank = sorted.filter(v => v <= currentAdr).length;
    const percentile = Math.round((rank / sorted.length) * 100);

    const regime = percentile <= 33 ? 'Low' : percentile <= 67 ? 'Normal' : 'High';

    return { regime, percentile, currentAdr, p33, p67 };
  }, [data]);

  const regimeColor = regimeData.regime === 'Low' ? '#06b6d4' : regimeData.regime === 'Normal' ? '#22c55e' : '#ef4444';
  const regimeBg = regimeData.regime === 'Low' ? 'rgba(6,182,212,0.1)' : regimeData.regime === 'Normal' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)';
  const implication = regimeData.regime === 'Low'
    ? 'Smaller ranges — tighter stops may work, fewer whipsaw losses'
    : regimeData.regime === 'Normal'
    ? 'Standard ADR quarter sizes apply — baseline strategy parameters'
    : 'Wider ranges — wider stops recommended, increased whipsaw risk';

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <svg className="h-4 w-4 text-cyan-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M2 12h20" />
        </svg>
        <div>
          <h3 className="font-semibold text-sm">Volatility Regime</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Current ADR₅ vs historical distribution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Gauge Visual */}
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="relative w-32 h-16 overflow-hidden">
            <svg viewBox="0 0 100 50" className="w-full h-full">
              {/* Background arc */}
              <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke={isDark ? '#333' : '#e5e7eb'} strokeWidth="8" strokeLinecap="round" />
              {/* Filled arc based on percentile */}
              <path
                d="M 10 45 A 40 40 0 0 1 90 45"
                fill="none"
                stroke={regimeColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${regimeData.percentile * 1.26} 126`}
              />
              {/* Zone markers */}
              <line x1="36" y1="15" x2="38" y2="19" stroke={isDark ? '#555' : '#9ca3af'} strokeWidth="1" />
              <line x1="64" y1="15" x2="62" y2="19" stroke={isDark ? '#555' : '#9ca3af'} strokeWidth="1" />
            </svg>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
              <p className="text-lg font-bold" style={{ color: regimeColor }}>{regimeData.percentile}{regimeData.percentile === 1 ? 'st' : regimeData.percentile === 2 ? 'nd' : regimeData.percentile === 3 ? 'rd' : (regimeData.percentile % 100 >= 11 && regimeData.percentile % 100 <= 13) ? 'th' : regimeData.percentile % 10 === 1 ? 'st' : regimeData.percentile % 10 === 2 ? 'nd' : regimeData.percentile % 10 === 3 ? 'rd' : 'th'}</p>
              <p className="text-[9px] text-muted-foreground">percentile</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Current Regime</p>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: regimeColor }} />
              <p className="text-lg font-bold" style={{ color: regimeColor }}>{regimeData.regime} Volatility</p>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Current ADR₅</p>
            <p className="text-lg font-bold font-mono">{regimeData.currentAdr.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">pts</span></p>
          </div>
        </div>

        {/* Thresholds & Implication */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Distribution Thresholds</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-cyan-500">Low (P33)</span><span className="font-mono">{regimeData.p33.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-green-500">Normal (P67)</span><span className="font-mono">{regimeData.p67.toLocaleString()}</span></div>
            </div>
          </div>
          <div className="rounded-lg p-3 space-y-1" style={{ backgroundColor: regimeBg }}>
            <p className="text-xs font-medium" style={{ color: regimeColor }}>Implication</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{implication}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== DAY OF WEEK PERFORMANCE CHART ======

function DayOfWeekChart({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const dayOfWeekData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats: Record<string, { wins: number; total: number }> = {
      Mon: { wins: 0, total: 0 },
      Tue: { wins: 0, total: 0 },
      Wed: { wins: 0, total: 0 },
      Thu: { wins: 0, total: 0 },
      Fri: { wins: 0, total: 0 },
    };

    data.recent_trades.forEach(trade => {
      try {
        const date = new Date(trade.date + 'T00:00:00');
        const dayName = days[date.getDay()];
        if (dayStats[dayName]) {
          dayStats[dayName].total++;
          dayStats[dayName].wins += trade.win_prob; // probabilistic win counting
        }
      } catch {
        // skip invalid dates
      }
    });

    return Object.entries(dayStats).map(([day, stats]) => ({
      day,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 1000) / 10 : 0,
      trades: stats.total,
      wins: stats.wins,
    }));
  }, [data]);

  return (
    <ChartCard title="Win Rate by Day of Week" subtitle="Performance breakdown across trading days" gradientFrom="cyan" gradientTo="green" isDark={isDark}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dayOfWeekData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke={cc.text} />
            <YAxis tick={{ fontSize: 10 }} stroke={cc.text} domain={[0, 50]} />
            <RechartsTooltip
              content={<CustomChartTooltip isDark={isDark} formatter={(value: number, name: string) => {
                if (name === 'winRate') return [`${value}%`, 'Win Rate'];
                return [String(value), name];
              }} labelFormatter={(label: string) => {
                const item = dayOfWeekData.find(d => d.day === label);
                return item ? `${label} (${item.trades} trades)` : label;
              }} />}
            />
            <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Breakeven 33.3%', position: 'right', fontSize: 10, fill: '#ef4444' }} />
            <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
              {dayOfWeekData.map((entry, index) => (
                <Cell key={index} fill={entry.winRate >= 33.3 ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-2">
        {dayOfWeekData.map(d => (
          <span key={d.day} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${d.winRate >= 33.3 ? 'bg-green-500' : 'bg-red-500'}`} />
            {d.day}: {d.winRate.toFixed(1)}% ({d.trades})
          </span>
        ))}
      </div>
    </ChartCard>
  );
}

// ====== TIME-OF-MONTH CHART ======

function TimeOfMonthChart({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const chartData = useMemo(() => {
    const weeks: Record<string, { wins: number; total: number }> = {
      'Week 1': { wins: 0, total: 0 },
      'Week 2': { wins: 0, total: 0 },
      'Week 3': { wins: 0, total: 0 },
      'Week 4+': { wins: 0, total: 0 },
    };

    data.recent_trades.forEach(t => {
      const day = new Date(t.date).getDate();
      const week = day <= 7 ? 'Week 1' : day <= 14 ? 'Week 2' : day <= 21 ? 'Week 3' : 'Week 4+';
      weeks[week].total++;
      weeks[week].wins += t.win_prob; // probabilistic win counting
    });

    return Object.entries(weeks).map(([name, { wins, total }]) => ({
      name,
      winRate: total > 0 ? Math.round((wins / total) * 1000) / 10 : 0,
      trades: total,
    }));
  }, [data]);

  return (
    <ChartCard title="Win Rate by Week of Month" subtitle="Performance across different weeks" gradientFrom="orange" gradientTo="cyan" isDark={isDark}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={cc.text} />
            <YAxis tick={{ fontSize: 10 }} stroke={cc.text} domain={[0, 50]} />
            <RechartsTooltip
              content={<CustomChartTooltip isDark={isDark} formatter={(value: number, name: string) => [name === 'winRate' ? `${value}%` : String(value), name === 'winRate' ? 'Win Rate' : 'Trades']} />}
            />
            <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '33.3%', position: 'right', fontSize: 9, fill: '#ef4444' }} />
            <Bar dataKey="winRate" name="winRate" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.winRate >= 33.3 ? COLORS.positive : COLORS.negative} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ====== STRATEGY PARAMETER PANEL ======

function StrategyParameterPanel({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const [rrRatio, setRrRatio] = useState(2.0);

  const params = useMemo(() => {
    const wr = data.overall.win_rate / 100; // Convert to decimal
    const breakevenWR = (1 / (1 + rrRatio)) * 100; // Breakeven WR for given R:R
    const gap = data.overall.win_rate - breakevenWR;
    const hasEdge = gap > 0;

    // Kelly Criterion: f* = (bp - q) / b
    // b = reward/risk ratio, p = win probability, q = 1 - p
    const kelly = ((rrRatio * wr) - (1 - wr)) / rrRatio;
    const kellyPct = Math.max(0, kelly * 100);

    return {
      breakevenWR: breakevenWR.toFixed(1),
      gap: gap.toFixed(1),
      hasEdge,
      kellyPct: kellyPct.toFixed(1),
      edgeLabel: hasEdge ? 'Positive Edge' : 'Negative Edge',
      edgeColor: hasEdge ? '#22c55e' : '#ef4444',
    };
  }, [data.overall.win_rate, rrRatio]);

  return (
    <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-cyan-500" />
        <div>
          <h3 className="font-semibold text-sm">Strategy Parameter Panel</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Adjust R:R ratio to explore edge dynamics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* R:R Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">Reward:Risk Ratio</span>
            <span className="text-lg font-bold font-mono text-cyan-500">{rrRatio.toFixed(2)}:1</span>
          </div>
          <input
            type="range"
            min={1}
            max={4}
            step={0.25}
            value={rrRatio}
            onChange={(e) => setRrRatio(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #06b6d4 ${((rrRatio - 1) / 3) * 100}%, ${isDark ? '#333' : '#e5e7eb'} ${((rrRatio - 1) / 3) * 100}%)`,
            }}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>1:1</span>
            <span>2:1</span>
            <span>3:1</span>
            <span>4:1</span>
          </div>
        </div>

        {/* Calculated Results */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}>
              <p className="text-[10px] text-muted-foreground">Breakeven WR</p>
              <p className="text-lg font-bold font-mono">{params.breakevenWR}%</p>
            </div>
            <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}>
              <p className="text-[10px] text-muted-foreground">Gap from Current</p>
              <p className="text-lg font-bold font-mono" style={{ color: params.hasEdge ? '#22c55e' : '#ef4444' }}>
                {Number(params.gap) > 0 ? '+' : ''}{params.gap}%
              </p>
            </div>
          </div>

          {/* Verdict */}
          <motion.div
            className={`rounded-lg border p-3 flex items-center gap-2 ${isDark ? 'border-white/10' : 'border-border'}`}
            style={{ backgroundColor: `${params.edgeColor}10`, borderColor: `${params.edgeColor}30` }}
            key={params.edgeLabel}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {params.hasEdge
              ? <CheckCircle className="h-4 w-4" style={{ color: params.edgeColor }} />
              : <AlertTriangle className="h-4 w-4" style={{ color: params.edgeColor }} />
            }
            <div>
              <p className="text-xs font-semibold" style={{ color: params.edgeColor }}>{params.edgeLabel}</p>
              <p className="text-[10px] text-muted-foreground">
                Current WR ({data.overall.win_rate}%) {params.hasEdge ? 'exceeds' : 'below'} breakeven ({params.breakevenWR}%)
              </p>
            </div>
          </motion.div>

          {/* Kelly Position Sizing */}
          <div className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-amber-500" />
              <p className="text-[10px] text-muted-foreground">Recommended Kelly Size</p>
            </div>
            <p className="text-lg font-bold font-mono" style={{ color: Number(params.kellyPct) > 0 ? '#22c55e' : '#ef4444' }}>
              {params.kellyPct}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {Number(params.kellyPct) > 0
                ? `Allocate ${params.kellyPct}% of capital per trade (half-Kelly: ${(Number(params.kellyPct) / 2).toFixed(1)}%)`
                : 'No position recommended — strategy lacks positive edge'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== TRADE OUTCOME WATERFALL CHART ======

function TradeWaterfallChart({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const waterfallData = useMemo(() => {
    const trades = data.recent_trades;
    const last20 = trades.slice(-20);

    // Build running equity array without mutation inside map
    const results: { tradeNum: string; contribution: number; runningEquity: number; isWin: boolean }[] = [];
    let equity = 0;

    for (let i = 0; i < last20.length; i++) {
      const trade = last20[i];
      const isWin = trade.win_prob > 0.5 || trade.pnl_pct > 0;
      const contribution = isWin ? Math.abs(trade.pnl_pct) : -Math.abs(trade.pnl_pct);
      equity += contribution;

      results.push({
        tradeNum: `#${i + 1}`,
        contribution,
        runningEquity: equity,
        isWin,
      });
    }

    return results;
  }, [data]);

  return (
    <ChartCard title="Trade Outcome Waterfall" subtitle="Sequential P&L contribution of last 20 trades" gradientFrom="green" gradientTo="red" isDark={isDark} badge={{ text: '20 trades', color: '#f59e0b' }}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waterfallData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
            <XAxis dataKey="tradeNum" tick={{ fontSize: 9 }} stroke={cc.text} />
            <YAxis tick={{ fontSize: 10 }} stroke={cc.text} label={{ value: 'P&L %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: cc.text }} />
            <RechartsTooltip
              content={<CustomChartTooltip isDark={isDark} formatter={(value: number, name: string) => {
                if (name === 'contribution') return [`${value > 0 ? '+' : ''}${value.toFixed(2)}%`, value > 0 ? 'Win' : 'Loss'];
                return [`${value.toFixed(2)}%`, 'Running Equity'];
              }} />}
            />
            <ReferenceLine y={0} stroke={cc.text} strokeDasharray="2 2" />
            <Bar dataKey="contribution" name="contribution" radius={[3, 3, 0, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={index} fill={entry.isWin ? '#22c55e' : '#ef4444'} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#22c55e' }} />
          <span>Win (TP hit)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#ef4444' }} />
          <span>Loss (SL hit)</span>
        </div>
      </div>
    </ChartCard>
  );
}

// ====== OVERVIEW TAB ======

export function OverviewTab({ data, levelChartData, quarterChartData, monthlyChartData, equitySampled, drawdownData, adrDistributionData, currentAdr5, isDark = false }: {
  data: BacktestData;
  levelChartData: { name: string; winRate: number; expectancy: number; kelly: number; trades: number; positive: boolean; direction: string }[];
  quarterChartData: { name: string; winRate: number; longWR: number; shortWR: number; expectancy: number; trades: number }[];
  monthlyChartData: { name: string; full: string; winRate: number; avgPnl: number; trades: number }[];
  equitySampled: EquityPoint[];
  drawdownData: DrawdownInfo;
  adrDistributionData: { range: string; count: number; midpoint: number }[];
  currentAdr5: number;
  isDark?: boolean;
}) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  return (
    <div className="space-y-6">
      {/* Performance Score Card */}
      <PerformanceScoreCard data={data} drawdownPct={drawdownData.maxDrawdownPct} isDark={isDark} />

      {/* Strategy Parameter Panel */}
      <StrategyParameterPanel data={data} isDark={isDark} />

      {/* Volatility Regime */}
      <VolatilityRegime data={data} isDark={isDark} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Win Rate by Level" subtitle="Breakeven threshold: 33.3% for 2:1 R:R" gradientFrom="cyan" gradientTo="purple" isDark={isDark} badge={{ text: `${data.level_breakdown.length} levels` }}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={cc.text} />
                <YAxis tick={{ fontSize: 10 }} stroke={cc.text} domain={[0, 40]} />
                <RechartsTooltip
                  content={<CustomChartTooltip isDark={isDark} formatter={(value: number) => [`${value}%`, 'Win Rate']} />}
                />
                <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" label={{ value: 'Breakeven 33.3%', position: 'right', fontSize: 10, fill: '#ef4444' }} />
                <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                  {levelChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.positive ? COLORS.positive : entry.direction === 'Long' ? COLORS.chart1 : COLORS.chart2} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Expectancy by Level" subtitle="Expected P&L per trade in ADR quarters" gradientFrom="purple" gradientTo="orange" isDark={isDark}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={levelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={cc.text} />
                <YAxis tick={{ fontSize: 10 }} stroke={cc.text} />
                <RechartsTooltip
                  content={<CustomChartTooltip isDark={isDark} formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(4)}`, 'Expectancy']} />}
                />
                <ReferenceLine y={0} stroke="#f59e0b" strokeDasharray="3 3" />
                <Bar dataKey="expectancy" radius={[4, 4, 0, 0]}>
                  {levelChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.expectancy >= 0 ? COLORS.positive : COLORS.negative} fillOpacity={0.8} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Long vs Short Win Rate by Quarter" subtitle="Comparing directional performance" gradientFrom="green" gradientTo="red" isDark={isDark}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke={cc.text} />
                <YAxis tick={{ fontSize: 10 }} stroke={cc.text} domain={[0, 35]} />
                <RechartsTooltip
                  content={<CustomChartTooltip isDark={isDark} />}
                />
                <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" />
                <Bar dataKey="longWR" name="Long" fill={COLORS.up} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
                <Bar dataKey="shortWR" name="Short" fill={COLORS.down} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Monthly Win Rate Trend" subtitle="Strategy performance over time" gradientFrom="cyan" gradientTo="amber" isDark={isDark}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke={cc.text} interval={1} />
                <YAxis tick={{ fontSize: 10 }} stroke={cc.text} domain={[0, 50]} />
                <RechartsTooltip
                  content={<CustomChartTooltip isDark={isDark} labelFormatter={(label: string) => {
                    const item = monthlyChartData.find(m => m.name === label);
                    return item?.full || label;
                  }} />}
                />
                <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '33.3%', position: 'right', fontSize: 9, fill: '#ef4444' }} />
                <Area type="monotone" dataKey="winRate" stroke={COLORS.chart1} fill={COLORS.chart1} fillOpacity={0.1} strokeWidth={2} name="Win Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Day of Week Performance */}
      <DayOfWeekChart data={data} isDark={isDark} />

      {/* Time of Month Chart */}
      <TimeOfMonthChart data={data} isDark={isDark} />

      <SectionDivider isDark={isDark} />

      {/* Trade Outcome Waterfall Chart */}
      <TradeWaterfallChart data={data} isDark={isDark} />

      {/* Equity Curve */}
      <ChartCard title="Equity Curve (2% Risk Per Trade)" subtitle="Starting capital: $10,000" gradientFrom="amber" gradientTo="red" isDark={isDark}>
        <div className="flex items-center justify-between mb-2">
          <div />
          <div className="text-right">
            <p className="text-lg font-bold text-red-500">
              ${data.overall.final_equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-500">{data.overall.total_return_pct}% return</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={equitySampled} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke={cc.text} interval={Math.floor(equitySampled.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} stroke={cc.text} domain={[0, 12000]} />
              <RechartsTooltip
                content={<CustomChartTooltip isDark={isDark} formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']} />}
              />
              <ReferenceLine y={10000} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Start: $10K', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
              <Area type="monotone" dataKey="equity" stroke={COLORS.negative} fill={COLORS.negative} fillOpacity={0.05} strokeWidth={1.5} />
              <Line type="monotone" dataKey="equity" stroke={COLORS.negative} strokeWidth={1.5} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <SectionDivider isDark={isDark} />

      {/* Drawdown Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Max Drawdown</span>
          </div>
          <p className="text-2xl font-bold text-red-500">{drawdownData.maxDrawdownPct.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Maximum peak-to-trough decline</p>
        </motion.div>

        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Drawdown Duration</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">{drawdownData.maxDrawdownDuration}</p>
          <p className="text-xs text-muted-foreground">trades in max drawdown</p>
        </motion.div>

        <motion.div
          className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10 glassmorphism-card' : 'border-border bg-card'}`}
          whileHover={{ scale: 1.01, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-cyan-500/10 flex items-center justify-center">
              <RefreshCw className="h-4 w-4 text-cyan-500" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">Recovery Time</span>
          </div>
          <p className="text-2xl font-bold text-cyan-500">{drawdownData.recoveryTime > 0 ? drawdownData.recoveryTime : 'Never'}</p>
          <p className="text-xs text-muted-foreground">{drawdownData.recoveryTime > 0 ? 'trades to recover' : 'equity never recovered'}</p>
        </motion.div>
      </div>

      {/* Drawdown Curve */}
      <ChartCard title="Drawdown Curve" subtitle="Peak-to-trough decline percentage over time" gradientFrom="red" gradientTo="amber" isDark={isDark}>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={drawdownData.drawdownCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke={cc.text} interval={Math.floor(drawdownData.drawdownCurve.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} stroke={cc.text} />
              <RechartsTooltip
                content={<CustomChartTooltip isDark={isDark} formatter={(value: number) => [`${Math.abs(value).toFixed(1)}%`, 'Drawdown']} />}
              />
              <ReferenceLine y={0} stroke={cc.text} strokeDasharray="2 2" />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <SectionDivider isDark={isDark} />

      {/* ADR Distribution Chart */}
      <ChartCard title="ADR₅ Distribution" subtitle="Histogram of 5-day ADR values (current vs historical)" gradientFrom="cyan" gradientTo="green" isDark={isDark} badge={{ text: `${adrDistributionData.length} buckets` }}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={adrDistributionData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="range" tick={{ fontSize: 9 }} stroke={cc.text} />
              <YAxis tick={{ fontSize: 10 }} stroke={cc.text} />
              <RechartsTooltip
                content={<CustomChartTooltip isDark={isDark} formatter={(value: number) => [`${value} trades`, 'Count']} labelFormatter={(label: string) => `ADR: ${label} pts`} />}
              />
              {currentAdr5 > 0 && (
                <ReferenceLine
                  x={String(Math.round(currentAdr5))}
                  stroke="#8b5cf6"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{ value: `Current: ${currentAdr5.toLocaleString()}`, position: 'top', fontSize: 10, fill: '#8b5cf6' }}
                />
              )}
              <Bar dataKey="count" fill="#06b6d4" radius={[3, 3, 0, 0]} fillOpacity={0.7} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
