import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const accountId = searchParams.get('account_id');
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  
  try {
    let query = `
      SELECT t.*, a.name as account_name
      FROM transactions t
      JOIN accounts a ON t.account_id = a.account_id
      WHERE t.user_id = $1
    `;
    const params = [user.userId];
    let paramIndex = 2;
    
    if (accountId) {
      query += ` AND t.account_id = $${paramIndex}`;
      params.push(accountId);
      paramIndex++;
    }
    
    if (category) {
      query += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    
    if (type) {
      query += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }
    
    query += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, (page - 1) * limit);
    
    const result = await db.query(query, params);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: '取得交易失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  try {
    const { account_id, amount, type, category, tags = [], note, date } = await request.json();
    
    // 開始交易
    await db.query`BEGIN`;
    
    // 新增交易記錄
    const transactionResult = await db.query`
      INSERT INTO transactions (user_id, account_id, amount, type, category, tags, note, date)
      VALUES (${user.userId}, ${account_id}, ${amount}, ${type}, ${category}, ${tags}, ${note}, ${date})
      RETURNING *
    `;
    
    // 更新帳戶餘額
    const balanceChange = type === 'expense' ? -amount : amount;
    await db.query`
      UPDATE accounts 
      SET balance = balance + ${balanceChange}, updated_at = NOW()
      WHERE account_id = ${account_id}
    `;
    
    await db.query`COMMIT`;
    
    // 清除相關快取
    await Promise.all([
      db.cache.del(`accounts:${user.userId}`),
      db.cache.del(`balance:${account_id}`),
      db.cache.del(`analytics:${user.userId}:${new Date().getMonth() + 1}`)
    ]);
    
    return NextResponse.json(transactionResult.rows[0]);
  } catch (error) {
    await db.query`ROLLBACK`;
    return NextResponse.json({ error: '新增交易失敗' }, { status: 500 });
  }
}
