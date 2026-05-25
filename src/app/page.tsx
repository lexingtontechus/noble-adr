'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, BarChart3,
  Activity, ArrowUpRight, ArrowDownRight, Shield, Zap, Calendar,
  ChevronUp, ChevronDown, Info, RefreshCw, DollarSign, Clock,
  Layers, Calculator, BookOpen, AlertCircle, Sun, Moon, Newspaper
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, LineChart, Line, Cell, ReferenceLine, Legend,
  ComposedChart, Area, AreaChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  source: 'live' | 'fallback';
  timestamp: string;
}

interface NewsItem {
  headline: string;
  source: string;
  date: string;
  snippet: string;
  url?: string;
}

interface NewsData {
  items: NewsItem[];
  source: 'live' | 'fallback';
  timestamp: string;
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

const LIGHT_CHART_COLORS = {
  grid: '#e5e7eb',
  text: '#9ca3af',
  tooltipBg: '#ffffff',
  tooltipBorder: '#e5e7eb',
  divider: '#e5e7eb',
};

const DARK_CHART_COLORS = {
  grid: '#333',
  text: '#aaa',
  tooltipBg: '#2a2a3e',
  tooltipBorder: '#3a3a4e',
  divider: '#555',
};

type TabId = 'overview' | 'levels' | 'variations' | 'forecast' | 'methodology';

// Tab transition animation variants
const tabVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
};

