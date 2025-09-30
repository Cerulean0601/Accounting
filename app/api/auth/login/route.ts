import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    const result = await db.query`
      SELECT user_id, email, password_hash, name 
      FROM users WHERE email = ${email}
    `;
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 401 });
    }
    
    const user = result.rows[0];
    const isValid = await auth.verifyPassword(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
    }
    
    const token = auth.generateToken(user.user_id);
    
    // 快取用戶會話
    await db.cache.set(`user:${user.user_id}:session`, token, { ex: 7 * 24 * 3600 });
    
    return NextResponse.json({
      token,
      user: { user_id: user.user_id, email: user.email, name: user.name }
    });
  } catch (error) {
    return NextResponse.json({ error: '登入失敗' }, { status: 500 });
  }
}
