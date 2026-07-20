import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * GET /api/bot/accounts — 列出帳戶
 * POST /api/bot/accounts — 新增帳戶
 */

export async function GET(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const result = await db.query`
      SELECT account_id, name, type, initial_balance, current_balance, currency, is_default
      FROM accounts
      WHERE user_id = ${auth.userId}
      ORDER BY is_default DESC, name
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Bot GET /accounts 錯誤:', error);
    return NextResponse.json({ error: '取得帳戶失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { name, type = 'cash', initial_balance = 0, currency = 'TWD', is_default = false } = body;

    if (!name) {
      return NextResponse.json({ error: '帳戶名稱為必填' }, { status: 400 });
    }

    const result = await db.query`
      INSERT INTO accounts (account_id, user_id, name, type, initial_balance, current_balance, currency, is_default)
      VALUES (gen_random_uuid(), ${auth.userId}, ${name}, ${type}, ${initial_balance}, ${initial_balance}, ${currency}, ${is_default})
      RETURNING account_id, name, type, initial_balance, current_balance, currency, is_default
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Bot POST /accounts 錯誤:', error);
    return NextResponse.json({ error: '新增帳戶失敗' }, { status: 500 });
  }
}
