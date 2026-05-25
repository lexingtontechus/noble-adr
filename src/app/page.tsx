'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, BarChart3,
  Activity, ArrowUpRight, ArrowDownRight, Shield, Zap, Calendar,
  ChevronUp, ChevronDown, Info, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine, Legend,
  ComposedChart, Area
} from 'recharts';

// Types
interface BacktestData {
  metadata: {
    symbol: string;
    ticker: string;
    period: string;
    total_trading_days: number;
    strategy: string;
    risk_reward: string;
    adr_period: number;
    backtest_date: string;
    starting_equity: number;
    position_sizing: string;
    methodology: string;
  };
  hypothesis: {
    primary: string;
    null: string;
    result: string;
    key_insight: string;
    relative_findings: string;
  };
  overall: {
    total_trades: number;
    win_rate: number;
    expectancy: number;
    kelly_pct: number;
    final_equity: number;
    total_return_pct: number;
    avg_pnl_per_trade: number;
    breakeven_wr: number;
    best_level: string;
    best_level_wr: number;
  };
  level_breakdown: LevelStat[];
  quarter_breakdown: QuarterStat[];
  monthly_breakdown: MonthlyStat[];
  equity_curve: EquityPoint[];
  variations: VariationResult[];
  recent_trades: TradeRecord[];
  forecast: ForecastData;
}

interface LevelStat {
  level: string;
  direction: string;
  quarter: string;
  total_trades: number;
  wins: number;
  losses: number;
  ambiguous: number;
  eod_closes: number;
  win_rate: number;
  loss_rate: number;
  expectancy: number;
  kelly_pct: number;
  avg_pnl_quarters: number;
  positive_edge: boolean;
}

interface QuarterStat {
  quarter: string;
  total_trades: number;
  win_rate: number;
  expectancy: number;
  kelly_pct: number;
  long_trades: number;
  short_trades: number;
  long_win_rate: number;
  short_win_rate: number;
  positive_edge: boolean;
}

interface MonthlyStat {
  month: string;
  total_trades: number;
  win_rate: number;
  avg_pnl: number;
}

interface EquityPoint {
  date: string;
  equity: number;
}

interface VariationResult {
  name: string;
  total_trades: number;
  win_rate: number;
  expectancy: number;
  kelly_pct: number;
  final_equity: number;
  total_return_pct: number;
  level_breakdown: { level: string; total_trades: number; win_rate: number; expectancy: number; positive_edge: boolean }[];
  equity_curve: EquityPoint[];
  positive_edge: boolean;
}

interface TradeRecord {
  date: string;
  direction: string;
  quarter: string;
  level: string;
  entry: number;
  sl: number;
  tp: number;
  outcome: string;
  pnl_pct: number;
  win_prob: number;
  adr_5: number;
  quarter_size: number;
  open_price: number;
  high: number;
  low: number;
  close: number;
  level_price: number;
}

interface ForecastData {
  current_adr_5: number;
  quarter_size: number;
  reference_open: number;
  reference_close: number;
  levels: Record<string, number>;
  forecast_details: ForecastDetail[];
  best_setups: LevelStat[];
  forecast_date: string;
  recommendation: string;
  risk_warning: string;
}

interface ForecastDetail {
  level: string;
  price: number;
  sl: number;
  tp: number;
  direction: string;
  win_rate: number;
  expectancy: number;
  kelly_pct: number;
  positive_edge: boolean;
}

// Color constants
const COLORS = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#f59e0b',
  accent: '#8b5cf6',
  chart1: '#06b6d4',
  chart2: '#f97316',
  chart3: '#8b5cf6',
  chart4: '#ec4899',
  up: '#22c55e',
  down: '#ef4444',
  q1: '#06b6d4',
  q2: '#f97316',
  q3: '#8b5cf6',
  q4: '#ec4899',
};

const QUARTER_COLORS: Record<string, string> = {
  Q1: COLORS.q1,
  Q2: COLORS.q2,
  Q3: COLORS.q3,
  Q4: COLORS.q4,
};

