// ====== TYPES ======

export interface BacktestData {
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

export interface LevelStat {
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

export interface QuarterStat {
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

export interface MonthlyStat {
  month: string;
  total_trades: number;
  win_rate: number;
  avg_pnl: number;
}

export interface EquityPoint {
  date: string;
  equity: number;
}

export interface VariationResult {
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

export interface TradeRecord {
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

export interface ForecastData {
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

export interface ForecastDetail {
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

export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  source: 'live' | 'fallback';
  timestamp: string;
}

export interface NewsItem {
  headline: string;
  source: string;
  date: string;
  snippet: string;
  url?: string;
}

export interface NewsData {
  items: NewsItem[];
  source: 'live' | 'fallback';
  timestamp: string;
}

export interface DrawdownInfo {
  maxDrawdownPct: number;
  maxDrawdownDuration: number;
  recoveryTime: number;
  drawdownCurve: { date: string; drawdown: number; equity: number }[];
}

export type TabId = 'overview' | 'levels' | 'variations' | 'forecast' | 'methodology';
