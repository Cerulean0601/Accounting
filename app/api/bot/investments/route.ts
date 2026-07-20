import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * GET /api/bot/investments — 列出所有持倉
 * POST /api/bot/investments — 新增或加碼持倉
 *
 * POST body:
 * {
 *   symbol: string       (標的代號，如 "0050", "AAPL", "USD")
 *   name: string         (顯示名稱)
 *   type: string         (台股/ETF/美股/債券/外匯)
 *   shares: number       (本次買入數量，支援小數)
 *   cost: number         (本次買入單價，原幣計)
 *   currency?: string    (預設 TWD)
 *   buy_rate?: number    (買入匯率，台幣標的預設 1)
 * }
 *
 * 如果 symbol 已存在：加碼並重算均價
 * 如果 symbol 不存在：新建持倉
 */

export async function GET(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const result = await db.query`
      SELECT id, symbol, name, type, shares, avg_cost, currency, buy_rate, inserted_at, updated_at
      FROM investments
      WHERE user_id = ${auth.userId}
      ORDER BY type, symbol
    `;

    return NextResponse.json(result.rows);
  } catch (error: any) {
    // 資料表不存在時自動建立
    if (error?.code === '42P01') {
      await db.query`
        CREATE TABLE IF NOT EXISTS investments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          symbol VARCHAR(20) NOT NULL,
          name VARCHAR(100) NOT NULL,
          type VARCHAR(20) NOT NULL,
          shares DECIMAL(18, 6) NOT NULL DEFAULT 0,
          avg_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
          currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
          buy_rate DECIMAL(18, 6) NOT NULL DEFAULT 1,
          inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await db.query`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_investments_user_symbol ON investments(user_id, symbol)
      `;
      return NextResponse.json([]);
    }
    console.error('Bot GET /investments 錯誤:', error);
    return NextResponse.json({ error: '取得投資持倉失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { symbol, name, type, shares, cost, currency = 'TWD', buy_rate = 1 } = body;

    if (!symbol || !name || !type || !shares || !cost) {
      return NextResponse.json({ error: '缺少必要欄位（symbol, name, type, shares, cost）' }, { status: 400 });
    }

    if (shares <= 0 || cost <= 0) {
      return NextResponse.json({ error: 'shares 和 cost 必須大於 0' }, { status: 400 });
    }

    // 確保資料表存在
    await db.query`
      CREATE TABLE IF NOT EXISTS investments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        shares DECIMAL(18, 6) NOT NULL DEFAULT 0,
        avg_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
        currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
        buy_rate DECIMAL(18, 6) NOT NULL DEFAULT 1,
        inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // 檢查是否已有此標的
    const existing = await db.query`
      SELECT id, shares, avg_cost, buy_rate
      FROM investments
      WHERE user_id = ${auth.userId} AND symbol = ${symbol.toUpperCase()}
    `;

    if (existing.rows.length > 0) {
      // 加碼：重算均價和加權匯率
      const old = existing.rows[0];
      const oldShares = parseFloat(old.shares);
      const oldCost = parseFloat(old.avg_cost);
      const oldRate = parseFloat(old.buy_rate);
      const newShares = oldShares + shares;
      const newAvgCost = (oldShares * oldCost + shares * cost) / newShares;
      const newBuyRate = (oldShares * oldRate + shares * buy_rate) / newShares;

      const result = await db.query`
        UPDATE investments
        SET shares = ${newShares},
            avg_cost = ${newAvgCost},
            buy_rate = ${newBuyRate},
            updated_at = NOW()
        WHERE id = ${old.id} AND user_id = ${auth.userId}
        RETURNING id, symbol, name, type, shares, avg_cost, currency, buy_rate, inserted_at, updated_at
      `;

      return NextResponse.json({
        action: 'add_position',
        investment: result.rows[0],
      });
    } else {
      // 新建持倉
      const result = await db.query`
        INSERT INTO investments (user_id, symbol, name, type, shares, avg_cost, currency, buy_rate)
        VALUES (${auth.userId}, ${symbol.toUpperCase()}, ${name}, ${type}, ${shares}, ${cost}, ${currency}, ${buy_rate})
        RETURNING id, symbol, name, type, shares, avg_cost, currency, buy_rate, inserted_at, updated_at
      `;

      return NextResponse.json({
        action: 'new_position',
        investment: result.rows[0],
      });
    }
  } catch (error) {
    console.error('Bot POST /investments 錯誤:', error);
    return NextResponse.json({ error: '新增投資持倉失敗' }, { status: 500 });
  }
}