export default function Home() {
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'levels' | 'variations' | 'forecast'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backtest');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch backtest data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Loading backtest results...</p>
        </div>
      </div>
    );
  }

  const levelChartData = data.level_breakdown.map(l => ({
    name: l.level.replace('_', ' '),
    winRate: l.win_rate,
    expectancy: l.expectancy,
    kelly: l.kelly_pct,
    trades: l.total_trades,
    positive: l.positive_edge,
    direction: l.direction,
  }));

  const quarterChartData = data.quarter_breakdown.map(q => ({
    name: q.quarter,
    winRate: q.win_rate,
    longWR: q.long_win_rate,
    shortWR: q.short_win_rate,
    expectancy: q.expectancy,
    trades: q.total_trades,
  }));

  const monthlyChartData = data.monthly_breakdown.map(m => ({
    name: m.month.substring(5),
    full: m.month,
    winRate: m.win_rate,
    avgPnl: m.avg_pnl,
    trades: m.total_trades,
  }));

  // Sample equity curve (every 5th point to reduce data)
  const equitySampled = data.equity_curve.filter((_, i) => i % 5 === 0 || i === data.equity_curve.length - 1);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">ADR Quarter Breakout</h1>
                <p className="text-xs text-muted-foreground">{data.metadata.symbol} · {data.metadata.period}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-medium border border-red-500/20">
                NO POSITIVE EDGE
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                2:1 R:R
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Hypothesis Banner */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="font-semibold text-sm">Hypothesis Test Result</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{data.hypothesis.primary}</p>
              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
                <p className="text-sm font-medium text-red-500">Null Hypothesis: NOT REJECTED</p>
                <p className="text-xs text-muted-foreground mt-1">{data.hypothesis.result}</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Key Insight:</span> {data.hypothesis.key_insight}
              </p>
            </div>
          </div>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Total Trades"
            value={data.overall.total_trades.toLocaleString()}
            subtext={`${data.metadata.total_trading_days} trading days`}
            color="cyan"
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Win Rate"
            value={`${data.overall.win_rate}%`}
            subtext={`Breakeven: ${data.overall.breakeven_wr}%`}
            color={data.overall.win_rate >= data.overall.breakeven_wr ? 'green' : 'red'}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Expectancy"
            value={`${data.overall.expectancy > 0 ? '+' : ''}${data.overall.expectancy.toFixed(4)}`}
            subtext="quarters / trade"
            color={data.overall.expectancy > 0 ? 'green' : 'red'}
          />
          <StatCard
            icon={<Shield className="h-4 w-4" />}
            label="Kelly %"
            value={`${data.overall.kelly_pct}%`}
            subtext="Position sizing"
            color={data.overall.kelly_pct > 0 ? 'green' : 'red'}
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
            { id: 'levels', label: 'Level Analysis', icon: <Target className="h-3.5 w-3.5" /> },
            { id: 'variations', label: 'Strategy Variations', icon: <Zap className="h-3.5 w-3.5" /> },
            { id: 'forecast', label: 'Weekly Forecast', icon: <Calendar className="h-3.5 w-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <OverviewTab
            data={data}
            levelChartData={levelChartData}
            quarterChartData={quarterChartData}
            monthlyChartData={monthlyChartData}
            equitySampled={equitySampled}
          />
        )}
        {activeTab === 'levels' && (
          <LevelsTab data={data} />
        )}
        {activeTab === 'variations' && (
          <VariationsTab data={data} />
        )}
        {activeTab === 'forecast' && (
          <ForecastTab data={data} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              5-Day ADR Quarter Breakout Strategy · US30 Backtest · {data.metadata.backtest_date}
            </p>
            <p className="text-xs text-red-500 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Backtesting results are not indicative of future performance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ====== SUB-COMPONENTS ======

function StatCard({ icon, label, value, subtext, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'cyan' | 'green' | 'red' | 'amber';
}) {
  const colorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  };
  const iconColorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${iconColorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  );
}

function OverviewTab({ data, levelChartData, quarterChartData, monthlyChartData, equitySampled }: {
  data: BacktestData;
  levelChartData: { name: string; winRate: number; expectancy: number; kelly: number; trades: number; positive: boolean; direction: string }[];
  quarterChartData: { name: string; winRate: number; longWR: number; shortWR: number; expectancy: number; trades: number }[];
  monthlyChartData: { name: string; full: string; winRate: number; avgPnl: number; trades: number }[];
  equitySampled: EquityPoint[];
}) {
  return (
    <div className="space-y-6">
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Win Rate by Level */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Win Rate by Level</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Breakeven threshold: 33.3% for 2:1 R:R</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 40]} />
                <RechartsTooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`${value}%`, 'Win Rate']}
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
        </div>

        {/* Expectancy by Level */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Expectancy by Level</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Expected P&L per trade in ADR quarters</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={levelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <RechartsTooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`${value > 0 ? '+' : ''}${value.toFixed(4)}`, 'Expectancy']}
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
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Long vs Short by Quarter */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Long vs Short Win Rate by Quarter</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Comparing directional performance</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 35]} />
                <RechartsTooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                />
                <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" />
                <Bar dataKey="longWR" name="Long" fill={COLORS.up} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
                <Bar dataKey="shortWR" name="Short" fill={COLORS.down} radius={[3, 3, 0, 0]} fillOpacity={0.8} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Win Rate Trend */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm">Monthly Win Rate Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Strategy performance over time</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={1} />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" domain={[0, 50]} />
                <RechartsTooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(label: string) => {
                    const item = monthlyChartData.find(m => m.name === label);
                    return item?.full || label;
                  }}
                />
                <ReferenceLine y={33.3} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '33.3%', position: 'right', fontSize: 9, fill: '#ef4444' }} />
                <Area type="monotone" dataKey="winRate" stroke={COLORS.chart1} fill={COLORS.chart1} fillOpacity={0.1} strokeWidth={2} name="Win Rate %" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Equity Curve - Full Width */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Equity Curve (2% Risk Per Trade)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Starting capital: $10,000</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-red-500">
              ${data.overall.final_equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-red-500">{data.overall.total_return_pct}% return</p>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={equitySampled} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" interval={Math.floor(equitySampled.length / 6)} />
              <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" domain={[0, 12000]} />
              <RechartsTooltip
                contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
              />
              <ReferenceLine y={10000} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: 'Start: $10K', position: 'right', fontSize: 9, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="equity" stroke={COLORS.negative} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function LevelsTab({ data }: { data: BacktestData }) {
  return (
    <div className="space-y-6">
      {/* Level Breakdown Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
              {data.level_breakdown.map((level, i) => (
                <tr key={level.level} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: QUARTER_COLORS[level.quarter] || COLORS.neutral }}
                      />
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Outcome Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Outcome Composition */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h3 className="font-semibold text-sm">Outcome Composition by Level</h3>
          <div className="space-y-3">
            {data.level_breakdown.map(level => {
              const total = level.total_trades;
              const winPct = (level.wins / total * 100).toFixed(0);
              const lossPct = (level.losses / total * 100).toFixed(0);
              const ambPct = (level.ambiguous / total * 100).toFixed(0);
              const eodPct = (level.eod_closes / total * 100).toFixed(0);

              return (
                <div key={level.level} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{level.level.replace('_', ' ')}</span>
                    <span className="text-muted-foreground">{total} trades</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                    <div className="bg-green-500" style={{ width: `${winPct}%` }} title={`Wins: ${winPct}%`} />
                    <div className="bg-red-500" style={{ width: `${lossPct}%` }} title={`Losses: ${lossPct}%`} />
                    <div className="bg-amber-500" style={{ width: `${ambPct}%` }} title={`Ambiguous: ${ambPct}%`} />
                    <div className="bg-muted-foreground/30" style={{ width: `${eodPct}%` }} title={`EOD Close: ${eodPct}%`} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500" />Win {winPct}%</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Loss {lossPct}%</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Amb {ambPct}%</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />EOD {eodPct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quarter Summary */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-sm">Recent Trade Log</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Last 30 simulated trades</p>
        </div>
        <div className="max-h-96 overflow-y-auto">
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

function VariationsTab({ data }: { data: BacktestData }) {
  const variations = data.variations;

  return (
    <div className="space-y-6">
      {/* Variation Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variations.map((v) => (
          <div key={v.name} className="rounded-xl border border-border bg-card p-5 space-y-4">
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
            {/* Mini equity curve */}
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
            {/* Level breakdown */}
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

      {/* Strategy Modification Recommendations */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <h3 className="font-semibold text-sm">Recommended Strategy Modifications</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'Widen Stop Loss to 1.5 Quarters',
              desc: 'The 1-quarter stop is too tight for US30 daily volatility. A wider stop would reduce whipsaw stop-outs and potentially improve win rate above the 33.3% breakeven threshold.',
              impact: 'High',
            },
            {
              title: 'Reduce R:R to 1.5:1',
              desc: 'A 1.5:1 R:R lowers the breakeven win rate to ~40%, which may be achievable with Q1 breakouts showing ~25% win rate with the current tight stops.',
              impact: 'Medium',
            },
            {
              title: 'Add Trend Confirmation Filter',
              desc: 'Only trade breakouts in the direction of the prior day\'s close relative to open. This filtered variation showed slight improvement for Q1 Down (26.7% WR).',
              impact: 'Medium',
            },
            {
              title: 'Focus on Q1 Breakouts Only',
              desc: 'Q1 consistently shows the highest win rates across all variations. Concentrating capital on the best-performing level may improve results.',
              impact: 'Low-Medium',
            },
            {
              title: 'Intraday Time Filter',
              desc: 'Avoid breakouts in the first and last 30 minutes of the session when volatility is highest and most unpredictable. Requires intraday data for testing.',
              impact: 'Unknown — Requires Minute Data',
            },
            {
              title: 'Use Intraday Data for Accurate Path Resolution',
              desc: 'Daily OHLC cannot resolve which level (TP/SL) was hit first. Using 5-minute or tick data would eliminate the ambiguity that affects ~40% of all signals.',
              impact: 'Critical for Validity',
            },
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

function ForecastTab({ data }: { data: BacktestData }) {
  const forecast = data.forecast;

  // Calculate price distances from reference
  const refOpen = forecast.reference_open;

  return (
    <div className="space-y-6">
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
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Current ADR₅</p>
          <p className="text-2xl font-bold font-mono">{forecast.current_adr_5.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">points</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Quarter Size</p>
          <p className="text-2xl font-bold font-mono">{forecast.quarter_size.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">points (ADR₅ / 4)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Reference Price</p>
          <p className="text-2xl font-bold font-mono">{forecast.reference_open.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Last session open</p>
        </div>
      </div>

      {/* Forecast Levels - Visual Map */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Upcoming Week — ADR Quarter Levels</h3>
        <p className="text-xs text-muted-foreground">Price levels derived from 5-day ADR centered on last session open</p>

        {/* Visual Level Map */}
        <div className="relative py-8">
          {/* Center line (Open) */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-border" />

          {/* Open price label */}
          <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
            <div className="bg-card border border-border rounded-md px-3 py-1.5 text-center">
              <p className="text-[10px] text-muted-foreground">OPEN</p>
              <p className="text-sm font-bold font-mono">{refOpen.toLocaleString()}</p>
            </div>
          </div>

          {/* Up levels */}
          {forecast.forecast_details.filter(f => f.direction === 'Long').map((fd, i) => {
            const distFromOpen = ((fd.price - refOpen) / refOpen * 100).toFixed(2);
            return (
              <div key={fd.level} className="flex items-center gap-4 py-2" style={{ marginTop: i === 0 ? '0' : '0' }}>
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

          {/* Down levels */}
          {forecast.forecast_details.filter(f => f.direction === 'Short').map((fd, i) => {
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
              {forecast.forecast_details.map((fd, i) => {
                const risk = Math.abs(fd.price - fd.sl);
                const reward = Math.abs(fd.tp - fd.price);
                return (
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Weekly Forecast & Recommendation</h3>
        </div>
        <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-mono text-xs">
          {forecast.recommendation}
        </div>
      </div>
    </div>
  );
}
