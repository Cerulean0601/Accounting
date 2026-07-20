import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * POST /api/bot/transfers — 帳戶間轉帳
 * Body: {
 *   from_account: string  (來源帳戶名稱)
 *   to_account: string    (目標帳戶名稱)
 *   amount: number        (金額，必須大於 0)
 *   note?: string         (備註)
 *   date?: string         (日期 YYYY-MM-DD，預設今天)
 * }
 *
 * 行為：from 帳戶扣錢、to 帳戶加錢，不計入收支統計。
 */

export async function POST(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { from_account, to_account, amount, note, date } = body;

    if (!from_account || !to_account) {
      return NextResponse.json({ error: '需要 from_account 和 to_account' }, { status: 400 });
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '金額必須大於 0' }, { status: 400 });
    }

    if (from_account === to_account) {
      return NextResponse.json({ error: '來源和目標帳戶不能相同' }, { status: 400 });
    }

    // 查找來源帳戶
    const fromResult = await db.query`
      SELECT account_id, name, current_balance
      FROM accounts
      WHERE user_id = ${auth.userId} AND name ILIKE ${`%${from_account}%`}
      LIMIT 1
    `;

    if (fromResult.rows.length === 0) {
      return NextResponse.json({ error: `找不到來源帳戶: ${from_account}` }, { status: 400 });
    }

    // 查找目標帳戶
    const toResult = await db.query`
      SELECT account_id, name, current_balance
      FROM accounts
      WHERE user_id = ${auth.userId} AND name ILIKE ${`%${to_account}%`}
      LIMIT 1
    `;

    if (toResult.rows.length === 0) {
      return NextResponse.json({ error: `找不到目標帳戶: ${to_account}` }, { status: 400 });
    }

    const fromAccount = fromResult.rows[0];
    const toAccount = toResult.rows[0];

    // 執行轉帳
    await db.query`BEGIN`;

    // 來源扣錢
    await db.query`
      UPDATE accounts
      SET current_balance = current_balance - ${amount}
      WHERE account_id = ${fromAccount.account_id} AND user_id = ${auth.userId}
    `;

    // 目標加錢
    await db.query`
      UPDATE accounts
      SET current_balance = current_balance + ${amount}
      WHERE account_id = ${toAccount.account_id} AND user_id = ${auth.userId}
    `;

    await db.query`COMMIT`;

    const fromNewBalance = parseFloat(fromAccount.current_balance) - amount;
    const toNewBalance = parseFloat(toAccount.current_balance) + amount;

    return NextResponse.json({
      success: true,
      transfer: {
        from: { name: fromAccount.name, balance: fromNewBalance },
        to: { name: toAccount.name, balance: toNewBalance },
        amount,
        note: note || null,
        date: date || new Date().toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Bot POST /transfers 錯誤:', error);
    try { await db.query`ROLLBACK`; } catch {}
    return NextResponse.json({ error: '轉帳失敗' }, { status: 500 });
  }
}
