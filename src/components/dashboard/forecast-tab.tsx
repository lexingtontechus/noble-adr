'use client';

import React, { useState } from 'react';
import {
  ArrowUpRight, ArrowDownRight, AlertTriangle, Info,
  Newspaper, Calculator
} from 'lucide-react';
import type { BacktestData, QuoteData, NewsData } from './types';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ====== MARKET NEWS ======

function MarketNews({ news }: { news: NewsData | null }) {
  if (!news) return null;

  const formatTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60_000);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Market News</h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className={`h-1.5 w-1.5 rounded-full ${news.source === 'live' ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className="text-muted-foreground font-medium">{news.source === 'live' ? 'Live' : 'Cached'}</span>
        </div>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {news.items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border-l-[3px] border-l-cyan-500 bg-muted/20 p-3 space-y-1 hover:bg-muted/30 transition-colors"
          >
            <p className="text-sm font-medium leading-snug">{item.headline}</p>
            {item.snippet && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.snippet}</p>}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-medium">{item.source}</span>
              <span>·</span>
              <span>{formatTime(item.date)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ====== TRADE SIMULATOR ======

function TradeSimulator({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPct, setRiskPct] = useState(2);
  const [selectedLevel, setSelectedLevel] = useState(data.forecast.forecast_details[0]?.level || 'Q1_Up');

  const forecastDetail = data.forecast.forecast_details.find(f => f.level === selectedLevel);
  const levelStat = data.level_breakdown.find(l => l.level === selectedLevel);

  const winRate = forecastDetail?.win_rate ?? levelStat?.win_rate ?? 0;
  const expectancy = forecastDetail?.expectancy ?? levelStat?.expectancy ?? 0;
  const kellyPct = forecastDetail?.kelly_pct ?? levelStat?.kelly_pct ?? 0;
  const direction = forecastDetail?.direction ?? (selectedLevel.includes('Up') ? 'Long' : 'Short');

  const quarterSize = data.forecast.quarter_size;
  const riskAmount = accountSize * (riskPct / 100);
  const slDistance = quarterSize;
  const contracts = slDistance > 0 ? Math.floor(riskAmount / slDistance) : 0;
  const rewardAmount = contracts * quarterSize * 2;
  const expectedValue = (winRate / 100) * rewardAmount - (1 - winRate / 100) * riskAmount;
  const recommendedKelly = Math.max(0, kellyPct);

  const quality = expectedValue > 0 ? 'green' : expectedValue > -riskAmount * 0.2 ? 'amber' : 'red';
  const qualityLabel = expectedValue > 0 ? 'Positive' : expectedValue > -riskAmount * 0.2 ? 'Marginal' : 'Negative';
  const qualityColor = quality === 'green' ? '#22c55e' : quality === 'amber' ? '#f59e0b' : '#ef4444';

  const levelOptions = data.forecast.forecast_details.map(fd => fd.level);

  return (
    <div className={`rounded-xl border p-5 space-y-5 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-purple-500" />
        <div>
          <h3 className="font-semibold text-sm">Trade Simulator</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Calculate position size and expected value based on historical data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Inputs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Account Size ($)</label>
            <Input
              type="number"
              value={accountSize}
              onChange={(e) => setAccountSize(Math.max(100, Number(e.target.value) || 0))}
              min={100}
              step={1000}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Risk Per Trade: {riskPct}%</label>
            <Slider
              value={[riskPct]}
              onValueChange={(v) => setRiskPct(v[0])}
              min={0.5}
              max={5}
              step={0.5}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.5%</span>
              <span>5%</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Quarter Level</label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map(level => (
                  <SelectItem key={level} value={level}>
                    {level.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Direction</p>
            <p className={`text-sm font-bold flex items-center gap-1 ${direction === 'Long' ? 'text-green-500' : 'text-red-500'}`}>
              {direction === 'Long' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {direction}
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Risk Amount</p>
            <p className="text-lg font-bold font-mono">${riskAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Position Size</p>
            <p className="text-lg font-bold font-mono">{contracts} <span className="text-xs text-muted-foreground font-normal">micro contracts</span></p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Potential Reward (2:1)</p>
            <p className="text-lg font-bold font-mono text-green-500">+${rewardAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        </div>

        {/* Expected Value & Quality */}
        <div className="space-y-3">
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Historical Win Rate</p>
            <p className={`text-lg font-bold font-mono ${winRate >= 33.3 ? 'text-green-500' : 'text-red-500'}`}>{winRate}%</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Expected Value / Trade</p>
            <p className={`text-lg font-bold font-mono ${expectedValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {expectedValue >= 0 ? '+' : ''}${expectedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">Recommended Kelly Size</p>
            <p className={`text-lg font-bold font-mono ${recommendedKelly > 0 ? 'text-green-500' : 'text-red-500'}`}>{recommendedKelly}%</p>
          </div>

          <div className="rounded-lg border-2 p-3 space-y-1" style={{ borderColor: qualityColor }}>
            <p className="text-xs text-muted-foreground">Trade Quality</p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: qualityColor }} />
              <p className="text-lg font-bold" style={{ color: qualityColor }}>{qualityLabel}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {quality === 'green' ? 'Positive expectancy — historically profitable' :
               quality === 'amber' ? 'Near breakeven — marginal edge' :
               'Negative expectancy — historically unprofitable'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ====== FORECAST TAB ======

export function ForecastTab({ data, quote, news, isDark = false }: { data: BacktestData; quote: QuoteData | null; news: NewsData | null; isDark?: boolean }) {
  const forecast = data.forecast;
  const refOpen = forecast.reference_open;

  return (
    <div className="space-y-6">
      {/* Market News */}
      <MarketNews news={news} />

      {/* Risk Warning */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-500">Risk Warning</p>
            <p className="text-xs text-red-500/80 mt-1 leading-relaxed">{forecast.risk_warning}</p>
          </div>
        </div>
      </div>

      {/* Current Market Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
          <p className="text-xs text-muted-foreground font-medium">Current ADR₅</p>
          <p className="text-2xl font-bold font-mono">{forecast.current_adr_5.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
        <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
          <p className="text-xs text-muted-foreground font-medium">Quarter Size</p>
          <p className="text-2xl font-bold font-mono">{forecast.quarter_size.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">points (ADR₅ / 4)</p>
        </div>
        <div className={`rounded-xl border p-4 space-y-2 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
          <p className="text-xs text-muted-foreground font-medium">Reference Price</p>
          <p className="text-2xl font-bold font-mono">{forecast.reference_open.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Last session open</p>
        </div>
      </div>

      {/* Live Price Context */}
      {quote && (
        <div className={`rounded-xl border p-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${quote.change >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">US30 Current Price</p>
              <p className="text-xs text-muted-foreground">
                {quote.price.toLocaleString(undefined, { maximumFractionDigits: 0 })} pts
                ({quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                — {quote.source === 'live' ? 'Live' : 'Fallback'} data
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Levels - Visual Map */}
      <div className={`rounded-xl border p-5 space-y-4 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <h3 className="font-semibold text-sm">Upcoming Week — ADR Quarter Levels</h3>
        <p className="text-xs text-muted-foreground">Price levels derived from 5-day ADR centered on last session open</p>
        <div className="relative py-8">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-border" />
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
            <div className="bg-card border border-border rounded-md px-3 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground">OPEN</p>
              <p className="text-sm font-bold font-mono">{refOpen.toLocaleString()}</p>
            </div>
          </div>
          {forecast.forecast_details.filter(f => f.direction === 'Long').map((fd) => {
            const distFromOpen = ((fd.price - refOpen) / refOpen * 100).toFixed(2);
            return (
              <div key={fd.level} className="flex items-center gap-4 py-2">
                <div className="flex-1 text-right">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                    <div>
                      <p className="text-xs font-medium text-green-500">{fd.level.replace('_', ' ')}</p>
                      <p className="text-sm font-bold font-mono">{fd.price.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">+{distFromOpen}% from open</p>
                    </div>
                  </div>
                </div>
                <div className="w-24 flex flex-col items-center text-[10px]">
                  <span className="text-green-500/70">TP: {fd.tp.toLocaleString()}</span>
                  <span className="text-red-500/70">SL: {fd.sl.toLocaleString()}</span>
                  <span className={`font-medium mt-0.5 ${fd.win_rate >= 33.3 ? 'text-green-500' : 'text-amber-500'}`}>WR: {fd.win_rate}%</span>
                </div>
                <div className="flex-1" />
              </div>
            );
          })}
          {forecast.forecast_details.filter(f => f.direction === 'Short').map((fd) => {
            const distFromOpen = ((refOpen - fd.price) / refOpen * 100).toFixed(2);
            return (
              <div key={fd.level} className="flex items-center gap-4 py-2">
                <div className="flex-1" />
                <div className="w-24 flex flex-col items-center text-[10px]">
                  <span className="text-green-500/70">TP: {fd.tp.toLocaleString()}</span>
                  <span className="text-red-500/70">SL: {fd.sl.toLocaleString()}</span>
                  <span className={`font-medium mt-0.5 ${fd.win_rate >= 33.3 ? 'text-green-500' : 'text-amber-500'}`}>WR: {fd.win_rate}%</span>
                </div>
                <div className="flex-1 text-left">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    <div>
                      <p className="text-xs font-medium text-red-500">{fd.level.replace('_', ' ')}</p>
                      <p className="text-sm font-bold font-mono">{fd.price.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">-{distFromOpen}% from open</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Forecast Details Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-sm">Forecast Level Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Level</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Direction</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Price</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Stop Loss</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Take Profit</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Hist. WR</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expectancy</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Signal</th>
              </tr>
            </thead>
            <tbody>
              {forecast.forecast_details.map((fd, i) => (
                <tr key={fd.level} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3 font-medium">{fd.level.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${fd.direction === 'Long' ? 'text-green-500' : 'text-red-500'}`}>
                      {fd.direction === 'Long' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {fd.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{fd.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-red-500">{fd.sl.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-green-500">{fd.tp.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-mono ${fd.win_rate >= 33.3 ? 'text-green-500' : 'text-amber-500'}`}>
                      {fd.win_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={fd.expectancy >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {fd.expectancy > 0 ? '+' : ''}{fd.expectancy.toFixed(4)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fd.positive_edge ? (
                      <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Trade</span>
                    ) : (
                      <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">Avoid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendation */}
      <div className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Weekly Forecast & Recommendation</h3>
        </div>
        <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-mono text-xs">
          {forecast.recommendation}
        </div>
      </div>

      {/* Trade Simulator */}
      <TradeSimulator data={data} isDark={isDark} />
    </div>
  );
}
