import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '請填寫 Email 和密碼' }, { status: 400 });
    }

    const existing = await db.query`
      SELECT user_id FROM users WHERE email = ${email}
    `;
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: '此 Email 已被註冊' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await db.query`
      INSERT INTO users (user_id, email, password_hash, name, provider)
      VALUES (gen_random_uuid(), ${email}, ${hash}, ${name || email.split('@')[0]}, 'credentials')
      RETURNING user_id
    `;
    const userId = result.rows[0].user_id;

    // 建立預設帳戶
    await db.query`
      INSERT INTO accounts (account_id, user_id, name, type, initial_balance, current_balance, currency, is_default)
      VALUES
        (gen_random_uuid(), ${userId}, '現金', 'cash', 0, 0, 'TWD', true),
        (gen_random_uuid(), ${userId}, '銀行帳戶', 'bank', 0, 0, 'TWD', false),
        (gen_random_uuid(), ${userId}, '信用卡', 'credit_card', 0, 0, 'TWD', false)
    `;

    // 建立預設分類
    const cats = await db.query`
      INSERT INTO categories (category_id, user_id, name, type, color)
      VALUES
        (gen_random_uuid(), ${userId}, '餐飲', 'expense', '#FF6384'),
        (gen_random_uuid(), ${userId}, '交通', 'expense', '#36A2EB'),
        (gen_random_uuid(), ${userId}, '購物', 'expense', '#FFCE56'),
        (gen_random_uuid(), ${userId}, '娛樂', 'expense', '#4BC0C0'),
        (gen_random_uuid(), ${userId}, '薪資', 'income', '#4BC0C0'),
        (gen_random_uuid(), ${userId}, '獎金', 'income', '#36A2EB')
      RETURNING category_id, name
    `;

    for (const cat of cats.rows) {
      if (cat.name === '餐飲') {
        await db.query`
          INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
          VALUES (gen_random_uuid(), ${cat.category_id}, '早餐', 0),
                 (gen_random_uuid(), ${cat.category_id}, '午餐', 1),
                 (gen_random_uuid(), ${cat.category_id}, '晚餐', 2)
        `;
      } else if (cat.name === '薪資' || cat.name === '獎金') {
        await db.query`
          INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
          VALUES (gen_random_uuid(), ${cat.category_id}, ${cat.name}, 0)
        `;
      } else {
        await db.query`
          INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
          VALUES (gen_random_uuid(), ${cat.category_id}, '其他', 0)
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('註冊失敗:', error);
    return NextResponse.json({ error: '註冊失敗' }, { status: 500 });
  }
}
