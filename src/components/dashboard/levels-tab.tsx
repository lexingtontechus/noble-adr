'use client';

import React, { useMemo } from 'react';
import {
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown,
  BarChart3, Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { BacktestData } from './types';
import { COLORS, QUARTER_COLORS } from './constants';

// ====== SIGNAL STRENGTH DASHBOARD ======

function SignalStrengthDashboard({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const signalData = useMemo(() => {
    const levels = data.level_breakdown;
    const breakevenWR = 33.3;
    const maxAbsExp = Math.max(...levels.map(l => Math.abs(l.expectancy)), 0.01);
    const maxTrades = Math.max(...levels.map(l => l.total_trades), 1);

    return levels.map(l => {
      const wrScore = (l.win_rate / breakevenWR) * 50;
      const expScore = (1 - Math.abs(l.expectancy) / maxAbsExp) * 25;
      const sampleScore = (l.total_trades / maxTrades) * 25;
      const score = Math.round(Math.min(100, Math.max(0, wrScore + expScore + sampleScore)));
      return {
        name: l.level.replace('_', ' '),
        quarter: l.quarter,
        direction: l.direction,
        score,
        winRate: l.win_rate,
        expectancy: l.expectancy,
        trades: l.total_trades,
      };
    }).sort((a, b) => b.score - a.score);
  }, [data]);

  const getScoreColor = (score: number) => score >= 66 ? '#22c55e' : score >= 33 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-500" />
        <div>
          <h3 className="font-semibold text-sm">Signal Strength by Level</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Composite score: WR/breakeven (50%) + inverse expectancy (25%) + sample size (25%)</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {signalData.map(item => (
          <div key={item.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-medium w-20">{item.name}</span>
                <span className="text-muted-foreground">{item.direction}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span>WR: {item.winRate}%</span>
                <span>Exp: {item.expectancy > 0 ? '+' : ''}{item.expectancy.toFixed(3)}</span>
                <span className="font-bold" style={{ color: getScoreColor(item.score) }}>{item.score}</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: getScoreColor(item.score) }}
                initial={{ width: 0 }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />Strong (66+)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Moderate (33-65)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Weak (&lt;33)</span>
      </div>
    </div>
  );
}

// ====== CONFLUENCE HEAT MAP ======

function ConfluenceHeatMap({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const levels = data.level_breakdown;

  const confluenceData = levels.map(l => {
    const winRateScore = (l.win_rate / 100) * 40;
    const expectancyScore = Math.max(0, l.expectancy) * 30;
    const sampleScore = Math.min(l.total_trades / 300, 1) * 30;
    const raw = winRateScore + expectancyScore + sampleScore;
    const score = Math.round(Math.min(100, Math.max(0, raw)));
    return {
      name: l.level.replace('_', ' '),
      direction: l.direction,
      quarter: l.quarter,
      score,
      winRate: l.win_rate,
      expectancy: l.expectancy,
      totalTrades: l.total_trades,
    };
  });

  const getColor = (score: number): string => {
    if (score >= 66) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    if (score >= 33) return '#f97316';
    return '#ef4444';
  };

  const getBgOpacity = (score: number): number => {
    return 0.15 + (score / 100) * 0.25;
  };

  return (
    <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-cyan-500" />
        <div>
          <h3 className="font-semibold text-sm">Confluence Heat Map</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Combined score: win rate (40%) + expectancy (30%) + sample size (30%)</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {confluenceData.map(item => (
          <motion.div
            key={item.name}
            className="rounded-lg border p-3 text-center space-y-1.5"
            style={{
              borderColor: getColor(item.score),
              backgroundColor: `${getColor(item.score)}${Math.round(getBgOpacity(item.score) * 255).toString(16).padStart(2, '0')}`,
            }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.15 }}
          >
            <p className="text-[10px] font-medium text-muted-foreground">{item.name}</p>
            <p className="text-2xl font-bold" style={{ color: getColor(item.score) }}>{item.score}</p>
            <div className="flex flex-col gap-0.5 text-[9px] text-muted-foreground">
              <span>WR: {item.winRate}%</span>
              <span>Exp: {item.expectancy > 0 ? '+' : ''}{item.expectancy.toFixed(4)}</span>
              <span>N: {item.totalTrades}</span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />High (66+)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" />Medium (50-65)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" />Low (33-49)</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />Poor (&lt;33)</span>
      </div>
    </div>
  );
}

// ====== LEVELS TAB ======

export function LevelsTab({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  return (
    <div className="space-y-6">
      {/* Level Breakdown Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-sm">Breakdown by ADR Quarter Level</h3>
          <p className="text-xs text-muted-foreground mt-0.5">All 8 breakout levels — probability-weighted outcomes</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Level</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Direction</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Trades</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Win Rate</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expectancy</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Kelly %</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Avg P&L</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Edge</th>
              </tr>
            </thead>
            <tbody>
              {data.level_breakdown.map((level, i) => {
                const borderColor = level.quarter === 'Q1' ? '#f59e0b' : level.quarter === 'Q2' ? '#ef4444' : level.quarter === 'Q3' ? '#dc2626' : '#991b1b';
                const bgOpacity = level.quarter === 'Q1' ? '0.03' : level.quarter === 'Q2' ? '0.02' : '0.01';
                return (
                <tr key={level.level} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`} style={{ borderLeft: `3px solid ${borderColor}`, backgroundColor: `rgba(${level.quarter === 'Q1' ? '245,158,11' : level.quarter === 'Q2' ? '239,68,68' : level.quarter === 'Q3' ? '220,38,38' : '153,27,27'},${bgOpacity})` }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: QUARTER_COLORS[level.quarter] || COLORS.neutral }} />
                      <span className="font-medium">{level.level.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${level.direction === 'Long' ? 'text-green-500' : 'text-red-500'}`}>
                      {level.direction === 'Long' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {level.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{level.total_trades}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${level.win_rate >= 33.3 ? 'text-green-500' : level.win_rate >= 25 ? 'text-amber-500' : 'text-red-500'}`}>
                      {level.win_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={level.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {level.expectancy > 0 ? '+' : ''}{level.expectancy.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{level.kelly_pct}%</td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={level.avg_pnl_quarters >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {level.avg_pnl_quarters > 0 ? '+' : ''}{level.avg_pnl_quarters.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {level.positive_edge ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                        <ChevronUp className="h-3 w-3" /> Positive
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                        <ChevronDown className="h-3 w-3" /> Negative
                      </span>
                    )}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signal Strength Dashboard */}
      <SignalStrengthDashboard data={data} isDark={isDark} />

      {/* Confluence Heat Map */}
      <ConfluenceHeatMap data={data} isDark={isDark} />

      {/* Outcome Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
          <h3 className="font-semibold text-sm">Outcome Composition by Level</h3>
          <div className="space-y-3">
            {data.level_breakdown.map(level => {
              const total = level.total_trades;
              const probWinPct = level.win_rate; // probability-weighted win rate (e.g. 24.3%)
              const pureLossPct = (level.losses / total * 100);
              const ambPct = (level.ambiguous / total * 100);
              const eodPct = (level.eod_closes / total * 100);
              const ambLossPct = Math.max(0, 100 - probWinPct - pureLossPct - eodPct); // probability-weighted losses from ambiguous trades

              return (
                <div key={level.level} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{level.level.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{total} trades</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-green-500" style={{ width: `${probWinPct}%` }} title={`Prob. Win: ${probWinPct.toFixed(1)}%`} />
                    <div className="bg-red-500" style={{ width: `${pureLossPct}%` }} title={`Pure Loss: ${pureLossPct.toFixed(1)}%`} />
                    <div className="bg-amber-500" style={{ width: `${ambLossPct}%` }} title={`Amb. Loss: ${ambLossPct.toFixed(1)}%`} />
                    <div className="bg-muted-foreground/30" style={{ width: `${eodPct}%` }} title={`EOD Close: ${eodPct.toFixed(1)}%`} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Prob. Win {probWinPct.toFixed(1)}%</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Pure Loss {pureLossPct.toFixed(1)}%</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Amb. Loss {ambLossPct.toFixed(1)}%</span>
                    {eodPct > 0 && <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />EOD {eodPct.toFixed(1)}%</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
          <h3 className="font-semibold text-sm">Quarter Level Summary</h3>
          <p className="text-xs text-muted-foreground">Aggregated across Long + Short directions</p>
          <div className="space-y-3">
            {data.quarter_breakdown.map(q => (
              <div key={q.quarter} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: QUARTER_COLORS[q.quarter] }} />
                    <span className="font-semibold text-sm">{q.quarter}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.positive_edge ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {q.positive_edge ? 'Positive Edge' : 'Negative Edge'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Win Rate</p>
                    <p className={`font-mono font-medium ${q.win_rate >= 33.3 ? 'text-green-500' : 'text-red-500'}`}>{q.win_rate}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expectancy</p>
                    <p className={`font-mono font-medium ${q.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}`}>{q.expectancy > 0 ? '+' : ''}{q.expectancy.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trades</p>
                    <p className="font-mono font-medium">{q.total_trades}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground">
                  <span>Long: {q.long_trades} trades ({q.long_win_rate}% WR)</span>
                  <span>Short: {q.short_trades} trades ({q.short_win_rate}% WR)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-sm">Recent Trade Log</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 30 simulated trades</p>
        </div>
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Level</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">Entry</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">SL</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">TP</th>
                <th className="px-3 py-2 text-center font-medium text-muted-foreground">Outcome</th>
                <th className="px-3 py-2 text-right font-medium text-muted-foreground">P&L</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_trades.map((trade, i) => (
                <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-3 py-2 font-mono">{trade.date}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 ${trade.direction === 'Long' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.direction === 'Long' ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                      {trade.level.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{trade.entry.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-red-500/70">{trade.sl.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono text-green-500/70">{trade.tp.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      trade.outcome === 'win' ? 'bg-green-500/10 text-green-500' :
                      trade.outcome === 'loss' ? 'bg-red-500/10 text-red-500' :
                      trade.outcome === 'ambiguous' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {trade.outcome === 'eod_close' ? 'EOD' : trade.outcome.charAt(0).toUpperCase() + trade.outcome.slice(1)}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${trade.pnl_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.pnl_pct > 0 ? '+' : ''}{trade.pnl_pct.toFixed(2)}Q
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
