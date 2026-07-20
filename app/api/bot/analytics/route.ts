import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * GET /api/bot/analytics — 取得月份統計摘要
 * Query params: ?month=7&year=2026 (預設當月)
 */

export async function GET(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || (new Date().getMonth() + 1).toString();
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  try {
    // 本月總支出
    const expenseResult = await db.query`
      SELECT COALESCE(SUM(t.amount), 0) as total_expense
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.user_id = ${auth.userId}
        AND c.type = 'expense'
        AND EXTRACT(MONTH FROM t.date) = ${month}
        AND EXTRACT(YEAR FROM t.date) = ${year}
    `;

    // 本月總收入
    const incomeResult = await db.query`
      SELECT COALESCE(SUM(t.amount), 0) as total_income
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.user_id = ${auth.userId}
        AND c.type = 'income'
        AND EXTRACT(MONTH FROM t.date) = ${month}
        AND EXTRACT(YEAR FROM t.date) = ${year}
    `;

    // 分類統計
    const categoryResult = await db.query`
      SELECT c.name as category, SUM(t.amount) as amount, COUNT(*) as count
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.user_id = ${auth.userId}
        AND c.type = 'expense'
        AND EXTRACT(MONTH FROM t.date) = ${month}
        AND EXTRACT(YEAR FROM t.date) = ${year}
      GROUP BY c.name
      ORDER BY amount DESC
    `;

    // 帳戶餘額
    const accountResult = await db.query`
      SELECT name, current_balance as balance, type
      FROM accounts
      WHERE user_id = ${auth.userId}
      ORDER BY current_balance DESC
    `;

    const totalExpense = parseFloat(expenseResult.rows[0].total_expense);
    const totalIncome = parseFloat(incomeResult.rows[0].total_income);

    return NextResponse.json({
      month: parseInt(month as string),
      year: parseInt(year as string),
      total_expense: totalExpense,
      total_income: totalIncome,
      net_income: totalIncome - totalExpense,
      categories: categoryResult.rows.map(row => ({
        category: row.category || '未分類',
        amount: parseFloat(row.amount),
        count: parseInt(row.count),
      })),
      accounts: accountResult.rows.map(row => ({
        name: row.name,
        balance: parseFloat(row.balance),
        type: row.type,
      })),
    });
  } catch (error) {
    console.error('Bot GET /analytics 錯誤:', error);
    return NextResponse.json({ error: '取得統計失敗' }, { status: 500 });
  }
}
