import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * GET /api/bot/subcategories — 列出所有子分類
 * POST /api/bot/subcategories — 新增子分類
 */

export async function GET(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const result = await db.query`
      SELECT s.subcategory_id, s.name, s.sort_order,
             c.category_id, c.name as category_name, c.type
      FROM subcategories s
      JOIN categories c ON s.category_id = c.category_id
      WHERE c.user_id = ${auth.userId}
      ORDER BY c.type, c.name, s.sort_order
    `;

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Bot GET /subcategories 錯誤:', error);
    return NextResponse.json({ error: '取得子分類失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { category_id, name } = body;

    if (!category_id || !name) {
      return NextResponse.json({ error: 'category_id 和 name 為必填' }, { status: 400 });
    }

    // 驗證分類屬於該用戶
    const categoryCheck = await db.query`
      SELECT category_id FROM categories
      WHERE category_id = ${category_id} AND user_id = ${auth.userId}
    `;

    if (categoryCheck.rows.length === 0) {
      return NextResponse.json({ error: '分類不存在或無權限' }, { status: 403 });
    }

    // 取得下一個排序號
    const countResult = await db.query`
      SELECT COUNT(*) as count FROM subcategories WHERE category_id = ${category_id}
    `;
    const nextSortOrder = parseInt(countResult.rows[0].count) + 1;

    const result = await db.query`
      INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
      VALUES (gen_random_uuid(), ${category_id}, ${name}, ${nextSortOrder})
      RETURNING subcategory_id, category_id, name, sort_order
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Bot POST /subcategories 錯誤:', error);
    return NextResponse.json({ error: '新增子分類失敗' }, { status: 500 });
  }
}
