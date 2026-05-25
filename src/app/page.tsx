'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  TrendingUp, Target, AlertTriangle, BarChart3,
  Activity, Shield, Calendar, Info, DollarSign,
  Sun, Moon, Copy, Check, Microscope, Clock,
  ChevronRight, RefreshCw, Keyboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import type { BacktestData, QuoteData, NewsData, TabId } from '@/components/dashboard/types';
import { useCountUp } from '@/components/dashboard/hooks';
import { StatCard } from '@/components/dashboard/stat-card';
import { OverviewTab } from '@/components/dashboard/overview-tab';
import { LevelsTab } from '@/components/dashboard/levels-tab';
import { VariationsTab } from '@/components/dashboard/variations-tab';
import { ForecastTab } from '@/components/dashboard/forecast-tab';
import { MethodologyTab } from '@/components/dashboard/methodology-tab';
import { AnalyticsTab } from '@/components/dashboard/advanced-tab';

// ====== STAGGER CHILD COMPONENT ======

const staggerChildVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

function StaggerChild({ children }: { children: React.ReactNode }) {
  return <motion.div variants={staggerChildVariants}>{children}</motion.div>;
}

// ====== MAIN HOME COMPONENT ======

export default function Home() {
  const [data, setData] = useState<BacktestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [news, setNews] = useState<NewsData | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // Animated counter values for stat cards
  const animatedTotalTrades = useCountUp(data?.overall?.total_trades ?? 0);
  const animatedWinRate = useCountUp(data?.overall?.win_rate ?? 0);
  const animatedExpectancy = useCountUp(data?.overall?.expectancy ? Math.abs(data.overall.expectancy) : 0);
  const animatedKelly = useCountUp(data?.overall?.kelly_pct ? Math.abs(data.overall.kelly_pct) : 0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/backtest');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
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
      setLastUpdated(new Date());
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

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
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

  const handleCopySummary = useCallback(() => {
    if (!data) return;
    const summary = [
      `ADR Quarter Breakout Strategy — US30`,
      `Period: ${data.metadata.period}`,
      `Total Trades: ${data.overall.total_trades.toLocaleString()} | Win Rate: ${data.overall.win_rate}% | Expectancy: ${data.overall.expectancy}`,
      `Kelly: ${data.overall.kelly_pct}% | Best Level: ${data.overall.best_level} (${data.overall.best_level_wr}% WR)`,
      `Strategy Score: ${Math.round(Math.max(0, Math.min(100, (data.overall.win_rate / 33.3) * 30 + Math.max(0, data.overall.expectancy) * 30 + data.overall.kelly_pct * 0.2 * 20 + (1 - 1) * 20)))}/100`,
      `Verdict: NO POSITIVE EDGE — Base 2:1 R:R strategy unprofitable on US30`,
    ].join('\n');
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [data]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchQuote(), fetchNews()]);
    setIsRefreshing(false);
  }, [fetchQuote, fetchNews]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const tabMap: Record<string, TabId> = { '1': 'overview', '2': 'levels', '3': 'variations', '4': 'forecast', '5': 'methodology', '6': 'analytics' };

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        setShowKeyboardHints(prev => !prev);
      } else if (e.key === 'Escape') {
        setShowKeyboardHints(false);
      } else if (tabMap[e.key]) {
        handleTabChange(tabMap[e.key]);
      } else if (e.key === 'e' || e.key === 'E') {
        handleCopySummary();
      } else if (e.key === 'd' || e.key === 'D') {
        setIsDark(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTabChange, handleCopySummary]);

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

  // Tab labels map for breadcrumb
  const tabLabels: Record<TabId, string> = {
    overview: 'Overview',
    levels: 'Level Analysis',
    variations: 'Strategy Variations',
    forecast: 'Weekly Forecast',
    methodology: 'Methodology',
    analytics: 'Analytics',
  };

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
          {/* SVG-based Skeleton: Bar chart outline */}
          <div className="w-72 h-36 relative">
            <svg width="100%" height="100%" viewBox="0 0 288 144" className="opacity-30">
              {/* Axes */}
              <line x1="30" y1="10" x2="30" y2="130" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
              <line x1="30" y1="130" x2="280" y2="130" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
              {/* Bar placeholders */}
              {[0,1,2,3,4,5,6,7].map(i => (
                <rect key={i} x={40 + i * 30} y={50 + (i % 3) * 20} width="20" height={80 - (i % 3) * 20} rx="3" fill="currentColor" className="text-muted-foreground/20">
                  <animate attributeName="opacity" values="0.15;0.3;0.15" dur="1.5s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
                </rect>
              ))}
              {/* Reference line */}
              <line x1="30" y1="55" x2="280" y2="55" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" className="text-red-500/30" />
            </svg>
          </div>
          {/* Line chart skeleton */}
          <div className="w-56 h-20 relative">
            <svg width="100%" height="100%" viewBox="0 0 224 80" className="opacity-25">
              <path d="M 10 60 Q 40 55 60 45 T 110 50 T 160 30 T 210 40" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-500/50">
                <animate attributeName="stroke-dashoffset" from="400" to="0" dur="2s" repeatCount="indefinite" />
                <animate attributeName="stroke-dasharray" values="0 400;200 200;400 0" dur="2s" repeatCount="indefinite" />
              </path>
              <path d="M 10 60 Q 40 55 60 45 T 110 50 T 160 30 T 210 40 L 210 75 L 10 75 Z" fill="currentColor" className="text-cyan-500/10" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm">Loading backtest results...</p>
          <style>{`
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

  // Format animated stat values
  const expectancySign = data.overall.expectancy >= 0 ? '+' : '-';
  const kellySign = data.overall.kelly_pct >= 0 ? '+' : '-';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Animated Gradient Line at Top */}
      <div
        className="h-[3px] w-full"
        style={{
          background: 'linear-gradient(90deg, #06b6d4, #8b5cf6, #ec4899, #06b6d4)',
          backgroundSize: '200% 100%',
          animation: 'gradientLine 3s ease infinite',
        }}
      />
      <style>{`
        @keyframes gradientLine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes footerGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        /* Custom scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary) / 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.5);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: hsl(var(--primary) / 0.3) transparent;
        }
        /* Card ripple effect */
        .ripple-container {
          position: relative;
          overflow: hidden;
        }
        .ripple-container .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(6, 182, 212, 0.15);
          transform: scale(0);
          animation: rippleAnimation 0.6s ease-out;
          pointer-events: none;
        }
        @keyframes rippleAnimation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
        /* Glassmorphism inner glow for dark mode */
        .dark .glassmorphism-card {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }
        /* Tab content fade gradient */
        .tab-content-wrapper {
          position: relative;
        }
        .tab-content-wrapper::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 60px;
          background: linear-gradient(to top, hsl(var(--background)), transparent);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .tab-content-wrapper.scrollable::after {
          opacity: 1;
        }
        /* Responsive stat value font scaling */
        .responsive-stat-value {
          font-size: clamp(1.25rem, 3vw, 1.75rem);
        }
      `}</style>

      {/* Decorative Background Orbs (hidden on mobile) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden lg:block z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
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
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
              {/* Session Timer - hidden on mobile */}
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <Clock className="h-3 w-3" />
                <span>Session: {Math.floor(sessionSeconds / 60)}m {sessionSeconds % 60}s</span>
              </div>

              {quote && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-full border bg-card"
                >
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono font-semibold">{quote.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className={`font-mono font-medium ${quote.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {quote.change >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${quote.source === 'live' ? 'bg-green-500' : 'bg-amber-500'}`} title={quote.source === 'live' ? 'Live data' : 'Fallback data'} />
                </motion.div>
              )}
              {/* Data Refresh Indicator */}
              {lastUpdated && (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <motion.button
                    onClick={handleManualRefresh}
                    className="h-5 w-5 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    whileTap={{ scale: 0.9 }}
                    title="Refresh data"
                  >
                    <RefreshCw className={`h-2.5 w-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </motion.button>
                </div>
              )}
              <motion.span
                className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-500 font-medium border border-red-500/20"
                animate={{ opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                NO POSITIVE EDGE
              </motion.span>
              <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
                2:1 R:R
              </span>
              <motion.button
                onClick={handleCopySummary}
                className="h-8 rounded-lg border border-border flex items-center gap-1.5 px-2 sm:px-2.5 hover:bg-muted transition-colors text-xs font-medium"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Copy strategy summary"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={`hidden sm:inline ${copied ? 'text-green-500' : 'text-muted-foreground'}`}>{copied ? 'Copied!' : 'Export'}</span>
              </motion.button>
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

      {/* Animated Breadcrumb Navigation */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Dashboard</span>
            <motion.span
              key={`chevron-${activeTab}`}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            </motion.span>
            <motion.span
              key={`breadcrumb-${activeTab}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-foreground font-medium"
            >
              {tabLabels[activeTab]}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main ref={mainRef} className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 relative z-10">

        {/* Hypothesis Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`rounded-xl border p-5 space-y-3 ${isDark ? 'backdrop-blur-md bg-white/5 border-white/10' : 'border-border bg-card'}`}
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

        {/* Key Stats Grid with Animated Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: <Activity className="h-4 w-4" />,
              label: 'Total Trades',
              value: Math.round(animatedTotalTrades).toLocaleString(),
              subtext: `${data.metadata.total_trading_days} trading days`,
              color: 'cyan' as const,
              tooltip: 'Total simulated breakout signals generated across all 8 quarter levels over the backtest period',
            },
            {
              icon: <Target className="h-4 w-4" />,
              label: 'Win Rate',
              value: `${animatedWinRate.toFixed(1)}%`,
              subtext: `Breakeven: ${data.overall.breakeven_wr}%`,
              color: (data.overall.win_rate >= data.overall.breakeven_wr ? 'green' : 'red') as const,
              tooltip: 'Percentage of trades hitting take-profit before stop-loss. Breakeven for 2:1 R:R is 33.3%',
              progressPct: data.overall.win_rate,
              progressBreakevenPct: data.overall.breakeven_wr,
            },
            {
              icon: <TrendingUp className="h-4 w-4" />,
              label: 'Expectancy',
              value: `${expectancySign}${animatedExpectancy.toFixed(4)}`,
              subtext: 'quarters / trade',
              color: (data.overall.expectancy > 0 ? 'green' : 'red') as const,
              tooltip: 'Average profit/loss per trade in ADR quarters. Positive = profitable edge detected',
              progressPct: Math.max(0, 50 + data.overall.expectancy * 50),
              progressBreakevenPct: 50,
            },
            {
              icon: <Shield className="h-4 w-4" />,
              label: 'Kelly %',
              value: `${kellySign}${animatedKelly.toFixed(1)}%`,
              subtext: 'Position sizing',
              color: (data.overall.kelly_pct > 0 ? 'green' : 'red') as const,
              tooltip: 'Optimal position size based on Kelly Criterion. 0% means no mathematical edge detected',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <StatCard {...stat} isDark={isDark} />
            </motion.div>
          ))}
        </div>

        {/* Modern Pill-Style Tab Navigation */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-muted max-w-full overflow-x-auto scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-3.5 w-3.5" /> },
              { id: 'levels', label: 'Levels', icon: <Target className="h-3.5 w-3.5" /> },
              { id: 'variations', label: 'Variations', icon: <Activity className="h-3.5 w-3.5" /> },
              { id: 'forecast', label: 'Forecast', icon: <Calendar className="h-3.5 w-3.5" /> },
              { id: 'methodology', label: 'Method', icon: <Info className="h-3.5 w-3.5" /> },
              { id: 'analytics', label: 'Analytics', icon: <Microscope className="h-3.5 w-3.5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabId)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 whitespace-nowrap touch-manipulation ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 active:bg-muted/70'
                }`}
              >
                {tab.icon}
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content with Staggered Animations */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StaggerChild><OverviewTab
                data={data}
                levelChartData={levelChartData}
                quarterChartData={quarterChartData}
                monthlyChartData={monthlyChartData}
                equitySampled={equitySampled}
                drawdownData={drawdownData}
                adrDistributionData={adrDistributionData}
                currentAdr5={currentAdr5}
                isDark={isDark}
              /></StaggerChild>
            </motion.div>
          )}
          {activeTab === 'levels' && (
            <motion.div
              key="levels"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StaggerChild><LevelsTab data={data} isDark={isDark} /></StaggerChild>
            </motion.div>
          )}
          {activeTab === 'variations' && (
            <motion.div
              key="variations"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StaggerChild><VariationsTab data={data} isDark={isDark} /></StaggerChild>
            </motion.div>
          )}
          {activeTab === 'forecast' && (
            <motion.div
              key="forecast"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StaggerChild><ForecastTab data={data} quote={quote} news={news} isDark={isDark} /></StaggerChild>
            </motion.div>
          )}
          {activeTab === 'methodology' && (
            <motion.div
              key="methodology"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StaggerChild><MethodologyTab data={data} isDark={isDark} /></StaggerChild>
            </motion.div>
          )}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
                exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn' as const } },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <StaggerChild><AnalyticsTab data={data} isDark={isDark} /></StaggerChild>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content Fade Gradient - indicates more content below */}
        <div className="h-16 -mt-6 pointer-events-none" style={{
          background: 'linear-gradient(to top, hsl(var(--background)), transparent)'
        }} />
      </main>

      {/* Keyboard Shortcuts Overlay */}
      <AnimatePresence>
        {showKeyboardHints && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowKeyboardHints(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`rounded-xl border p-6 space-y-4 w-80 shadow-2xl ${isDark ? 'bg-[#1a1a2e] border-white/10' : 'bg-card border-border'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-cyan-500" />
                <h3 className="font-semibold text-sm">Keyboard Shortcuts</h3>
              </div>
              <div className="space-y-2">
                {[
                  { keys: ['1', '2', '3', '4', '5', '6'], desc: 'Switch tabs' },
                  { key: 'E', desc: 'Export summary' },
                  { key: 'D', desc: 'Toggle dark mode' },
                  { key: '?', desc: 'Show this help' },
                  { key: 'Esc', desc: 'Close this overlay' },
                ].map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{shortcut.desc}</span>
                    <div className="flex items-center gap-1">
                      {'keys' in shortcut
                        ? (shortcut.keys as string[]).map(k => (
                          <kbd key={k} className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-medium">{k}</kbd>
                        ))
                        : <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-[10px] font-medium">{shortcut.key}</kbd>
                      }
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">?</kbd> or <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[9px]">Esc</kbd> to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className={`mt-auto relative z-10 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-border bg-card/50'}`}>
        {/* Animated gradient border at top of footer */}
        <div
          className="h-px w-full"
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--muted-foreground) / 0.2), transparent, hsl(var(--muted-foreground) / 0.15), transparent)',
            backgroundSize: '200% 100%',
            animation: 'footerGradient 8s ease infinite',
          }}
        />
        <div className="border-t border-border" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <p className="text-xs text-muted-foreground">
                ADR Quarter Breakout · US30 · {data.metadata.backtest_date}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
                <span>·</span>
                <span>{data.overall.total_trades.toLocaleString()} trades analyzed</span>
                <span>·</span>
                <span>{data.metadata.total_trading_days} sessions</span>
              </div>
            </div>
            <p className="text-[10px] text-red-500/80 font-medium flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Backtesting results are not indicative of future performance
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
