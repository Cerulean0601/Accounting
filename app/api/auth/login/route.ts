import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    if (email !== 'admin@test.com' || password !== '123456') {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }
    
    // 檢查用戶是否存在
    const existingUser = await db.query`
      SELECT user_id FROM users WHERE email = ${email}
    `;
    
    let userId;
    
    if (existingUser.rows.length === 0) {
      // 建立用戶
      const userResult = await db.query`
        INSERT INTO users (user_id, email, password_hash)
        VALUES (gen_random_uuid(), ${email}, 'hashed_password')
        RETURNING user_id
      `;
      
      userId = userResult.rows[0].user_id;
      
      // 建立預設帳戶
      await db.query`
        INSERT INTO accounts (account_id, user_id, name, type, initial_balance, current_balance, currency, is_default)
        VALUES 
          (gen_random_uuid(), ${userId}, '現金', 'cash', 5000, 5000, 'TWD', true),
          (gen_random_uuid(), ${userId}, '銀行帳戶', 'bank', 25000, 25000, 'TWD', false),
          (gen_random_uuid(), ${userId}, '信用卡', 'credit_card', 0, -2000, 'TWD', false)
      `;
      
      // 建立預設分類
      const categoryResult = await db.query`
        INSERT INTO categories (category_id, user_id, name, color)
        VALUES 
          (gen_random_uuid(), ${userId}, '餐飲', '#FF6384'),
          (gen_random_uuid(), ${userId}, '交通', '#36A2EB'),
          (gen_random_uuid(), ${userId}, '購物', '#FFCE56'),
          (gen_random_uuid(), ${userId}, '收入', '#4BC0C0')
        RETURNING category_id, name
      `;
      
      // 為每個分類建立子分類
      for (const category of categoryResult.rows) {
        if (category.name === '餐飲') {
          await db.query`
            INSERT INTO subcategories (subcategory_id, category_id, name)
            VALUES 
              (gen_random_uuid(), ${category.category_id}, '早餐'),
              (gen_random_uuid(), ${category.category_id}, '午餐'),
              (gen_random_uuid(), ${category.category_id}, '晚餐')
          `;
        } else if (category.name === '收入') {
          await db.query`
            INSERT INTO subcategories (subcategory_id, category_id, name)
            VALUES 
              (gen_random_uuid(), ${category.category_id}, '薪資'),
              (gen_random_uuid(), ${category.category_id}, '獎金')
          `;
        } else {
          await db.query`
            INSERT INTO subcategories (subcategory_id, category_id, name)
            VALUES (gen_random_uuid(), ${category.category_id}, '其他')
          `;
        }
      }
      
    } else {
      userId = existingUser.rows[0].user_id;
    }
    
    const token = auth.generateToken(userId);
    
    return NextResponse.json({
      token,
      user: { user_id: userId, email }
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    return NextResponse.json({ error: '登入失敗' }, { status: 500 });
  }
}
