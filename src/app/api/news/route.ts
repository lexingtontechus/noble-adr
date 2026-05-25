import { NextResponse } from 'next/server';

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

// Cache for 5 minutes
let cachedNews: { data: NewsData; expiry: number } | null = null;

async function fetchLiveNews(): Promise<NewsData | null> {
  try {
    // Try with DJI ticker first
    const response = await fetch(
      'https://internal-api.z.ai/external/finance/v1/markets/news?ticker=^DJI',
      {
        headers: {
          'X-Z-AI-From': 'Z',
        },
        next: { revalidate: 300 },
      }
    );

    if (!response.ok) {
      // Fallback: try without ticker
      const fallbackResponse = await fetch(
        'https://internal-api.z.ai/external/finance/v1/markets/news',
        {
          headers: {
            'X-Z-AI-From': 'Z',
          },
          next: { revalidate: 300 },
        }
      );

      if (!fallbackResponse.ok) return null;

      const fallbackData = await fallbackResponse.json();
      return parseNewsResponse(fallbackData);
    }

    const data = await response.json();
    return parseNewsResponse(data);
  } catch {
    return null;
  }
}

function parseNewsResponse(data: unknown): NewsData | null {
  try {
    const articles = (data as { data?: unknown[]; items?: unknown[]; news?: unknown[] })?.data
      || (data as { items?: unknown[] })?.items
      || (data as { news?: unknown[] })?.news;

    if (!Array.isArray(articles) || articles.length === 0) return null;

    const items: NewsItem[] = articles.slice(0, 10).map((article: unknown) => {
      const a = article as Record<string, unknown>;
      return {
        headline: String(a.title || a.headline || a.name || ''),
        source: String(a.source || a.publisher || a.provider || 'Market News'),
        date: String(a.published_at || a.date || a.publishedDate || a.created_at || new Date().toISOString()),
        snippet: String(a.summary || a.description || a.snippet || a.text || '').substring(0, 200),
        url: a.url ? String(a.url) : undefined,
      };
    }).filter(item => item.headline.length > 0);

    if (items.length === 0) return null;

    return {
      items,
      source: 'live',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function getFallbackNews(): NewsData {
  const now = new Date();
  const items: NewsItem[] = [
    {
      headline: 'Dow Jones Futures Signal Cautious Open as Traders Await Key Economic Data',
      source: 'Reuters',
      date: new Date(now.getTime() - 30 * 60_000).toISOString(),
      snippet: 'US stock futures pointed to a mixed open as investors weighed the prospects of further Federal Reserve rate decisions against persistent inflation concerns.',
    },
    {
      headline: 'US30 Volatility Increases Amid Trade Policy Uncertainty',
      source: 'Bloomberg',
      date: new Date(now.getTime() - 2 * 60 * 60_000).toISOString(),
      snippet: 'The Dow Jones Industrial Average saw elevated volatility in recent sessions as trade negotiations and tariff discussions created uncertainty for industrial and manufacturing stocks.',
    },
    {
      headline: 'Federal Reserve Officials Signal Data-Dependent Approach to Rate Cuts',
      source: 'CNBC',
      date: new Date(now.getTime() - 4 * 60 * 60_000).toISOString(),
      snippet: 'Multiple Fed officials emphasized that future interest rate decisions will depend heavily on incoming inflation and employment data, suggesting no imminent policy shifts.',
    },
    {
      headline: 'US Manufacturing Sector Shows Mixed Signals in Latest ISM Report',
      source: 'Wall Street Journal',
      date: new Date(now.getTime() - 6 * 60 * 60_000).toISOString(),
      snippet: 'The Institute for Supply Management reported that US manufacturing activity remained in contraction territory, though new orders showed improvement from previous months.',
    },
    {
      headline: 'Tech Stocks Lead Dow Higher as AI Spending Boosts Investor Confidence',
      source: 'MarketWatch',
      date: new Date(now.getTime() - 8 * 60 * 60_000).toISOString(),
      snippet: 'Technology shares in the Dow Jones rallied as major companies announced increased capital expenditure plans for artificial intelligence infrastructure.',
    },
    {
      headline: 'Oil Prices Steady as OPEC+ Considers Production Adjustment',
      source: 'Financial Times',
      date: new Date(now.getTime() - 10 * 60 * 60_000).toISOString(),
      snippet: 'Crude oil prices stabilized near recent levels as OPEC+ delegates indicated potential adjustments to production quotas in response to global demand uncertainty.',
    },
    {
      headline: 'Consumer Confidence Index Beats Expectations, Supporting US30 Rally',
      source: 'Yahoo Finance',
      date: new Date(now.getTime() - 12 * 60 * 60_000).toISOString(),
      snippet: 'The Conference Board reported consumer confidence rose more than expected, driven by improved labor market perceptions and optimism about business conditions.',
    },
  ];

  return {
    items,
    source: 'fallback',
    timestamp: now.toISOString(),
  };
}

export async function GET() {
  // Return cached if still valid
  if (cachedNews && cachedNews.expiry > Date.now()) {
    return NextResponse.json(cachedNews.data);
  }

  // Try live API first
  const liveNews = await fetchLiveNews();

  if (liveNews) {
    cachedNews = { data: liveNews, expiry: Date.now() + 300_000 }; // 5 min cache
    return NextResponse.json(liveNews);
  }

  // Fallback to static news
  const fallback = getFallbackNews();
  cachedNews = { data: fallback, expiry: Date.now() + 600_000 }; // 10 min cache for fallback
  return NextResponse.json(fallback);
}
