import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * PUT /api/bot/investments/[id] — 更新持倉（減碼/修改）
 *   body: { shares?, avg_cost?, name?, buy_rate?, sell_shares? }
 *   sell_shares: 賣出數量（從 shares 扣除）
 *
 * DELETE /api/bot/investments/[id] — 移除持倉
 */

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const { sell_shares, shares, avg_cost, name, buy_rate } = body;

    // 取得現有資料
    const existing = await db.query`
      SELECT id, shares, avg_cost, name, buy_rate
      FROM investments
      WHERE id = ${id} AND user_id = ${auth.userId}
    `;

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '持倉不存在' }, { status: 404 });
    }

    const current = existing.rows[0];

    // 處理賣出
    if (sell_shares) {
      const currentShares = parseFloat(current.shares);
      if (sell_shares > currentShares) {
        return NextResponse.json({ error: `賣出數量 (${sell_shares}) 超過持有數量 (${currentShares})` }, { status: 400 });
      }

      const newShares = currentShares - sell_shares;

      if (newShares === 0) {
        // 全部賣出，刪除持倉
        await db.query`
          DELETE FROM investments WHERE id = ${id} AND user_id = ${auth.userId}
        `;
        return NextResponse.json({ action: 'sold_all', symbol: current.symbol });
      }

      const result = await db.query`
        UPDATE investments
        SET shares = ${newShares}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${auth.userId}
        RETURNING id, symbol, name, type, shares, avg_cost, currency, buy_rate, inserted_at, updated_at
      `;

      return NextResponse.json({
        action: 'sold_partial',
        sold_shares: sell_shares,
        investment: result.rows[0],
      });
    }

    // 直接更新欄位
    const newShares = shares !== undefined ? shares : current.shares;
    const newAvgCost = avg_cost !== undefined ? avg_cost : current.avg_cost;
    const newName = name !== undefined ? name : current.name;
    const newBuyRate = buy_rate !== undefined ? buy_rate : current.buy_rate;

    const result = await db.query`
      UPDATE investments
      SET shares = ${newShares}, avg_cost = ${newAvgCost}, name = ${newName}, buy_rate = ${newBuyRate}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${auth.userId}
      RETURNING id, symbol, name, type, shares, avg_cost, currency, buy_rate, inserted_at, updated_at
    `;

    return NextResponse.json({
      action: 'updated',
      investment: result.rows[0],
    });
  } catch (error) {
    console.error('Bot PUT /investments/[id] 錯誤:', error);
    return NextResponse.json({ error: '更新持倉失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    const result = await db.query`
      DELETE FROM investments WHERE id = ${id} AND user_id = ${auth.userId}
      RETURNING symbol
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '持倉不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, symbol: result.rows[0].symbol });
  } catch (error) {
    console.error('Bot DELETE /investments/[id] 錯誤:', error);
    return NextResponse.json({ error: '刪除持倉失敗' }, { status: 500 });
  }
}
