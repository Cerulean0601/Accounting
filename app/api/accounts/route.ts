import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  try {
    const result = await db.query`
      SELECT account_id, name, type, initial_balance, current_balance, currency, is_default
      FROM accounts 
      WHERE user_id = ${user.userId}
      ORDER BY is_default DESC, name
    `;
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/accounts - 錯誤:', error);
    return NextResponse.json({ error: '取得帳戶失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  try {
    const { name, type, initial_balance = 0, currency = 'TWD', is_default = false } = await request.json();
    
    const result = await db.query`
      INSERT INTO accounts (account_id, user_id, name, type, initial_balance, current_balance, currency, is_default)
      VALUES (gen_random_uuid(), ${user.userId}, ${name}, ${type}, ${initial_balance}, ${initial_balance}, ${currency}, ${is_default})
      RETURNING account_id, name, type, initial_balance, current_balance, currency, is_default
    `;
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('POST /api/accounts - 錯誤:', error);
    return NextResponse.json({ error: '新增帳戶失敗' }, { status: 500 });
  }
}
