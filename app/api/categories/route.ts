import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const context = logger.getRequestContext(request);
  const user = auth.getUserFromRequest(request);

  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  logger.info('開始查詢分類', { ...context, userId: user.userId });

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
      WHERE c.user_id = ${user.userId}
      GROUP BY c.category_id, c.name, c.color, c.type
      ORDER BY c.name
    `;

    logger.info('分類查詢成功', { ...context, userId: user.userId, params: { count: result.rows.length } });
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('查詢分類失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '取得分類失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = logger.getRequestContext(request);
  const user = auth.getUserFromRequest(request);

  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color } = body;

    logger.info('開始新增分類', { ...context, userId: user.userId, params: body });

    const result = await db.query`
      INSERT INTO categories (category_id, user_id, name, color)
      VALUES (gen_random_uuid(), ${user.userId}, ${name}, ${color})
      RETURNING category_id, name, color
    `;

    logger.info('分類新增成功', { ...context, userId: user.userId, params: { categoryId: result.rows[0].category_id } });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('新增分類失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '新增分類失敗' }, { status: 500 });
  }
}
