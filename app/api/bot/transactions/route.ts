import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * GET /api/bot/transactions — 查詢分類與帳戶列表
 * POST /api/bot/transactions — 新增交易
 */

export async function GET(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const categories = await db.query`
      SELECT c.category_id, c.name as category_name, c.type,
             s.subcategory_id, s.name as subcategory_name
      FROM categories c
      LEFT JOIN subcategories s ON c.category_id = s.category_id
      WHERE c.user_id = ${auth.userId}
      ORDER BY c.type, c.name, s.sort_order
    `;

    const accounts = await db.query`
      SELECT account_id, name, type, current_balance, is_default
      FROM accounts
      WHERE user_id = ${auth.userId}
      ORDER BY is_default DESC, name
    `;

    return NextResponse.json({
      categories: categories.rows,
      accounts: accounts.rows,
    });
  } catch (error) {
    console.error('Bot GET /transactions 錯誤:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { amount, subcategory_id, category_name, account_name, note, date } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '金額必須大於 0' }, { status: 400 });
    }

    // 解析子分類
    let resolvedSubcategoryId = subcategory_id;
    if (!resolvedSubcategoryId && category_name) {
      const subResult = await db.query`
        SELECT s.subcategory_id
        FROM subcategories s
        JOIN categories c ON s.category_id = c.category_id
        WHERE c.user_id = ${auth.userId}
          AND (s.name ILIKE ${`%${category_name}%`} OR c.name ILIKE ${`%${category_name}%`})
        LIMIT 1
      `;
      if (subResult.rows.length > 0) {
        resolvedSubcategoryId = subResult.rows[0].subcategory_id;
      }
    }

    if (!resolvedSubcategoryId) {
      return NextResponse.json({ error: '找不到對應分類，請提供 subcategory_id 或有效的 category_name' }, { status: 400 });
    }

    // 解析帳戶
    let resolvedAccountId: string;
    if (account_name) {
      const accResult = await db.query`
        SELECT account_id FROM accounts
        WHERE user_id = ${auth.userId} AND name ILIKE ${`%${account_name}%`}
        LIMIT 1
      `;
      if (accResult.rows.length > 0) {
        resolvedAccountId = accResult.rows[0].account_id;
      } else {
        return NextResponse.json({ error: `找不到帳戶: ${account_name}` }, { status: 400 });
      }
    } else {
      const defaultAcc = await db.query`
        SELECT account_id FROM accounts
        WHERE user_id = ${auth.userId} AND is_default = true
        LIMIT 1
      `;
      if (defaultAcc.rows.length > 0) {
        resolvedAccountId = defaultAcc.rows[0].account_id;
      } else {
        const anyAcc = await db.query`
          SELECT account_id FROM accounts WHERE user_id = ${auth.userId} LIMIT 1
        `;
        if (anyAcc.rows.length === 0) {
          return NextResponse.json({ error: '找不到帳戶' }, { status: 400 });
        }
        resolvedAccountId = anyAcc.rows[0].account_id;
      }
    }

    // 取得分類類型
    const categoryResult = await db.query`
      SELECT c.type, c.name as category_name, s.name as subcategory_name
      FROM categories c
      JOIN subcategories s ON c.category_id = s.category_id
      WHERE s.subcategory_id = ${resolvedSubcategoryId}
    `;

    if (categoryResult.rows.length === 0) {
      return NextResponse.json({ error: '無效的子分類' }, { status: 400 });
    }

    const categoryType = categoryResult.rows[0].type;
    const transactionDate = date || new Date().toISOString().split('T')[0];

    await db.query`BEGIN`;

    const transactionResult = await db.query`
      INSERT INTO transactions (transaction_id, user_id, account_id, subcategory_id, amount, note, date)
      VALUES (gen_random_uuid(), ${auth.userId}, ${resolvedAccountId}, ${resolvedSubcategoryId}, ${amount}, ${note || null}, ${transactionDate})
      RETURNING transaction_id, amount, note, date
    `;

    const balanceChange = categoryType === 'expense' ? -amount : amount;
    await db.query`
      UPDATE accounts
      SET current_balance = current_balance + ${balanceChange}
      WHERE account_id = ${resolvedAccountId} AND user_id = ${auth.userId}
    `;

    await db.query`COMMIT`;

    return NextResponse.json({
      success: true,
      transaction: transactionResult.rows[0],
      detail: {
        category: categoryResult.rows[0].category_name,
        subcategory: categoryResult.rows[0].subcategory_name,
        type: categoryType,
        balance_change: balanceChange,
      },
    });
  } catch (error) {
    console.error('Bot POST /transactions 錯誤:', error);
    try { await db.query`ROLLBACK`; } catch {}
    return NextResponse.json({ error: '新增交易失敗' }, { status: 500 });
  }
}
