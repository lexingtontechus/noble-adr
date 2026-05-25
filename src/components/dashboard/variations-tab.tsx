'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Zap, Calculator
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, ReferenceLine, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import type { BacktestData, VariationResult } from './types';
import { COLORS, LIGHT_CHART_COLORS, DARK_CHART_COLORS } from './constants';
import { ChartCard, CustomChartTooltip } from './chart-card';
import { Slider } from '@/components/ui/slider';
import { MonteCarloSimulation } from './monte-carlo';

// ====== R:R OPTIMIZER CALCULATOR ======

function RROptimizer({ isDark = false }: { isDark?: boolean }) {
  const currentWR = 22.1;
  const [rrRatio, setRrRatio] = useState(2.0);
  const breakevenWR = Math.round((1 / (1 + rrRatio)) * 1000) / 10;
  const gap = Math.round((currentWR - breakevenWR) * 10) / 10;
  const minRRNeeded = Math.round((1 / (currentWR / 100) - 1) * 100) / 100;

  return (
    <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-amber-500" />
        <div>
          <h3 className="font-semibold text-sm">R:R Ratio Optimizer</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Find the minimum R:R ratio needed for profitability</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Slider & Controls */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Risk:Reward Ratio: {rrRatio.toFixed(2)}:1
            </label>
            <Slider
              value={[rrRatio]}
              onValueChange={(v) => setRrRatio(v[0])}
              min={0.5}
              max={4}
              step={0.25}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.5:1</span>
              <span>4:1</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Breakeven WR</p>
              <p className={`text-lg font-bold font-mono ${breakevenWR <= currentWR ? 'text-green-500' : 'text-red-500'}`}>
                {breakevenWR}%
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="text-xs text-muted-foreground">Gap to Current WR</p>
              <p className={`text-lg font-bold font-mono ${gap >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {gap >= 0 ? '+' : ''}{gap}%
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
            <p className="text-xs font-medium text-amber-500">Minimum R:R Needed</p>
            <p className="text-lg font-bold font-mono">{minRRNeeded}:1</p>
            <p className="text-[10px] text-muted-foreground">
              With {currentWR}% WR, you need at least {minRRNeeded}:1 R:R to break even
            </p>
          </div>
        </div>

        {/* Visual Gauge */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Current WR vs Breakeven WR</p>
          <div className="space-y-2">
            <div className="relative h-5 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (currentWR / 60) * 100)}%`,
                  backgroundColor: currentWR >= breakevenWR ? '#22c55e' : '#ef4444',
                  opacity: 0.6,
                }}
              />
              <div
                className="absolute inset-y-0 w-0.5 transition-all duration-300"
                style={{
                  left: `${Math.min(100, (breakevenWR / 60) * 100)}%`,
                  backgroundColor: '#f59e0b',
                }}
              />
              <span
                className="absolute text-[10px] font-bold z-10"
                style={{
                  left: `${Math.min((currentWR / 60) * 100, 85)}%`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: currentWR >= breakevenWR ? '#22c55e' : '#ef4444',
                }}
              >
                {currentWR}%
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span className="text-amber-500 font-medium">Breakeven: {breakevenWR}%</span>
              <span>60%</span>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-xs font-medium text-muted-foreground">R:R Impact Analysis</p>
            {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4].map(rr => {
              const beWR = Math.round((1 / (1 + rr)) * 1000) / 10;
              const isCurrentRR = Math.abs(rr - rrRatio) < 0.01;
              const isProfitable = currentWR >= beWR;
              return (
                <div key={rr} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${isCurrentRR ? 'bg-muted/50 border border-border' : ''}`}>
                  <span className={`w-12 font-mono ${isCurrentRR ? 'font-bold' : ''}`}>{rr}:1</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (beWR / 60) * 100)}%`,
                        backgroundColor: isProfitable ? '#22c55e' : '#ef4444',
                        opacity: 0.6,
                      }}
                    />
                  </div>
                  <span className={`w-14 text-right font-mono ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                    BE: {beWR}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-3 text-sm ${gap >= 0 ? 'bg-green-500/5 border border-green-500/20' : 'bg-red-500/5 border border-red-500/20'}`}>
        <p className={gap >= 0 ? 'text-green-500' : 'text-red-500'} style={{ fontWeight: 500 }}>
          {gap >= 0
            ? `With ${currentWR}% WR and ${rrRatio}:1 R:R, the strategy is above breakeven by ${gap}%. This combination may be viable.`
            : `With ${currentWR}% WR and ${rrRatio}:1 R:R, you are ${Math.abs(gap)}% below breakeven. You need at least ${minRRNeeded}:1 R:R to break even.`
          }
        </p>
      </div>
    </div>
  );
}

// ====== RADAR COMPARISON CHART ======

