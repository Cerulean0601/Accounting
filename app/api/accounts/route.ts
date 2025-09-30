import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  try {
    // 檢查快取
    const cached = await db.cache.get(`accounts:${user.userId}`);
    if (cached) return NextResponse.json(cached);
    
    const result = await db.query`
      SELECT account_id, name, type, balance, currency, color, is_active
      FROM accounts 
      WHERE user_id = ${user.userId} AND is_active = true
      ORDER BY name
    `;
    
    // 快取結果
    await db.cache.set(`accounts:${user.userId}`, result.rows, { ex: 24 * 3600 });
    
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: '取得帳戶失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  try {
    const { name, type, currency = 'TWD', color } = await request.json();
    
    const result = await db.query`
      INSERT INTO accounts (user_id, name, type, currency, color)
      VALUES (${user.userId}, ${name}, ${type}, ${currency}, ${color})
      RETURNING account_id, name, type, balance, currency, color
    `;
    
    // 清除快取
    await db.cache.del(`accounts:${user.userId}`);
    
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: '新增帳戶失敗' }, { status: 500 });
  }
}
