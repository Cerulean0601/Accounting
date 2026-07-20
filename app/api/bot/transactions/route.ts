import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Bot 記帳 API — 不走 NextAuth session，用 API key 驗證。
 * 
 * POST /api/bot/transactions
 * Header: x-bot-key: <BOT_API_KEY>
 * Body: {
 *   amount: number (必填)
 *   subcategory_id?: string (直接指定子分類 ID)
 *   category_name?: string (用名稱模糊查找子分類，例如 "早餐"、"交通")
 *   account_name?: string (用名稱查找帳戶，預設用 default 帳戶)
 *   note?: string
 *   date?: string (YYYY-MM-DD，預設今天)
 * }
 * 
 * GET /api/bot/transactions/categories
 * Header: x-bot-key: <BOT_API_KEY>
 * 回傳所有分類和子分類（方便查詢 ID）
 */

function verifyApiKey(request: NextRequest): boolean {
  const key = request.headers.get('x-bot-key');
  const expected = process.env.BOT_API_KEY;
  if (!expected || !key) return false;
  return key === expected;
}

async function getUserId(): Promise<string | null> {
  const botUserId = process.env.BOT_USER_ID;
  if (!botUserId) return null; // 未設定 BOT_USER_ID 就擋掉
  return botUserId;
}

export async function GET(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: '未設定 BOT_USER_ID 環境變數' }, { status: 401 });
    }

    // 回傳所有分類、子分類、帳戶
    const categories = await db.query`
      SELECT c.category_id, c.name as category_name, c.type,
             s.subcategory_id, s.name as subcategory_name
      FROM categories c
      LEFT JOIN subcategories s ON c.category_id = s.category_id
      WHERE c.user_id = ${userId}
      ORDER BY c.type, c.name, s.sort_order
    `;

    const accounts = await db.query`
      SELECT account_id, name, type, current_balance, is_default
      FROM accounts
      WHERE user_id = ${userId}
      ORDER BY is_default DESC, name
    `;

    return NextResponse.json({
      categories: categories.rows,
      accounts: accounts.rows
    });
  } catch (error) {
    console.error('Bot API GET 錯誤:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: '未設定 BOT_USER_ID 環境變數' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, subcategory_id, category_name, account_name, note, date } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '金額必須大於 0' }, { status: 400 });
    }

    // 解析子分類
    let resolvedSubcategoryId = subcategory_id;
    if (!resolvedSubcategoryId && category_name) {
      // 用名稱模糊查找
      const subResult = await db.query`
        SELECT s.subcategory_id
        FROM subcategories s
        JOIN categories c ON s.category_id = c.category_id
        WHERE c.user_id = ${userId}
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
        WHERE user_id = ${userId} AND name ILIKE ${`%${account_name}%`}
        LIMIT 1
      `;
      if (accResult.rows.length > 0) {
        resolvedAccountId = accResult.rows[0].account_id;
      } else {
        return NextResponse.json({ error: `找不到帳戶: ${account_name}` }, { status: 400 });
      }
    } else {
      // 使用預設帳戶
      const defaultAcc = await db.query`
        SELECT account_id FROM accounts
        WHERE user_id = ${userId} AND is_default = true
        LIMIT 1
      `;
      if (defaultAcc.rows.length > 0) {
        resolvedAccountId = defaultAcc.rows[0].account_id;
      } else {
        const anyAcc = await db.query`
          SELECT account_id FROM accounts
          WHERE user_id = ${userId}
          LIMIT 1
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

    // 寫入交易
    await db.query`BEGIN`;

    const transactionResult = await db.query`
      INSERT INTO transactions (transaction_id, user_id, account_id, subcategory_id, amount, note, date)
      VALUES (gen_random_uuid(), ${userId}, ${resolvedAccountId}, ${resolvedSubcategoryId}, ${amount}, ${note || null}, ${transactionDate})
      RETURNING transaction_id, amount, note, date
    `;

    // 更新帳戶餘額
    const balanceChange = categoryType === 'expense' ? -amount : amount;
    await db.query`
      UPDATE accounts
      SET current_balance = current_balance + ${balanceChange}
      WHERE account_id = ${resolvedAccountId} AND user_id = ${userId}
    `;

    await db.query`COMMIT`;

    return NextResponse.json({
      success: true,
      transaction: transactionResult.rows[0],
      detail: {
        category: categoryResult.rows[0].category_name,
        subcategory: categoryResult.rows[0].subcategory_name,
        type: categoryType,
        balance_change: balanceChange
      }
    });
  } catch (error) {
    console.error('Bot API POST 錯誤:', error);
    try { await db.query`ROLLBACK`; } catch {}
    return NextResponse.json({ error: '新增交易失敗' }, { status: 500 });
  }
}