function RadarComparisonChart({ variations, isDark = false }: { variations: VariationResult[]; isDark?: boolean }) {
  const cc = isDark ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  const radarData = useMemo(() => {
    if (variations.length === 0) return [];

    // Find min/max for normalization
    const allWR = variations.map(v => v.win_rate);
    const allExp = variations.map(v => v.expectancy);
    const allKelly = variations.map(v => v.kelly_pct);
    const allReturn = variations.map(v => v.total_return_pct);
    const allTrades = variations.map(v => v.total_trades);

    const normalize = (val: number, min: number, max: number) => {
      if (max === min) return 50;
      return Math.round(((val - min) / (max - min)) * 100);
    };

    const dimensions = ['Win Rate', 'Expectancy', 'Kelly %', 'Return %', 'Sample Size'];
    return dimensions.map(dim => {
      const entry: Record<string, string | number> = { dimension: dim };
      variations.forEach(v => {
        let raw = 0;
        let min = 0;
        let max = 0;
        switch (dim) {
          case 'Win Rate': raw = v.win_rate; min = Math.min(...allWR); max = Math.max(...allWR); break;
          case 'Expectancy': raw = v.expectancy; min = Math.min(...allExp); max = Math.max(...allExp); break;
          case 'Kelly %': raw = v.kelly_pct; min = Math.min(...allKelly); max = Math.max(...allKelly); break;
          case 'Return %': raw = v.total_return_pct; min = Math.min(...allReturn); max = Math.max(...allReturn); break;
          case 'Sample Size': raw = v.total_trades; min = Math.min(...allTrades); max = Math.max(...allTrades); break;
        }
        entry[v.name] = normalize(raw, min, max);
      });
      return entry;
    });
  }, [variations]);

  const variationColors = ['#06b6d4', '#f97316', '#8b5cf6', '#ec4899'];

  if (radarData.length === 0) return null;

  return (
    <ChartCard title="Strategy Variation Comparison" subtitle="Normalized comparison across key metrics (0-100 scale)" gradientFrom="purple" gradientTo="pink" isDark={isDark}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke={cc.grid} />
            <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: cc.text }} />
            <PolarRadiusAxis tick={{ fontSize: 9, fill: cc.text }} domain={[0, 100]} />
            {variations.map((v, i) => (
              <Radar
                key={v.name}
                name={v.name}
                dataKey={v.name}
                stroke={variationColors[i % variationColors.length]}
                fill={variationColors[i % variationColors.length]}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <RechartsTooltip
              content={<CustomChartTooltip isDark={isDark} />}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ====== VARIATIONS TAB ======

export function VariationsTab({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const variations = data.variations;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variations.map((v) => (
          <div key={v.name} className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{v.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.positive_edge ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {v.positive_edge ? '✓ Positive Edge' : '✗ No Edge'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Trades</p>
                <p className="text-lg font-bold font-mono">{v.total_trades}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Win Rate</p>
                <p className={`text-lg font-bold font-mono ${v.win_rate >= 33.3 ? 'text-green-500' : 'text-red-500'}`}>{v.win_rate}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expectancy</p>
                <p className={`text-lg font-bold font-mono ${v.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {v.expectancy > 0 ? '+' : ''}{v.expectancy.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Return</p>
                <p className={`text-lg font-bold font-mono ${v.total_return_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {v.total_return_pct}%
                </p>
              </div>
            </div>
            {v.equity_curve.length > 0 && (
              <div className="h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={v.equity_curve.filter((_, i) => i % 5 === 0)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <ReferenceLine y={10000} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Line type="monotone" dataKey="equity" stroke={v.positive_edge ? COLORS.positive : COLORS.negative} strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            {v.level_breakdown.length > 0 && (
              <div className="space-y-1">
                {v.level_breakdown.map(lb => (
                  <div key={lb.level} className="flex items-center justify-between text-xs py-1 border-t border-border/50">
                    <span className="font-medium">{lb.level.replace('_', ' ')}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{lb.total_trades} trades</span>
                      <span className={`font-mono ${lb.win_rate >= 33.3 ? 'text-green-500' : 'text-red-500'}`}>{lb.win_rate}%</span>
                      <span className={`font-mono ${lb.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {lb.expectancy > 0 ? '+' : ''}{lb.expectancy.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* R:R Optimizer Calculator */}
      <RROptimizer isDark={isDark} />

      {/* Monte Carlo Simulation */}
      <MonteCarloSimulation data={data} isDark={isDark} />

      {/* Radar Chart for Variation Comparison */}
      <RadarComparisonChart variations={variations} isDark={isDark} />

      {/* Strategy Modification Recommendations */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Recommended Strategy Modifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { title: 'Widen Stop Loss to 1.5 Quarters', desc: 'The 1-quarter stop is too tight for US30 daily volatility. A wider stop would reduce whipsaw stop-outs and potentially improve win rate above the 33.3% breakeven threshold.', impact: 'High' },
            { title: 'Reduce R:R to 1.5:1', desc: 'A 1.5:1 R:R lowers the breakeven win rate to ~40%, which may be achievable with Q1 breakouts showing ~25% win rate with the current tight stops.', impact: 'Medium' },
            { title: 'Add Trend Confirmation Filter', desc: "Only trade breakouts in the direction of the prior day's close relative to open. This filtered variation showed slight improvement for Q1 Down (26.7% WR).", impact: 'Medium' },
            { title: 'Focus on Q1 Breakouts Only', desc: 'Q1 consistently shows the highest win rates across all variations. Concentrating capital on the best-performing level may improve results.', impact: 'Low-Medium' },
            { title: 'Intraday Time Filter', desc: 'Avoid breakouts in the first and last 30 minutes of the session when volatility is highest and most unpredictable. Requires intraday data for testing.', impact: 'Unknown' },
            { title: 'Use Intraday Data for Accurate Path Resolution', desc: 'Daily OHLC cannot resolve which level (TP/SL) was hit first. Using 5-minute or tick data would eliminate the ambiguity that affects ~40% of all signals.', impact: 'Critical' },
          ].map((rec, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{rec.title}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  rec.impact.startsWith('Critical') ? 'bg-red-500/10 text-red-500' :
                  rec.impact.startsWith('High') ? 'bg-amber-500/10 text-amber-500' :
                  rec.impact.startsWith('Medium') ? 'bg-cyan-500/10 text-cyan-500' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {rec.impact}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{rec.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
