import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * PUT /api/bot/accounts/[id] — 更新帳戶
 * DELETE /api/bot/accounts/[id] — 刪除帳戶
 */

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const { name, type, current_balance } = body;

    const result = await db.query`
      UPDATE accounts
      SET name = ${name}, type = ${type}, current_balance = ${current_balance}
      WHERE account_id = ${id} AND user_id = ${auth.userId}
      RETURNING account_id, name, type, initial_balance, current_balance, currency, is_default
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '帳戶不存在' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Bot PUT /accounts/[id] 錯誤:', error);
    return NextResponse.json({ error: '更新帳戶失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    const transactionCheck = await db.query`
      SELECT COUNT(*) as count FROM transactions
      WHERE account_id = ${id} AND user_id = ${auth.userId}
    `;

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return NextResponse.json({ error: '此帳戶有相關交易記錄，無法刪除' }, { status: 400 });
    }

    const result = await db.query`
      DELETE FROM accounts WHERE account_id = ${id} AND user_id = ${auth.userId}
      RETURNING account_id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '帳戶不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bot DELETE /accounts/[id] 錯誤:', error);
    return NextResponse.json({ error: '刪除帳戶失敗' }, { status: 500 });
  }
}
