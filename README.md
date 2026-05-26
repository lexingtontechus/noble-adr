# Noble ADR — US30 Quarter Breakout Strategy Dashboard

A comprehensive, production-ready trading strategy dashboard built with **Next.js 16**, **TypeScript**, **Recharts**, and **Framer Motion**. Backtests the 5-Day ADR Quarter Breakout strategy on US30 (Dow Jones Industrial Average) over 2 years of daily data.

## Strategy Overview

The **5-Day ADR Quarter Breakout** strategy:

1. Calculate the 5-day Average Daily Range (ADR₅)
2. Divide ADR₅ by 4 to create quarter levels
3. Place 8 levels around the open price (Q1-Q4 Up, Q1-Q4 Down)
4. Enter breakout trades with 2:1 Risk:Reward ratio

### Key Finding

**No positive edge detected.** The base 2:1 R:R strategy achieves only a 22.1% win rate vs. the 33.3% breakeven threshold, resulting in negative expectancy (-0.3373). The dashboard provides comprehensive analysis of why, and explores alternative parameterizations.

## Features

### 6 Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Overview** | Strategy score, volatility regime, 10+ charts (win rate, expectancy, equity curve, drawdown, ADR distribution, day-of-week, time-of-month), animated stat cards |
| **Level Analysis** | Color-coded breakdown table, signal strength dashboard, confluence heat map, probability-weighted outcome composition, quarter summary, trade log |
| **Strategy Variations** | 4 alternative parameterizations with equity curves, R:R optimizer with interactive slider, radar comparison chart, Monte Carlo simulation, modification recommendations |
| **Weekly Forecast** | Market news feed, risk warnings, visual level map, forecast table, interactive trade simulator |
| **Methodology** | 5-step walkthrough with visual ladder diagram and trade entry/exit diagrams |
| **Analytics** | Advanced statistical analysis, correlation matrices, regime detection |

### Cross-cutting Features

- 🌙 **Dark/Light Mode** — Glassmorphism effects, dynamic chart colors
- 📊 **Real-time US30 Price** — Auto-refresh every 60 seconds with Finance API
- 📰 **Market News Feed** — 5-minute cached news from Finance API
- 🎰 **Monte Carlo Simulation** — 100/500/1000 runs, ruin probability, distribution chart
- 📈 **Interactive Trade Simulator** — Account size, risk %, level selection
- 🎯 **R:R Ratio Optimizer** — Breakeven calculations, visual gauge
- 🏆 **Performance Score Card** — Circular SVG ring with animated breakdown bars
- 🌡️ **Volatility Regime Indicator** — Arc gauge with percentile ranking
- 📡 **Signal Strength Dashboard** — Animated progress bars with composite scoring
- 🕐 **Day-of-Week & Time-of-Month** — Performance analysis charts
- 📋 **Strategy Summary Export** — Copy to clipboard with formatted summary
- ⌨️ **Keyboard Shortcuts** — Tab switching (1-6), Export (E), Dark mode (D), Help (?)
- ✨ **Animations** — Framer Motion tab transitions, hover effects, animated counters, gradient line

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Charts**: Recharts 2.15
- **Animations**: Framer Motion 12
- **Icons**: Lucide React

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main dashboard (860 lines)
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── api/
│       ├── backtest/route.ts       # Backtest data API
│       ├── quote/route.ts          # Real-time US30 price API
│       └── news/route.ts           # Market news API
├── components/
│   ├── dashboard/
│   │   ├── types.ts                # TypeScript interfaces
│   │   ├── constants.ts            # Color constants, chart colors
│   │   ├── hooks.ts                # Custom hooks (useCountUp)
│   │   ├── chart-card.tsx          # ChartCard, SectionDivider
│   │   ├── stat-card.tsx           # StatCard with progress bars
│   │   ├── overview-tab.tsx        # Overview tab components
│   │   ├── levels-tab.tsx          # Level analysis tab
│   │   ├── variations-tab.tsx      # Strategy variations tab
│   │   ├── forecast-tab.tsx        # Weekly forecast tab
│   │   ├── methodology-tab.tsx     # Methodology walkthrough
│   │   ├── monte-carlo.tsx         # Monte Carlo simulation
│   │   ├── advanced-tab.tsx        # Advanced analytics tab
│   │   ├── advanced-analytics.tsx  # Analytics components
│   │   └── risk-metrics.tsx        # Risk metrics components
│   └── ui/                         # shadcn/ui components
└── lib/
    ├── utils.ts                    # Utility functions
    └── db.ts                       # Prisma database client
```

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm/bun package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/lexingtontechus/noble-adr.git
cd noble-adr

# Install dependencies
bun install

# Start development server
bun run dev
```

The dashboard will be available at `http://localhost:3000`.

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/backtest` | Returns full backtest results (levels, equity curve, trades, forecast) |
| `GET /api/quote` | Returns real-time US30 price from Finance API (with fallback) |
| `GET /api/news` | Returns market news from Finance API (with fallback) |

## Backtest Results Summary

| Metric | Value |
|--------|-------|
| Total Trades | 1,452 |
| Win Rate | 22.1% (breakeven: 33.3%) |
| Expectancy | -0.3373 |
| Kelly % | 0% |
| Strategy Score | 27/100 (Weak) |
| Max Drawdown | ~40%+ |
| Best Level | Q1 Down (24.3% WR) |
| Verdict | **No Positive Edge** |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` - `6` | Switch between tabs |
| `E` | Export strategy summary |
| `D` | Toggle dark/light mode |
| `?` | Show keyboard shortcuts |
| `Esc` | Close overlay |

## License

MIT

## Disclaimer

⚠️ Backtesting results are not indicative of future performance. This dashboard is for educational and research purposes only. Do not use these results as the basis for actual trading decisions.
