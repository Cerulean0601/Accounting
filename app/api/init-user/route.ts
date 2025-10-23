import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    
    // 檢查用戶是否已存在
    const existingUser = await db.query`
      SELECT user_id FROM users WHERE email = ${email}
    `;
    
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: '用戶已存在' }, { status: 400 });
    }
    
    // 建立用戶
    const hashedPassword = await auth.hashPassword(password);
    const userResult = await db.query`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email}, ${hashedPassword}, ${name})
      RETURNING user_id, email, name
    `;
    
    const user = userResult.rows[0];
    
    // 建立預設帳戶
    await db.query`
      INSERT INTO accounts (user_id, name, type, balance, currency, color)
      VALUES 
        (${user.user_id}, '現金', 'cash', 0, 'TWD', '#4CAF50'),
        (${user.user_id}, '銀行帳戶', 'bank', 0, 'TWD', '#2196F3'),
        (${user.user_id}, '信用卡', 'credit_card', 0, 'TWD', '#FF5722')
    `;
    
    // 建立預設分類
    await db.query`
      INSERT INTO categories (user_id, name, type, color)
      VALUES 
        (${user.user_id}, '餐飲', 'expense', '#FF6384'),
        (${user.user_id}, '交通', 'expense', '#36A2EB'),
        (${user.user_id}, '購物', 'expense', '#FFCE56'),
        (${user.user_id}, '娛樂', 'expense', '#4BC0C0'),
        (${user.user_id}, '薪資', 'income', '#4BC0C0'),
        (${user.user_id}, '獎金', 'income', '#36A2EB')
    `;
    
    const token = auth.generateToken(user.user_id);
    
    return NextResponse.json({
      token,
      user: { user_id: user.user_id, email: user.email, name: user.name }
    });
  } catch (error) {
    console.error('初始化用戶失敗:', error);
    return NextResponse.json({ error: '初始化用戶失敗' }, { status: 500 });
  }
}
