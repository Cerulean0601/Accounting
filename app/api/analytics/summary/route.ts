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
    const cacheKey = `analytics:${user.userId}:${year}-${month}`;
    const cached = await db.cache.get(cacheKey);
    if (cached) return NextResponse.json(cached);
    
    // 本月總支出
    const expenseResult = await db.query`
      SELECT COALESCE(SUM(amount), 0) as total_expense
      FROM transactions 
      WHERE user_id = ${user.userId} 
        AND type = 'expense'
        AND EXTRACT(MONTH FROM date) = ${month}
        AND EXTRACT(YEAR FROM date) = ${year}
    `;
    
    // 本月總收入
    const incomeResult = await db.query`
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM transactions 
      WHERE user_id = ${user.userId} 
        AND type = 'income'
        AND EXTRACT(MONTH FROM date) = ${month}
        AND EXTRACT(YEAR FROM date) = ${year}
    `;
    
    // 分類統計
    const categoryResult = await db.query`
      SELECT category, SUM(amount) as amount, COUNT(*) as count
      FROM transactions 
      WHERE user_id = ${user.userId} 
        AND type = 'expense'
        AND EXTRACT(MONTH FROM date) = ${month}
        AND EXTRACT(YEAR FROM date) = ${year}
      GROUP BY category
      ORDER BY amount DESC
    `;
    
    // 帳戶餘額
    const accountResult = await db.query`
      SELECT name, balance, type
      FROM accounts 
      WHERE user_id = ${user.userId} AND is_active = true
      ORDER BY balance DESC
    `;
    
    const summary = {
      total_expense: parseFloat(expenseResult.rows[0].total_expense),
      total_income: parseFloat(incomeResult.rows[0].total_income),
      net_income: parseFloat(incomeResult.rows[0].total_income) - parseFloat(expenseResult.rows[0].total_expense),
      categories: categoryResult.rows,
      accounts: accountResult.rows
    };
    
    // 快取 1 小時
    await db.cache.set(cacheKey, summary, { ex: 3600 });
    
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: '取得統計失敗' }, { status: 500 });
  }
}