// Chart card wrapper with gradient top border
function ChartCard({ title, subtitle, children, gradientFrom = 'cyan', gradientTo = 'purple', isDark = false }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  isDark?: boolean;
}) {
  const gradientMap: Record<string, string> = {
    cyan: '#06b6d4',
    purple: '#8b5cf6',
    green: '#22c55e',
    orange: '#f97316',
    red: '#ef4444',
    amber: '#f59e0b',
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden" style={isDark ? { backgroundColor: '#1a1a2e', borderColor: '#2a2a3e' } : undefined}>
      <div
        className="h-1"
        style={{
          background: `linear-gradient(to right, ${gradientMap[gradientFrom] || gradientMap.cyan}, ${gradientMap[gradientTo] || gradientMap.purple})`,
        }}
      />
      <div className="p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

// Section divider with gradient
function SectionDivider({ isDark = false }: { isDark?: boolean } = {}) {
  return (
    <div
      className="h-px w-full my-2"
      style={{
        background: `linear-gradient(to right, transparent, ${isDark ? DARK_CHART_COLORS.divider : LIGHT_CHART_COLORS.divider}, transparent)`,
      }}
    />
  );
}

export default function Home() {
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

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

  const fetchQuote = useCallback(async () => {
    try {
      const res = await fetch('/api/quote');
      const json = await res.json();
      setQuote(json);
    } catch {
      // silently fail
    }
  }, []);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news');
      const json = await res.json();
      setNews(json);
    } catch {
      // silently fail
    }
  }, []);

  // Dark mode effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    fetchData();
    fetchQuote();
    fetchNews();
    const interval = setInterval(fetchQuote, 60_000);
    const newsInterval = setInterval(fetchNews, 300_000);
    return () => {
      clearInterval(interval);
      clearInterval(newsInterval);
    };
  }, [fetchData, fetchQuote, fetchNews]);

  // Scroll to top on tab change
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    if (mainRef.current) {
      mainRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // ===== ALL HOOKS MUST BE BEFORE EARLY RETURN =====

  // Drawdown calculation
  const drawdownData = useMemo(() => {
    if (!data) return { maxDrawdownPct: 0, maxDrawdownDuration: 0, recoveryTime: 0, drawdownCurve: [] as { date: string; drawdown: number; equity: number }[] };
    const curve = data.equity_curve;
    if (curve.length === 0) return { maxDrawdownPct: 0, maxDrawdownDuration: 0, recoveryTime: 0, drawdownCurve: [] as { date: string; drawdown: number; equity: number }[] };

    let peak = curve[0].equity;
    let maxDrawdownPct = 0;
    let drawdownStart = 0;
    let maxDrawdownStart = 0;
    let maxDrawdownEnd = 0;
    let inDrawdown = false;

    const drawdownCurve = curve.map((point, i) => {
      if (point.equity > peak) {
        peak = point.equity;
        if (inDrawdown) inDrawdown = false;
      }
      const dd = peak > 0 ? ((peak - point.equity) / peak) * 100 : 0;
      if (dd > maxDrawdownPct) {
        maxDrawdownPct = dd;
        maxDrawdownStart = drawdownStart;
        maxDrawdownEnd = i;
      }
      if (dd > 0 && !inDrawdown) {
        inDrawdown = true;
        drawdownStart = i;
      }
      return { date: point.date, drawdown: -dd, equity: point.equity };
    });

    const maxDDPeak = curve.slice(0, maxDrawdownEnd + 1).reduce((max, p) => Math.max(max, p.equity), 0);
    let recoveryTime = 0;
    for (let i = maxDrawdownEnd + 1; i < curve.length; i++) {
      if (curve[i].equity >= maxDDPeak) {
        recoveryTime = i - maxDrawdownEnd;
        break;
      }
      if (i === curve.length - 1) recoveryTime = curve.length - maxDrawdownEnd;
    }

    return {
      maxDrawdownPct,
      maxDrawdownDuration: maxDrawdownEnd - maxDrawdownStart,
      recoveryTime,
      drawdownCurve: drawdownCurve.filter((_, i) => i % 5 === 0 || i === drawdownCurve.length - 1),
    };
  }, [data]);

  // ADR distribution data
  const adrDistributionData = useMemo(() => {
    if (!data) return [];
    const adrValues = data.recent_trades.map(t => t.adr_5);
    if (adrValues.length === 0) return [];

    const min = Math.min(...adrValues);
    const max = Math.max(...adrValues);
    const bucketCount = 15;
    const bucketSize = (max - min) / bucketCount || 1;
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({
      range: `${Math.round(min + i * bucketSize)}`,
      count: 0,
      midpoint: min + (i + 0.5) * bucketSize,
    }));

    adrValues.forEach(v => {
      const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
      if (idx >= 0 && idx < bucketCount) buckets[idx].count++;
    });

    return buckets;
  }, [data]);

  // Sampled equity curve
  const equitySampled = useMemo(() => {
    if (!data) return [];
    return data.equity_curve.filter((_, i) => i % 5 === 0 || i === data.equity_curve.length - 1);
  }, [data]);

  const currentAdr5 = data?.forecast?.current_adr_5 ?? 0;

  // ===== EARLY RETURN FOR LOADING =====
  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 animate-ping opacity-20" />
          </div>
          <div className="w-64 space-y-3">
            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(6,182,212,0.2), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden w-48 mx-auto">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite 0.3s',
                }}
              />
            </div>
          </div>
          <p className="text-muted-foreground text-sm">Loading backtest results...</p>
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: -200% 0; }
              100% { background-position: 200% 0; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Data transformations (non-hook, after early return is fine)
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart3 className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">ADR Quarter Breakout</h1>
                <p className="text-xs text-muted-foreground">{data.metadata.symbol} · {data.metadata.period}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Live Price Indicator */}
              {quote && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border bg-card"
                >
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono font-semibold">{quote.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className={`font-mono font-medium ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${quote.source === 'live' ? 'bg-green-500' : 'bg-amber-500'}`} title={quote.source === 'live' ? 'Live data' : 'Fallback data'} />
                </motion.div>
              )}
              <motion.span
                className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-medium border border-red-500/20"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                NO POSITIVE EDGE
              </motion.span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                2:1 R:R
              </span>
              <motion.button
                onClick={() => setIsDark(!isDark)}
                className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Hypothesis Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-border bg-card p-5 space-y-3"
        >
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
        </motion.div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Activity className="h-4 w-4" />, label: 'Total Trades', value: data.overall.total_trades.toLocaleString(), subtext: `${data.metadata.total_trading_days} trading days`, color: 'cyan' as const },
            { icon: <Target className="h-4 w-4" />, label: 'Win Rate', value: `${data.overall.win_rate}%`, subtext: `Breakeven: ${data.overall.breakeven_wr}%`, color: (data.overall.win_rate >= data.overall.breakeven_wr ? 'green' : 'red') as const },
            { icon: <TrendingUp className="h-4 w-4" />, label: 'Expectancy', value: `${data.overall.expectancy > 0 ? '+' : ''}${data.overall.expectancy.toFixed(4)}`, subtext: 'quarters / trade', color: (data.overall.expectancy > 0 ? 'green' : 'red') as const },
            { icon: <Shield className="h-4 w-4" />, label: 'Kelly %', value: `${data.overall.kelly_pct}%`, subtext: 'Position sizing', color: (data.overall.kelly_pct > 0 ? 'green' : 'red') as const },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
            { id: 'levels', label: 'Level Analysis', icon: <Target className="h-3.5 w-3.5" /> },
            { id: 'variations', label: 'Strategy Variations', icon: <Zap className="h-3.5 w-3.5" /> },
            { id: 'forecast', label: 'Weekly Forecast', icon: <Calendar className="h-3.5 w-3.5" /> },
            { id: 'methodology', label: 'Methodology', icon: <Info className="h-3.5 w-3.5" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabId)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

        {/* Tab Content with Animations */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <OverviewTab
                data={data}
                levelChartData={levelChartData}
                quarterChartData={quarterChartData}
                monthlyChartData={monthlyChartData}
                equitySampled={equitySampled}
                drawdownData={drawdownData}
                adrDistributionData={adrDistributionData}
                currentAdr5={currentAdr5}
                isDark={isDark}
              />
            </motion.div>
          )}
          {activeTab === 'levels' && (
            <motion.div key="levels" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <LevelsTab data={data} isDark={isDark} />
            </motion.div>
          )}
          {activeTab === 'variations' && (
            <motion.div key="variations" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <VariationsTab data={data} />
            </motion.div>
          )}
          {activeTab === 'forecast' && (
            <motion.div key="forecast" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <ForecastTab data={data} quote={quote} news={news} isDark={isDark} />
            </motion.div>
          )}
          {activeTab === 'methodology' && (
            <motion.div key="methodology" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
              <MethodologyTab data={data} />
            </motion.div>
          )}
        </AnimatePresence>
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
  const iconColorMap = {
    cyan: 'bg-cyan-500/10 text-cyan-500',
    green: 'bg-green-500/10 text-green-500',
    red: 'bg-red-500/10 text-red-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <motion.div
      className="rounded-xl border border-border bg-card p-4 space-y-2 cursor-default"
      whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-2">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${iconColorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </motion.div>
  );
}

