import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'upload', 'backtest_results.json');
    const data = fs.readFileSync(filePath, 'utf-8');
    const results = JSON.parse(data);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error reading backtest results:', error);
    return NextResponse.json(
      { error: 'Failed to load backtest results' },
      { status: 500 }
    );
  }
}
