import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * PUT /api/bot/transactions/[id] — 更新交易
 * DELETE /api/bot/transactions/[id] — 刪除交易
 */

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const { account_id, subcategory_id, amount, note, date } = body;

    if (!account_id || !amount || !subcategory_id) {
      return NextResponse.json({ error: '缺少必要欄位（account_id, subcategory_id, amount）' }, { status: 400 });
    }

    await db.query`BEGIN`;

    // 取得舊交易資料
    const oldTransaction = await db.query`
      SELECT t.amount, t.account_id, c.type as category_type
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.transaction_id = ${id} AND t.user_id = ${auth.userId}
    `;

    if (oldTransaction.rows.length === 0) {
      await db.query`ROLLBACK`;
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }

    const oldData = oldTransaction.rows[0];

    // 取得新分類類型
    const categoryResult = await db.query`
      SELECT c.type FROM categories c
      JOIN subcategories s ON c.category_id = s.category_id
      WHERE s.subcategory_id = ${subcategory_id}
    `;

    if (categoryResult.rows.length === 0) {
      await db.query`ROLLBACK`;
      return NextResponse.json({ error: '無效的子分類' }, { status: 400 });
    }

    const newCategoryType = categoryResult.rows[0].type;

    // 還原舊帳戶餘額
    const oldRevert = oldData.category_type === 'expense' ? oldData.amount : -oldData.amount;
    await db.query`
      UPDATE accounts SET current_balance = current_balance + ${oldRevert}
      WHERE account_id = ${oldData.account_id} AND user_id = ${auth.userId}
    `;

    // 更新交易
    const result = await db.query`
      UPDATE transactions
      SET account_id = ${account_id}, subcategory_id = ${subcategory_id},
          amount = ${amount}, note = ${note}, date = ${date}
      WHERE transaction_id = ${id} AND user_id = ${auth.userId}
      RETURNING transaction_id, amount, note, date
    `;

    // 更新新帳戶餘額
    const newChange = newCategoryType === 'expense' ? -amount : amount;
    await db.query`
      UPDATE accounts SET current_balance = current_balance + ${newChange}
      WHERE account_id = ${account_id} AND user_id = ${auth.userId}
    `;

    await db.query`COMMIT`;
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Bot PUT /transactions/[id] 錯誤:', error);
    try { await db.query`ROLLBACK`; } catch {}
    return NextResponse.json({ error: '更新交易失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    await db.query`BEGIN`;

    const transaction = await db.query`
      SELECT t.amount, t.account_id, c.type as category_type
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.transaction_id = ${id} AND t.user_id = ${auth.userId}
    `;

    if (transaction.rows.length === 0) {
      await db.query`ROLLBACK`;
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }

    const data = transaction.rows[0];
    const revert = data.category_type === 'expense' ? data.amount : -data.amount;

    await db.query`
      UPDATE accounts SET current_balance = current_balance + ${revert}
      WHERE account_id = ${data.account_id} AND user_id = ${auth.userId}
    `;

    await db.query`
      DELETE FROM transactions WHERE transaction_id = ${id} AND user_id = ${auth.userId}
    `;

    await db.query`COMMIT`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bot DELETE /transactions/[id] 錯誤:', error);
    try { await db.query`ROLLBACK`; } catch {}
    return NextResponse.json({ error: '刪除交易失敗' }, { status: 500 });
  }
}
