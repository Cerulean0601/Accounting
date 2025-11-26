import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const context = logger.getRequestContext(request);
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { category_id, name } = body;
    
    logger.info('開始新增子分類', { ...context, userId: user.userId, params: body });
    
    // 驗證分類是否屬於該用戶
    const categoryCheck = await db.query`
      SELECT category_id FROM categories 
      WHERE category_id = ${category_id} AND user_id = ${user.userId}
    `;
    
    if (categoryCheck.rows.length === 0) {
      logger.warn('分類不存在或無權限', { ...context, userId: user.userId, params: { category_id } });
      return NextResponse.json({ error: '分類不存在或無權限' }, { status: 403 });
    }
    
    // 取得該分類下的子分類數量作為下一個排序號
    const countResult = await db.query`
      SELECT COUNT(*) as count FROM subcategories WHERE category_id = ${category_id}
    `;
    
    const nextSortOrder = parseInt(countResult.rows[0].count) + 1;
    
    const result = await db.query`
      INSERT INTO subcategories (subcategory_id, category_id, name, sort_order)
      VALUES (gen_random_uuid(), ${category_id}, ${name}, ${nextSortOrder})
      RETURNING subcategory_id, category_id, name, sort_order
    `;
    
    logger.info('子分類新增成功', { ...context, userId: user.userId, params: { subcategoryId: result.rows[0].subcategory_id } });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('新增子分類失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '新增子分類失敗' }, { status: 500 });
  }
}
