'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
  Legend,
} from 'recharts';
import { TrendingUp, Shield, Activity } from 'lucide-react';
import type { BacktestData } from './types';
import { COLORS, LIGHT_CHART_COLORS, DARK_CHART_COLORS } from './constants';
import { ChartCard, SectionDivider } from './chart-card';

// ====== 1. RISK-ADJUSTED METRICS ======

export function RiskAdjustedMetrics({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const metrics = useMemo(() => {
    const equityCurve = data.equity_curve;

    if (equityCurve.length < 2) {
      return {
        sharpe: 0,
        sortino: 0,
        calmar: 0,
        annReturn: 0,
        maxDrawdown: 0,
      };
    }

    // Calculate daily returns from equity curve
    const dailyReturns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      dailyReturns.push(equityCurve[i].equity / equityCurve[i - 1].equity - 1);
    }

    if (dailyReturns.length === 0) {
      return { sharpe: 0, sortino: 0, calmar: 0, annReturn: 0, maxDrawdown: 0 };
    }

    // Mean daily return
    const meanReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;

    // Standard deviation of returns
    const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length;
    const stdDev = Math.sqrt(variance);

    // Risk-free rate: 5% annualized => daily
    const riskFreeDaily = 0.05 / 252;

    // Sharpe Ratio (annualized)
    const dailySharpe = stdDev > 0 ? (meanReturn - riskFreeDaily) / stdDev : 0;
    const sharpe = dailySharpe * Math.sqrt(252);

    // Sortino Ratio: use only negative returns for downside deviation
    const negativeReturns = dailyReturns.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length
      : 0;
    const downsideDev = Math.sqrt(downsideVariance);
    const dailySortino = downsideDev > 0 ? (meanReturn - riskFreeDaily) / downsideDev : 0;
    const sortino = dailySortino * Math.sqrt(252);

    // Annualized return
    const totalDays = equityCurve.length;
    const totalReturn = equityCurve[equityCurve.length - 1].equity / equityCurve[0].equity - 1;
    const years = totalDays / 252;
    const annReturn = years > 0 ? (Math.pow(1 + totalReturn, 1 / years) - 1) * 100 : 0;

    // Max drawdown
    let peak = equityCurve[0].equity;
    let maxDrawdown = 0;
    for (const point of equityCurve) {
      if (point.equity > peak) peak = point.equity;
      const drawdown = (peak - point.equity) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    const maxDrawdownPct = maxDrawdown * 100;

    // Calmar Ratio
    const calmar = maxDrawdownPct > 0 ? annReturn / maxDrawdownPct : 0;

    return { sharpe, sortino, calmar, annReturn, maxDrawdown: maxDrawdownPct };
  }, [data]);

  // Color coding: green > 1, amber 0-1, red < 0
  const getColor = (value: number) => {
    if (value > 1) return COLORS.positive;
    if (value > 0) return COLORS.neutral;
    return COLORS.negative;
  };

  const getInterpretation = (name: string, value: number) => {
    if (name === 'sharpe') {
      if (value > 2) return 'Excellent risk-adjusted returns';
      if (value > 1) return 'Good risk-adjusted returns';
      if (value > 0) return 'Positive but low risk-adjusted returns';
      return 'Negative risk-adjusted returns — strategy loses money';
    }
    if (name === 'sortino') {
      if (value > 2) return 'Excellent downside risk management';
      if (value > 1) return 'Good downside risk management';
      if (value > 0) return 'Moderate downside risk';
      return 'Poor downside risk — losses outweigh gains';
    }
    if (name === 'calmar') {
      if (value > 3) return 'Excellent return relative to drawdown';
      if (value > 1) return 'Good return relative to drawdown';
      if (value > 0) return 'Modest return vs drawdown risk';
      return 'Negative returns with significant drawdown';
    }
    return '';
  };

  const metricCards = [
    {
      name: 'Sharpe Ratio',
      value: metrics.sharpe,
      key: 'sharpe',
      icon: TrendingUp,
      formula: '(Mean Return − Rf) / σ',
      description: 'Risk-adjusted return per unit of total volatility. Uses daily equity returns, annualized with √252.',
    },
    {
      name: 'Sortino Ratio',
      value: metrics.sortino,
      key: 'sortino',
      icon: Shield,
      formula: '(Mean Return − Rf) / σ↓',
      description: 'Like Sharpe but penalizes only downside volatility. More relevant when returns are not normally distributed.',
    },
    {
      name: 'Calmar Ratio',
      value: metrics.calmar,
      key: 'calmar',
      icon: Activity,
      formula: 'Annualized Return / Max DD',
      description: 'Return per unit of maximum drawdown risk. Measures how efficiently the strategy uses its worst-case loss.',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metricCards.map((metric, idx) => {
          const color = getColor(metric.value);
          const interpretation = getInterpretation(metric.key, metric.value);
          const Icon = metric.icon;

          return (
            <motion.div
              key={metric.key}
              className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{metric.name}</span>
              </div>

              <motion.p
                className="text-3xl font-bold font-mono"
                style={{ color }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + idx * 0.1 }}
              >
                {metric.value.toFixed(2)}
              </motion.p>

              <p className="text-xs text-muted-foreground">{interpretation}</p>

              <div className="pt-2 border-t border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-mono" style={{ color }}>{metric.formula}</span>
                  {' · '}Rf = 5% annualized
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Methodology Note */}
      <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <h4 className="text-xs font-semibold">Risk-Adjusted Metrics Methodology</h4>
        <div className="space-y-1 text-[10px] text-muted-foreground leading-relaxed">
          <p><span className="font-medium text-foreground">Sharpe Ratio:</span> (Mean daily return − risk-free rate) / standard deviation of daily returns, annualized by √252. Risk-free rate assumed at 5% annualized (0.05/252 daily). Values &gt;1 indicate excess returns above risk-free per unit of total risk.</p>
          <p><span className="font-medium text-foreground">Sortino Ratio:</span> Same as Sharpe but divides by downside deviation only (std dev of negative returns). Better for strategies with asymmetric return distributions. Uses all observations in the denominator (not just negative count) for consistency.</p>
          <p><span className="font-medium text-foreground">Calmar Ratio:</span> Annualized compound return / maximum drawdown percentage. Higher values indicate the strategy generates more return per unit of worst-case risk. Calmar &lt;0 means negative annualized return.</p>
        </div>
      </div>
    </div>
  );
}

// ====== 2. TRADE CALENDAR HEATMAP ======

interface DayCell {
  date: string;
  dayOfWeek: number; // 0=Mon, 6=Sun
  weekIndex: number;
  netPnl: number;
  tradeCount: number;
  isProfitable: boolean | null; // null = no trades
}

export function TradeCalendarHeatmap({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const [hoveredCell, setHoveredCell] = useState<DayCell | null>(null);

  const calendarData = useMemo(() => {
    const trades = data.recent_trades;
    if (trades.length === 0) return { cells: [] as DayCell[], weekCount: 0 };

    // Aggregate trades by date
    const dateMap: Record<string, { netPnl: number; tradeCount: number }> = {};
    for (const trade of trades) {
      const date = trade.date;
      if (!dateMap[date]) {
        dateMap[date] = { netPnl: 0, tradeCount: 0 };
      }
      // Probability-weighted P&L
      dateMap[date].netPnl += trade.pnl_pct * trade.win_prob;
      dateMap[date].tradeCount++;
    }

    // Generate last 12 weeks of dates
    const today = new Date();
    const cells: DayCell[] = [];
    const weekCount = 12;

    // Start from 12 weeks ago, Monday
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (weekCount * 7) - ((today.getDay() + 6) % 7) + 1);

    for (let w = 0; w < weekCount; w++) {
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + w * 7 + d);
        const dateStr = cellDate.toISOString().split('T')[0];
        const dayOfWeek = d; // 0=Mon, 6=Sun
        const dateInfo = dateMap[dateStr];

        cells.push({
          date: dateStr,
          dayOfWeek,
          weekIndex: w,
          netPnl: dateInfo?.netPnl ?? 0,
          tradeCount: dateInfo?.tradeCount ?? 0,
          isProfitable: dateInfo ? (dateInfo.netPnl > 0 ? true : false) : null,
        });
      }
    }

    return { cells, weekCount };
  }, [data]);

  const { cells, weekCount } = calendarData;

  // Get the max absolute P&L for intensity scaling
  const maxPnl = useMemo(() => {
    const activeCells = cells.filter(c => c.isProfitable !== null);
    if (activeCells.length === 0) return 1;
    return Math.max(...activeCells.map(c => Math.abs(c.netPnl)), 0.01);
  }, [cells]);

  const getCellColor = (cell: DayCell) => {
    if (cell.isProfitable === null) {
      return isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    }
    const intensity = Math.min(Math.abs(cell.netPnl) / maxPnl, 1);
    if (cell.isProfitable) {
      // Green shades
      const alpha = 0.15 + intensity * 0.65;
      return `rgba(34, 197, 94, ${alpha})`;
    } else {
      // Red shades
      const alpha = 0.15 + intensity * 0.65;
      return `rgba(239, 68, 68, ${alpha})`;
    }
  };

  const getCellBorder = (cell: DayCell) => {
    if (cell.isProfitable === null) return isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    return cell.isProfitable ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)';
  };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Get week labels (month names)
  const getWeekLabel = (weekIndex: number) => {
    const firstDay = cells[weekIndex * 7];
    if (!firstDay) return '';
    const date = new Date(firstDay.date + 'T12:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <ChartCard title="Trade Calendar Heatmap" subtitle="Trading activity over the last 12 weeks — color intensity reflects P&L magnitude" gradientFrom="green" gradientTo="cyan" isDark={isDark}>
      <div className="space-y-3">
        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Day labels header */}
            <div className="flex gap-0.5 mb-1">
              <div className="w-10 shrink-0" /> {/* spacer for week labels */}
              {dayLabels.map(day => (
                <div key={day} className="flex-1 text-center text-[9px] text-muted-foreground font-medium py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Week rows */}
            {Array.from({ length: weekCount }, (_, w) => (
              <div key={w} className="flex gap-0.5 mb-0.5">
                <div className="w-10 shrink-0 flex items-center text-[8px] text-muted-foreground pr-1">
                  {w % 2 === 0 ? getWeekLabel(w) : ''}
                </div>
                {Array.from({ length: 7 }, (_, d) => {
                  const cell = cells[w * 7 + d];
                  if (!cell) return <div key={d} className="flex-1 h-8" />;

                  const isWeekend = d >= 5;
                  const isToday = cell.date === new Date().toISOString().split('T')[0];

                  return (
                    <motion.div
                      key={d}
                      className="flex-1 h-8 rounded-sm cursor-pointer relative flex items-center justify-center text-[8px]"
                      style={{
                        backgroundColor: isWeekend
                          ? (isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)')
                          : getCellColor(cell),
                        border: isToday ? '1.5px solid #06b6d4' : `1px solid ${getCellBorder(cell)}`,
                      }}
                      whileHover={{ scale: 1.1 }}
                      onMouseEnter={() => setHoveredCell(cell)}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {cell.tradeCount > 0 && (
                        <span className="font-medium" style={{ color: cell.isProfitable ? '#22c55e' : '#ef4444' }}>
                          {cell.tradeCount}
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredCell && hoveredCell.isProfitable !== null && (
          <motion.div
            className={`rounded-lg border p-2 text-xs ${isDark ? 'bg-white/10 border-white/20' : 'bg-card border-border'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{hoveredCell.date}</span>
              <span style={{ color: hoveredCell.isProfitable ? COLORS.positive : COLORS.negative }}>
                {hoveredCell.isProfitable ? 'Profitable' : 'Losing'} day
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1 text-[10px] text-muted-foreground">
              <span>Trades: {hoveredCell.tradeCount}</span>
              <span>Net P&L: <span style={{ color: hoveredCell.isProfitable ? COLORS.positive : COLORS.negative }}>
                {hoveredCell.netPnl > 0 ? '+' : ''}{hoveredCell.netPnl.toFixed(2)}%
              </span></span>
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.5)' }} />
            <span className="text-[10px] text-muted-foreground">Profitable Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.5)' }} />
            <span className="text-[10px] text-muted-foreground">Losing Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: '1px solid rgba(128,128,128,0.2)' }} />
            <span className="text-[10px] text-muted-foreground">No Trades</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm" style={{ border: '1.5px solid #06b6d4' }} />
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>

        {/* Intensity legend */}
        <div className="flex items-center justify-center gap-1">
          <span className="text-[9px] text-muted-foreground">Less</span>
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }} />
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.35)' }} />
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.55)' }} />
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.8)' }} />
          <span className="text-[9px] text-muted-foreground">More</span>
          <span className="text-[9px] text-muted-foreground mx-2">|</span>
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }} />
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.35)' }} />
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.55)' }} />
          <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)' }} />
          <span className="text-[9px] text-muted-foreground">More</span>
        </div>
      </div>
    </ChartCard>
  );
}

// ====== 3. RUNNING METRICS TIMELINE ======

interface RollingPoint {
  tradeNumber: number;
  rollingWinRate: number;
  rollingExpectancy: number;
}

export function RunningMetricsTimeline({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const chartData = useMemo(() => {
    const trades = data.recent_trades;
    const windowSize = 50;

    if (trades.length < windowSize) {
      // If not enough trades, use all available with smaller window
      const minWindow = Math.max(10, Math.floor(trades.length / 3));
      if (trades.length < minWindow) return [];

      const points: RollingPoint[] = [];
      for (let i = minWindow; i <= trades.length; i++) {
        const window = trades.slice(i - minWindow, i);
        const wins = window.reduce((sum, t) => sum + t.win_prob, 0);
        const wr = (wins / window.length) * 100;
        const exp = window.reduce((sum, t) => sum + t.pnl_pct, 0) / window.length;
        points.push({
          tradeNumber: i,
          rollingWinRate: Math.round(wr * 100) / 100,
          rollingExpectancy: Math.round(exp * 1000) / 1000,
        });
      }
      return points;
    }

    const points: RollingPoint[] = [];
    for (let i = windowSize; i <= trades.length; i++) {
      const window = trades.slice(i - windowSize, i);
      const wins = window.reduce((sum, t) => sum + t.win_prob, 0);
      const wr = (wins / window.length) * 100;
      const exp = window.reduce((sum, t) => sum + t.pnl_pct, 0) / window.length;
      points.push({
        tradeNumber: i,
        rollingWinRate: Math.round(wr * 100) / 100,
        rollingExpectancy: Math.round(exp * 1000) / 1000,
      });
    }
    return points;
  }, [data]);

  const windowSize = data.recent_trades.length >= 50 ? 50 : Math.max(10, Math.floor(data.recent_trades.length / 3));

  return (
    <ChartCard
      title="Rolling Metrics Timeline"
      subtitle={`Rolling ${windowSize}-trade window: Win Rate & Expectancy evolution`}
      gradientFrom="cyan"
      gradientTo="purple"
      isDark={isDark}
    >
      <div className="h-72">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis
                dataKey="tradeNumber"
                tick={{ fontSize: 10 }}
                stroke={cc.text}
                label={{ value: 'Trade #', position: 'insideBottom', offset: -2, fontSize: 10, fill: cc.text }}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10 }}
                stroke={cc.text}
                label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: cc.text }}
                domain={['auto', 'auto']}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10 }}
                stroke={cc.text}
                label={{ value: 'Expectancy (Q)', angle: 90, position: 'insideRight', offset: 10, fontSize: 10, fill: cc.text }}
                domain={['auto', 'auto']}
              />
              <RechartsTooltip
                contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
                formatter={(value: number, name: string) => {
                  if (name === 'rollingWinRate') return [`${value.toFixed(1)}%`, 'Rolling Win Rate'];
                  if (name === 'rollingExpectancy') return [`${value.toFixed(4)}`, 'Rolling Expectancy'];
                  return [value, name];
                }}
                labelFormatter={(label: number) => `Trade #${label}`}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <ReferenceLine
                yAxisId="left"
                y={33.3}
                stroke={COLORS.neutral}
                strokeDasharray="6 3"
                strokeWidth={1.5}
                label={{ value: 'Breakeven WR (33.3%)', position: 'insideTopRight', fontSize: 9, fill: COLORS.neutral }}
              />
              <ReferenceLine
                yAxisId="right"
                y={0}
                stroke={cc.text}
                strokeDasharray="4 2"
                strokeWidth={1}
                label={{ value: 'Breakeven Exp', position: 'insideTopLeft', fontSize: 9, fill: cc.text }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="rollingWinRate"
                name="rollingWinRate"
                stroke={COLORS.chart1}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: COLORS.chart1 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rollingExpectancy"
                name="rollingExpectancy"
                stroke={COLORS.chart3}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: COLORS.chart3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            Insufficient trade data for rolling analysis (need at least {windowSize} trades)
          </div>
        )}
      </div>

      <SectionDivider isDark={isDark} />

      {/* Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.chart1 }} />
            <p className="text-xs text-muted-foreground font-medium">Rolling Win Rate</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Probability-weighted win rate over a sliding {windowSize}-trade window. Values consistently below the 33.3% breakeven line (dashed amber) indicate the strategy lacks a positive edge at any point during the backtest.
          </p>
        </motion.div>

        <motion.div
          className={`rounded-lg border p-3 space-y-1 ${isDark ? 'border-white/10' : 'border-border'}`}
          whileHover={{ scale: 1.01 }}
          transition={{ duration: 0.15 }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS.chart3 }} />
            <p className="text-xs text-muted-foreground font-medium">Rolling Expectancy</p>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Average P&L per trade over the same sliding window. Values below the zero line (dashed) indicate net losing periods. This metric captures both win rate and magnitude of wins/losses.
          </p>
        </motion.div>
      </div>
    </ChartCard>
  );
}