interface DrawdownInfo {
  maxDrawdownPct: number;
  maxDrawdownDuration: number;
  recoveryTime: number;
  drawdownCurve: { date: string; drawdown: number; equity: number }[];
}

function OverviewTab({ data, levelChartData, quarterChartData, monthlyChartData, equitySampled, drawdownData, adrDistributionData, currentAdr5, isDark = false }: {
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
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Win Rate by Level" subtitle="Breakeven threshold: 33.3% for 2:1 R:R" gradientFrom="cyan" gradientTo="purple" isDark={isDark}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={cc.text} />
                <YAxis tick={{ fontSize: 10 }} stroke={cc.text} domain={[0, 40]} />
                <RechartsTooltip
                  contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
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
        </ChartCard>

        <ChartCard title="Expectancy by Level" subtitle="Expected P&L per trade in ADR quarters" gradientFrom="purple" gradientTo="orange" isDark={isDark}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={levelChartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke={cc.text} />
                <YAxis tick={{ fontSize: 10 }} stroke={cc.text} />
                <RechartsTooltip
                  contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
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
                  contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
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
                  contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
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
        </ChartCard>
      </div>

      <SectionDivider isDark={isDark} />

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
                contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
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
          className="rounded-xl border border-border bg-card p-4 space-y-2"
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
          className="rounded-xl border border-border bg-card p-4 space-y-2"
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
          className="rounded-xl border border-border bg-card p-4 space-y-2"
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
                contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
                formatter={(value: number) => [`${Math.abs(value).toFixed(1)}%`, 'Drawdown']}
              />
              <ReferenceLine y={0} stroke={cc.text} strokeDasharray="2 2" />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <SectionDivider isDark={isDark} />

      {/* ADR Distribution Chart */}
      <ChartCard title="ADR₅ Distribution" subtitle="Histogram of 5-day ADR values (current vs historical)" gradientFrom="cyan" gradientTo="green" isDark={isDark}>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={adrDistributionData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={cc.grid} />
              <XAxis dataKey="range" tick={{ fontSize: 9 }} stroke={cc.text} />
              <YAxis tick={{ fontSize: 10 }} stroke={cc.text} />
              <RechartsTooltip
                contentStyle={{ background: cc.tooltipBg, border: `1px solid ${cc.tooltipBorder}`, borderRadius: '8px', fontSize: '12px', color: isDark ? '#e0e0e0' : undefined }}
                formatter={(value: number) => [`${value} trades`, 'Count']}
                labelFormatter={(label: string) => `ADR: ${label} pts`}
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

function LevelsTab({ data, isDark = false }: { data: BacktestData; isDark?: boolean }) {
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confluence Heat Map */}
      <ConfluenceHeatMap data={data} isDark={isDark} />

      {/* Outcome Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

function ForecastTab({ data, quote, news, isDark = false }: { data: BacktestData; quote: QuoteData | null; news: NewsData | null; isDark?: boolean }) {
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

      {/* Live Price Context */}
      {quote && (
        <div className="rounded-xl border border-border bg-card p-4">
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
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
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
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Weekly Forecast & Recommendation</h3>
        </div>
        <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line font-mono text-xs">
          {forecast.recommendation}
        </div>
      </div>

      {/* Trade Simulator */}
      <TradeSimulator data={data} />
    </div>
  );
}

// ====== METHODOLOGY TAB ======

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
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
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
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin' }}>
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
function TradeSimulator({ data }: { data: BacktestData }) {
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
  // For US30, each point = $1 per contract (micro) or $5 (standard). We use micro.
  const slDistance = quarterSize; // 1 quarter stop
  const contracts = slDistance > 0 ? Math.floor(riskAmount / slDistance) : 0;
  const rewardAmount = contracts * quarterSize * 2; // 2:1 R:R
  const expectedValue = (winRate / 100) * rewardAmount - (1 - winRate / 100) * riskAmount;
  const recommendedKelly = Math.max(0, kellyPct);

  const quality = expectedValue > 0 ? 'green' : expectedValue > -riskAmount * 0.2 ? 'amber' : 'red';
  const qualityLabel = expectedValue > 0 ? 'Positive' : expectedValue > -riskAmount * 0.2 ? 'Marginal' : 'Negative';
  const qualityColor = quality === 'green' ? '#22c55e' : quality === 'amber' ? '#f59e0b' : '#ef4444';

  const levelOptions = data.forecast.forecast_details.map(fd => fd.level);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
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

// ====== METHODOLOGY TAB ======

function MethodologyTab({ data }: { data: BacktestData }) {
  const refOpen = data.forecast.reference_open;
  const quarterSize = data.forecast.quarter_size;

  return (
    <div className="space-y-6">
      {/* Strategy Overview */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Strategy Overview</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The ADR Quarter Breakout strategy divides each day&apos;s expected trading range into four equal &quot;quarters&quot; centered on the session open price. When price breaks through these predefined levels, it signals a potential directional continuation trade.
        </p>
      </div>

      <SectionDivider />

      {/* Step 1: ADR Calculation */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
