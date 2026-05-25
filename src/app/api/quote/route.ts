import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  source: 'live' | 'fallback';
  timestamp: string;
}

// Cache for 60 seconds to avoid hammering the API
let cachedQuote: { data: QuoteData; expiry: number } | null = null;

async function fetchLiveQuote(): Promise<QuoteData | null> {
  try {
    const response = await fetch(
      'https://internal-api.z.ai/external/finance/v1/markets/quote?ticker=^DJI&type=STOCKS',
      {
        headers: {
          'X-Z-AI-From': 'Z',
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Extract price data from the response
    const price = data?.data?.regularMarketPrice ?? data?.data?.price ?? data?.regularMarketPrice ?? data?.price;
    const prevClose = data?.data?.regularMarketPreviousClose ?? data?.data?.previousClose ?? data?.regularMarketPreviousClose ?? data?.previousClose;

    if (!price || typeof price !== 'number') return null;

    const change = prevClose ? price - prevClose : 0;
    const changePercent = prevClose ? (change / prevClose) * 100 : 0;

    return {
      price,
      change,
      changePercent,
      source: 'live',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function getFallbackQuote(): QuoteData {
  // Use latest close from backtest data as fallback
  try {
    const filePath = path.join(process.cwd(), 'upload', 'backtest_results.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const refClose = data?.forecast?.reference_close ?? 0;
    const refOpen = data?.forecast?.reference_open ?? 0;
    const change = refClose && refOpen ? refClose - refOpen : 0;
    const changePercent = refOpen ? (change / refOpen) * 100 : 0;

    return {
      price: refClose || 42000,
      change,
      changePercent,
      source: 'fallback',
      timestamp: data?.metadata?.backtest_date ?? new Date().toISOString(),
    };
  } catch {
    return {
      price: 42000,
      change: 0,
      changePercent: 0,
      source: 'fallback',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function GET() {
  // Return cached if still valid
  if (cachedQuote && cachedQuote.expiry > Date.now()) {
    return NextResponse.json(cachedQuote.data);
  }

  // Try live API first
  const liveQuote = await fetchLiveQuote();

  if (liveQuote) {
    cachedQuote = { data: liveQuote, expiry: Date.now() + 60_000 };
    return NextResponse.json(liveQuote);
  }

  // Fallback to backtest data
  const fallback = getFallbackQuote();
  cachedQuote = { data: fallback, expiry: Date.now() + 300_000 }; // Cache fallback longer
  return NextResponse.json(fallback);
}
