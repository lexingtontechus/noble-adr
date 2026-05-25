'use client';

import React from 'react';
import {
  ArrowUpRight, ArrowDownRight, Shield, Calculator,
  BookOpen, AlertTriangle, AlertCircle, Layers, BarChart3
} from 'lucide-react';
import type { BacktestData } from './types';
import { COLORS } from './constants';
import { SectionDivider } from './chart-card';

// ====== METHODOLOGY TAB ======

export function MethodologyTab({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const refOpen = data.forecast.reference_open;
  const quarterSize = data.forecast.quarter_size;

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Strategy Overview</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The ADR Quarter Breakout strategy divides each day&apos;s expected trading range into four equal &quot;quarters&quot; centered on the session open price. When price breaks through these predefined levels, it signals a potential directional continuation trade.
        </p>
      </div>

      <SectionDivider isDark={isDark} />

      {/* Step 1: ADR Calculation */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="h-1" style={{ background: 'linear-gradient(to right, #06b6d4, #8b5cf6)' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-sm font-bold">1</div>
            <h3 className="font-semibold">ADR₅ Calculation</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Average Daily Range (ADR) is calculated using a rolling 5-day window of daily High-Low ranges:
          </p>
          <div className="rounded-lg bg-muted/30 p-4 font-mono text-sm text-center space-y-2">
            <p className="text-foreground font-semibold">ADR₅ = (DR₁ + DR₂ + DR₃ + DR₄ + DR₅) / 5</p>
            <p className="text-xs text-muted-foreground">where DRᵢ = Highᵢ - Lowᵢ (daily range for day i)</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="font-medium text-cyan-500">Current ADR₅</p>
              <p className="font-mono text-lg font-bold">{data.forecast.current_adr_5.toLocaleString()} points</p>
              <p className="text-xs text-muted-foreground">Average daily range over last 5 sessions</p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <p className="font-medium text-purple-500">Quarter Size</p>
              <p className="font-mono text-lg font-bold">{data.forecast.quarter_size.toLocaleString()} points</p>
              <p className="text-xs text-muted-foreground">ADR₅ divided by 4 — one quarter of expected range</p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 2: Quarter Level Derivation */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="h-1" style={{ background: 'linear-gradient(to right, #8b5cf6, #f97316)' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center text-sm font-bold">2</div>
            <h3 className="font-semibold">Quarter Level Derivation</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Each trading day, 8 breakout levels are calculated from the session open price. The quarter size is derived from ADR₅/4, creating symmetric levels above and below the open.
          </p>

          {/* Visual Ladder Diagram */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-0">
            {[
              { label: 'Q4 Up', offset: 4, color: COLORS.q4, direction: 'up' as const },
              { label: 'Q3 Up', offset: 3, color: COLORS.q3, direction: 'up' as const },
              { label: 'Q2 Up', offset: 2, color: COLORS.q2, direction: 'up' as const },
              { label: 'Q1 Up', offset: 1, color: COLORS.q1, direction: 'up' as const },
              { label: 'OPEN', offset: 0, color: '#6b7280', direction: 'center' as const },
              { label: 'Q1 Down', offset: 1, color: COLORS.q1, direction: 'down' as const },
              { label: 'Q2 Down', offset: 2, color: COLORS.q2, direction: 'down' as const },
              { label: 'Q3 Down', offset: 3, color: COLORS.q3, direction: 'down' as const },
              { label: 'Q4 Down', offset: 4, color: COLORS.q4, direction: 'down' as const },
            ].map((level) => {
              const price = level.direction === 'center'
                ? refOpen
                : level.direction === 'up'
                  ? refOpen + level.offset * quarterSize
                  : refOpen - level.offset * quarterSize;

              return (
                <div key={level.label} className={`flex items-center gap-3 ${level.direction === 'center' ? 'py-2' : 'py-1'}`}>
                  <div className="w-16 text-right">
                    <span className={`text-xs font-medium ${level.direction === 'center' ? 'text-foreground' : ''}`} style={{ color: level.direction !== 'center' ? level.color : undefined }}>
                      {level.label}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {level.direction !== 'center' && (
                      <div className="flex-1 h-px" style={{ backgroundColor: level.color, opacity: 0.3 }} />
                    )}
                    <div
                      className={`rounded-full flex items-center justify-center ${level.direction === 'center' ? 'h-8 px-3 border-2' : 'h-5 w-5'}`}
                      style={{
                        backgroundColor: level.direction === 'center' ? '#ffffff' : `${level.color}20`,
                        borderColor: level.direction === 'center' ? '#6b7280' : level.color,
                      }}
                    >
                      {level.direction === 'center' && <span className="text-[9px] font-bold text-foreground">OPEN</span>}
                    </div>
                    {level.direction !== 'center' && (
                      <div className="flex-1 h-px" style={{ backgroundColor: level.color, opacity: 0.3 }} />
                    )}
                  </div>
                  <div className="w-28 text-right">
                    <span className="text-xs font-mono text-muted-foreground">{price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Ladder diagram showing 8 quarter levels around reference open ({refOpen.toLocaleString()})
          </p>
        </div>
      </div>

      {/* Step 3: Trade Entry/Exit Rules */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="h-1" style={{ background: 'linear-gradient(to right, #f97316, #22c55e)' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-sm font-bold">3</div>
            <h3 className="font-semibold">Trade Entry & Exit Rules</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" />
                <h4 className="font-semibold text-sm text-green-500">Long (Buy) Setup</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex gap-2"><span className="text-green-500 font-bold">Entry:</span><span>Price breaks above Qn Up level</span></div>
                <div className="flex gap-2"><span className="text-red-500 font-bold">Stop Loss:</span><span>1 quarter below entry (entry - Q)</span></div>
                <div className="flex gap-2"><span className="text-green-500 font-bold">Take Profit:</span><span>2 quarters above entry (entry + 2Q)</span></div>
                <div className="flex gap-2"><span className="text-amber-500 font-bold">R:R Ratio:</span><span>1:2 (risk 1Q to gain 2Q)</span></div>
              </div>
            </div>
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 text-red-500" />
                <h4 className="font-semibold text-sm text-red-500">Short (Sell) Setup</h4>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex gap-2"><span className="text-red-500 font-bold">Entry:</span><span>Price breaks below Qn Down level</span></div>
                <div className="flex gap-2"><span className="text-red-500 font-bold">Stop Loss:</span><span>1 quarter above entry (entry + Q)</span></div>
                <div className="flex gap-2"><span className="text-green-500 font-bold">Take Profit:</span><span>2 quarters below entry (entry - 2Q)</span></div>
                <div className="flex gap-2"><span className="text-amber-500 font-bold">R:R Ratio:</span><span>1:2 (risk 1Q to gain 2Q)</span></div>
              </div>
            </div>
          </div>

          {/* Visual Trade Diagram */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground text-center mb-3">Example: Q1 Up Long Trade</p>
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2 w-full max-w-sm">
                <span className="w-12 text-right text-[10px] text-green-500 font-medium">TP +2Q</span>
                <div className="flex-1 border-t-2 border-dashed border-green-500/40" />
                <span className="text-[10px] font-mono text-muted-foreground">{(refOpen + 3 * quarterSize).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center gap-2 w-full max-w-sm">
                <span className="w-12 text-right text-[10px] text-cyan-500 font-medium">Entry</span>
                <div className="flex-1 border-t-2 border-cyan-500" />
                <span className="text-[10px] font-mono text-muted-foreground">{(refOpen + 1 * quarterSize).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex items-center gap-2 w-full max-w-sm">
                <span className="w-12 text-right text-[10px] text-foreground font-medium">Open</span>
                <div className="flex-1 border-t-2 border-gray-400/40" />
                <span className="text-[10px] font-mono text-muted-foreground">{refOpen.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 w-full max-w-sm">
                <span className="w-12 text-right text-[10px] text-red-500 font-medium">SL -1Q</span>
                <div className="flex-1 border-t-2 border-dashed border-red-500/40" />
                <span className="text-[10px] font-mono text-muted-foreground">{refOpen.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Risk Management */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="h-1" style={{ background: 'linear-gradient(to right, #22c55e, #f59e0b)' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center text-sm font-bold">4</div>
            <h3 className="font-semibold">Risk Management</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <h4 className="font-semibold text-sm">Position Sizing</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Each trade risks exactly <span className="font-medium text-foreground">2% of current equity</span>. With a starting capital of $10,000, the first trade risks $200. Position size adjusts dynamically as equity changes.
              </p>
              <div className="rounded bg-muted/30 p-2 font-mono text-xs text-center">
                Risk per trade = Equity × 2%
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-purple-500" />
                <h4 className="font-semibold text-sm">Kelly Criterion</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The Kelly criterion determines the mathematically optimal position size for maximum growth rate:
              </p>
              <div className="rounded bg-muted/30 p-2 font-mono text-xs text-center space-y-1">
                <p>f* = (bp - q) / b</p>
                <p className="text-muted-foreground">where b = odds (2:1 → 2), p = win prob, q = 1 - p</p>
              </div>
              <p className="text-xs text-muted-foreground">
                With {data.overall.win_rate}% win rate and 2:1 R:R, Kelly = <span className="font-medium text-red-500">{data.overall.kelly_pct}%</span> (negative = no edge detected)
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-medium text-amber-500">Breakeven Win Rate</p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              With 2:1 R:R, the breakeven win rate is <span className="font-medium">33.3%</span>. This means you need to win at least 1 out of 3 trades just to break even.
              The current strategy achieves only <span className="font-medium text-red-500">{data.overall.win_rate}%</span> — insufficient for profitability.
            </p>
          </div>
        </div>
      </div>

      {/* Step 5: Backtest Methodology */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="h-1" style={{ background: 'linear-gradient(to right, #f59e0b, #ef4444)' }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center text-sm font-bold">5</div>
            <h3 className="font-semibold">Backtest Methodology</h3>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-cyan-500" />
                <p className="text-sm font-medium">Probability-Weighted Resolution</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Since daily OHLC data cannot determine which price level (TP or SL) was hit first when both are within the day&apos;s range,
                the backtest uses a probability-weighted approach. When a signal is &quot;ambiguous&quot; (both TP and SL could have been reached),
                the outcome is resolved probabilistically rather than discarded.
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <p className="text-sm font-medium">Ambiguity Limitation</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Approximately 40% of all signals are classified as &quot;ambiguous&quot; because daily OHLC data lacks intraday price path information.
                This is a significant limitation — using 5-minute or tick data would provide definitive resolution and more accurate results.
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                <p className="text-sm font-medium">Test Parameters</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Symbol:</span> <span className="font-medium">{data.metadata.symbol}</span></div>
                <div><span className="text-muted-foreground">Period:</span> <span className="font-medium">{data.metadata.period}</span></div>
                <div><span className="text-muted-foreground">Trading Days:</span> <span className="font-medium">{data.metadata.total_trading_days}</span></div>
                <div><span className="text-muted-foreground">ADR Period:</span> <span className="font-medium">{data.metadata.adr_period}-day</span></div>
                <div><span className="text-muted-foreground">Risk/Reward:</span> <span className="font-medium">{data.metadata.risk_reward}</span></div>
                <div><span className="text-muted-foreground">Position Sizing:</span> <span className="font-medium">{data.metadata.position_sizing}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
