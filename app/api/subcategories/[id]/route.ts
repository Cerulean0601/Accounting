import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = logger.getRequestContext(request, { subcategoryId: id });
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  logger.info('開始刪除子分類', { ...context, userId: user.userId });
  
  try {
    // 檢查是否有相關交易
    const transactionCheck = await db.query`
      SELECT COUNT(*) as count FROM transactions 
      WHERE subcategory_id = ${id} AND user_id = ${user.userId}
    `;
    
    const transactionCount = parseInt(transactionCheck.rows[0].count);
    
    if (transactionCount > 0) {
      logger.warn('子分類有交易記錄，無法刪除', { ...context, userId: user.userId, params: { transactionCount } });
      return NextResponse.json({ 
        error: '此子分類有相關交易記錄，無法刪除',
        transactionCount 
      }, { status: 400 });
    }
    
    // 驗證子分類是否屬於該用戶
    const result = await db.query`
      DELETE FROM subcategories 
      WHERE subcategory_id = ${id} 
      AND category_id IN (
        SELECT category_id FROM categories WHERE user_id = ${user.userId}
      )
      RETURNING subcategory_id
    `;
    
    if (result.rows.length === 0) {
      logger.warn('子分類不存在', { ...context, userId: user.userId });
      return NextResponse.json({ error: '子分類不存在' }, { status: 404 });
    }
    
    logger.info('子分類刪除成功', { ...context, userId: user.userId });
    return NextResponse.json({ message: '子分類刪除成功' });
  } catch (error) {
    logger.error('刪除子分類失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '刪除子分類失敗' }, { status: 500 });
  }
}
