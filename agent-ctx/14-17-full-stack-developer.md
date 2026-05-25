# Task 14-17: Full Stack Developer Work Record

## Task
Add 4 major features to the US30 ADR Quarter Breakout trading dashboard:
1. US30 News Feed (API + UI)
2. Interactive Trade Simulator
3. Confluence Heat Map
4. Dark Mode Toggle + Styling Polish

## What Was Done

### 1. News API (`/api/news/route.ts`)
- Created Finance API integration at `GET /api/news`
- Primary endpoint: `https://internal-api.z.ai/external/finance/v1/markets/news?ticker=^DJI`
- Falls back to no-ticker request, then to 7 static fallback news items
- 5-minute cache (10-minute for fallback data)
- Returns `{ items: NewsItem[], source: 'live'|'fallback', timestamp }`

### 2. Market News UI Component
- `MarketNews` component in Weekly Forecast tab
- Scrollable card list with left cyan accent border
- Shows headline, snippet (2-line clamp), source, relative time
- "Live" or "Cached" indicator in header
- max-h-64 overflow-y-auto

### 3. Trade Simulator Component
- `TradeSimulator` component in Weekly Forecast tab
- Inputs: Account Size (Input), Risk % (Slider 0.5-5%), Level (Select)
- Outputs: Direction, Risk Amount, Position Size, Potential Reward
- Quality metrics: Win Rate, Expected Value, Kelly Size, Trade Quality (red/amber/green)
- All calculations client-side from forecast + level_breakdown data

### 4. Confluence Heat Map
- `ConfluenceHeatMap` component in Level Analysis tab
- Score: `(winRate/100 * 40) + (max(0,expectancy) * 30) + (min(totalTrades/300,1) * 30)`
- 8 cells in responsive grid (2 cols mobile, 4 cols desktop)
- Color gradient: green (66+), amber (50-65), orange (33-49), red (<33)
- Shows score, WR, expectancy, sample size per cell

### 5. Dark Mode Toggle
- Sun/Moon toggle button in header
- `isDark` state with `useEffect` to toggle `dark` class on `document.documentElement`
- `LIGHT_CHART_COLORS` and `DARK_CHART_COLORS` constants
- `ChartCard` and `SectionDivider` accept `isDark` prop
- All Recharts components in OverviewTab use dynamic colors
- Dark: grid=#333, text=#aaa, tooltipBg=#2a2a3e, cardBg=#1a1a2e
- Light: grid=#e5e7eb, text=#9ca3af, tooltipBg=#ffffff

## Files Modified
- `/home/z/my-project/src/app/page.tsx` - Main dashboard (~2038 lines)
- `/home/z/my-project/src/app/api/news/route.ts` - New news API route

## Verification
- `bun run lint` passes with zero errors
- All 3 API routes return 200: `/api/backtest`, `/api/quote`, `/api/news`
- Dev server compiles successfully
- All 5 existing tabs preserved and working
