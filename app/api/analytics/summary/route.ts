import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().getMonth() + 1;
  const year = searchParams.get('year') || new Date().getFullYear();
  
  try {
    // 本月總支出
    const expenseResult = await db.query`
      SELECT COALESCE(SUM(t.amount), 0) as total_expense
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.user_id = ${user.userId} 
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
      WHERE t.user_id = ${user.userId} 
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
      WHERE t.user_id = ${user.userId} 
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
      WHERE user_id = ${user.userId}
      ORDER BY current_balance DESC
    `;
    
    const summary = {
      total_expense: parseFloat(expenseResult.rows[0].total_expense),
      total_income: parseFloat(incomeResult.rows[0].total_income),
      net_income: parseFloat(incomeResult.rows[0].total_income) - parseFloat(expenseResult.rows[0].total_expense),
      categories: categoryResult.rows.map(row => ({
        category: row.category || '未分類',
        amount: parseFloat(row.amount),
        count: parseInt(row.count)
      })),
      accounts: accountResult.rows.map(row => ({
        name: row.name,
        balance: parseFloat(row.balance),
        type: row.type
      }))
    };
    
    return NextResponse.json(summary);
  } catch (error) {
    console.error('GET /api/analytics/summary - 錯誤:', error);
    return NextResponse.json({ error: '取得統計失敗' }, { status: 500 });
  }
}
