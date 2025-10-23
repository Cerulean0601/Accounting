import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = logger.getRequestContext(request, { accountId: id });
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { name, type, current_balance } = body;
    
    logger.info('開始更新帳戶', { ...context, userId: user.userId, params: body });
    
    const result = await db.query`
      UPDATE accounts 
      SET name = ${name}, type = ${type}, current_balance = ${current_balance}
      WHERE account_id = ${id} AND user_id = ${user.userId}
      RETURNING account_id, name, type, initial_balance, current_balance, currency, is_default
    `;
    
    if (result.rows.length === 0) {
      logger.warn('帳戶不存在', { ...context, userId: user.userId });
      return NextResponse.json({ error: '帳戶不存在' }, { status: 404 });
    }
    
    logger.info('帳戶更新成功', { ...context, userId: user.userId });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('更新帳戶失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '更新帳戶失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = logger.getRequestContext(request, { accountId: id });
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  logger.info('開始刪除帳戶', { ...context, userId: user.userId });
  
  try {
    // 檢查是否有相關交易
    const transactionCheck = await db.query`
      SELECT COUNT(*) as count FROM transactions 
      WHERE account_id = ${id} AND user_id = ${user.userId}
    `;
    
    const transactionCount = parseInt(transactionCheck.rows[0].count);
    logger.debug('檢查交易記錄', { ...context, userId: user.userId, params: { transactionCount } });
    
    if (transactionCount > 0) {
      logger.warn('帳戶有交易記錄，無法刪除', { ...context, userId: user.userId, params: { transactionCount } });
      return NextResponse.json({ 
        error: '此帳戶有相關交易記錄，無法刪除',
        transactionCount 
      }, { status: 400 });
    }
    
    const result = await db.query`
      DELETE FROM accounts 
      WHERE account_id = ${id} AND user_id = ${user.userId}
      RETURNING account_id
    `;
    
    if (result.rows.length === 0) {
      logger.warn('帳戶不存在', { ...context, userId: user.userId });
      return NextResponse.json({ error: '帳戶不存在' }, { status: 404 });
    }
    
    logger.info('帳戶刪除成功', { ...context, userId: user.userId });
    return NextResponse.json({ message: '帳戶刪除成功' });
  } catch (error) {
    logger.error('刪除帳戶失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '刪除帳戶失敗' }, { status: 500 });
  }
}
