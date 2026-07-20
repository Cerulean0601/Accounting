import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * GET /api/bot/categories — 列出分類（含子分類）
 * POST /api/bot/categories — 新增分類
 */

export async function GET(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const result = await db.query`
      SELECT c.category_id, c.name, c.color, c.type,
             COALESCE(
               json_agg(
                 json_build_object(
                   'subcategory_id', s.subcategory_id,
                   'name', s.name,
                   'sort_order', COALESCE(s.sort_order, 999)
                 ) ORDER BY COALESCE(s.sort_order, 999), s.name
               ) FILTER (WHERE s.subcategory_id IS NOT NULL),
               '[]'::json
             ) as subcategories
      FROM categories c
      LEFT JOIN subcategories s ON c.category_id = s.category_id
      WHERE c.user_id = ${auth.userId}
      GROUP BY c.category_id, c.name, c.color, c.type
      ORDER BY c.type, c.name
    `;

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Bot GET /categories 錯誤:', error);
    return NextResponse.json({ error: '取得分類失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const { name, type = 'expense', color = '#FF6384' } = body;

    if (!name) {
      return NextResponse.json({ error: '分類名稱為必填' }, { status: 400 });
    }

    const result = await db.query`
      INSERT INTO categories (category_id, user_id, name, type, color)
      VALUES (gen_random_uuid(), ${auth.userId}, ${name}, ${type}, ${color})
      RETURNING category_id, name, type, color
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Bot POST /categories 錯誤:', error);
    return NextResponse.json({ error: '新增分類失敗' }, { status: 500 });
  }
}
