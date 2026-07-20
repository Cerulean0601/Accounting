import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/cron/fetch-prices
 * Vercel Cron 每天觸發，抓取所有持倉標的的收盤價和匯率。
 * 驗證：Vercel 帶 Authorization: Bearer <CRON_SECRET>
 */

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  try {
    // 確保 price_cache 表存在
    await db.query`
      CREATE TABLE IF NOT EXISTS price_cache (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        symbol VARCHAR(20) NOT NULL,
        close_price DECIMAL(18, 6) NOT NULL,
        exchange_rate DECIMAL(18, 6) NOT NULL DEFAULT 1,
        date DATE NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await db.query`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_price_cache_symbol_date ON price_cache(symbol, date)
    `;

    // 取得所有持倉的 symbol 和 type
    const investments = await db.query`
      SELECT DISTINCT symbol, type, currency FROM investments
    `;

    if (investments.rows.length === 0) {
      return NextResponse.json({ message: '沒有持倉，跳過', updated: 0 });
    }

    const today = new Date().toISOString().split('T')[0];
    let updated = 0;
    const errors: string[] = [];

    // 分類處理
    const twStocks = investments.rows.filter(r => r.type === '台股' || r.type === 'ETF');
    const usStocks = investments.rows.filter(r => r.type === '美股');
    const forex = investments.rows.filter(r => r.type === '外匯');
    const bonds = investments.rows.filter(r => r.type === '債券');

    // 1. 抓台股/ETF 收盤價
    if (twStocks.length > 0) {
      try {
        const twseRes = await fetch(
          'https://www.twse.com.tw/exchangeReport/STOCK_DAY_ALL?response=json',
          { signal: AbortSignal.timeout(10000) }
        );
        if (twseRes.ok) {
          const twseData = await twseRes.json();
          const rows = twseData.data || [];
          // TWSE 回傳格式: [日期, 代號, 名稱, 成交量, 成交金額, 開盤, 最高, 最低, 收盤, ...]
          for (const stock of twStocks) {
            const row = rows.find((r: string[]) => r[0] === stock.symbol);
            if (row) {
              const closePrice = parseFloat(row[8].replace(/,/g, ''));
              if (!isNaN(closePrice)) {
                await upsertPrice(stock.symbol, closePrice, 1, today);
                updated++;
              }
            }
          }
        }
      } catch (e: any) {
        // TWSE API 有時回傳不同格式，嘗試個股 API
        for (const stock of twStocks) {
          try {
            const price = await fetchTwseIndividual(stock.symbol);
            if (price) {
              await upsertPrice(stock.symbol, price, 1, today);
              updated++;
            }
          } catch (e2: any) {
            errors.push(`${stock.symbol}: ${e2.message}`);
          }
        }
      }
    }

    // 2. 抓匯率（USD/TWD 等）
    let usdToTwd = 1;
    try {
      const fxRes = await fetch(
        'https://api.frankfurter.app/latest?from=USD&to=TWD',
        { signal: AbortSignal.timeout(10000) }
      );
      if (fxRes.ok) {
        const fxData = await fxRes.json();
        usdToTwd = fxData.rates?.TWD || 32;
      }
    } catch (e: any) {
      errors.push(`匯率抓取失敗: ${e.message}`);
    }

    // 3. 外匯標的
    for (const fx of forex) {
      try {
        const fxRes = await fetch(
          `https://api.frankfurter.app/latest?from=${fx.symbol}&to=TWD`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (fxRes.ok) {
          const fxData = await fxRes.json();
          const rate = fxData.rates?.TWD;
          if (rate) {
            // 外匯的 close_price = 1（一單位外幣），exchange_rate = 對 TWD 匯率
            await upsertPrice(fx.symbol, 1, rate, today);
            updated++;
          }
        }
      } catch (e: any) {
        errors.push(`${fx.symbol}: ${e.message}`);
      }
    }

    // 4. 抓美股收盤價
    for (const stock of usStocks) {
      try {
        const yahooRes = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=1d`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (yahooRes.ok) {
          const yahooData = await yahooRes.json();
          const meta = yahooData.chart?.result?.[0]?.meta;
          const closePrice = meta?.regularMarketPrice;
          if (closePrice) {
            await upsertPrice(stock.symbol, closePrice, usdToTwd, today);
            updated++;
          }
        }
      } catch (e: any) {
        errors.push(`${stock.symbol}: ${e.message}`);
      }
    }

    // 5. 債券暫時跳過（沒有好的免費 API）
    if (bonds.length > 0) {
      errors.push(`債券標的 (${bonds.map(b => b.symbol).join(', ')}) 暫不支援自動抓價`);
    }

    return NextResponse.json({
      message: '抓價完成',
      date: today,
      updated,
      total: investments.rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Cron fetch-prices 錯誤:', error);
    return NextResponse.json({ error: '抓價失敗: ' + error.message }, { status: 500 });
  }
}

async function upsertPrice(symbol: string, closePrice: number, exchangeRate: number, date: string) {
  await db.query`
    INSERT INTO price_cache (symbol, close_price, exchange_rate, date, updated_at)
    VALUES (${symbol}, ${closePrice}, ${exchangeRate}, ${date}, NOW())
    ON CONFLICT (symbol, date)
    DO UPDATE SET close_price = ${closePrice}, exchange_rate = ${exchangeRate}, updated_at = NOW()
  `;
}

async function fetchTwseIndividual(symbol: string): Promise<number | null> {
  // 用個股日成交資訊 API
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const res = await fetch(
    `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${dateStr}&stockNo=${symbol}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const rows = data.data;
  if (!rows || rows.length === 0) return null;
  // 取最後一筆（最新日期）
  const lastRow = rows[rows.length - 1];
  const closePrice = parseFloat(lastRow[6]?.replace(/,/g, ''));
  return isNaN(closePrice) ? null : closePrice;
}
