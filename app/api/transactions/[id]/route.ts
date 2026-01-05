import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = logger.getRequestContext(request, { transactionId: id });
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { account_id, subcategory_id, amount, note, date } = body;
    
    if (!account_id || !amount || !subcategory_id) {
      logger.warn('缺少必要欄位', { ...context, userId: user.userId, params: body });
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    
    logger.info('開始更新交易', { ...context, userId: user.userId, params: body });
    
    await db.query`BEGIN`;
    
    // 取得舊交易資料
    const oldTransaction = await db.query`
      SELECT t.amount, t.account_id, t.subcategory_id,
             c.type as category_type
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.transaction_id = ${id} AND t.user_id = ${user.userId}
    `;
    
    if (oldTransaction.rows.length === 0) {
      await db.query`ROLLBACK`;
      logger.warn('交易不存在', { ...context, userId: user.userId });
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }
    
    const oldData = oldTransaction.rows[0];
    
    // 取得新分類類型
    const categoryResult = await db.query`
      SELECT c.type 
      FROM categories c
      JOIN subcategories s ON c.category_id = s.category_id
      WHERE s.subcategory_id = ${subcategory_id}
    `;
    
    if (categoryResult.rows.length === 0) {
      await db.query`ROLLBACK`;
      return NextResponse.json({ error: '無效的子分類' }, { status: 400 });
    }
    
    const newCategoryType = categoryResult.rows[0].type;
    const oldCategoryType = oldData.category_type;
    
    // 還原舊帳戶餘額
    const oldBalanceChange = oldCategoryType === 'expense' ? oldData.amount : -oldData.amount;
    await db.query`
      UPDATE accounts 
      SET current_balance = current_balance + ${oldBalanceChange}
      WHERE account_id = ${oldData.account_id} AND user_id = ${user.userId}
    `;
    
    // 更新交易記錄
    const transactionResult = await db.query`
      UPDATE transactions 
      SET account_id = ${account_id}, 
          subcategory_id = ${subcategory_id}, 
          amount = ${amount}, 
          note = ${note}, 
          date = ${date}
      WHERE transaction_id = ${id} AND user_id = ${user.userId}
      RETURNING transaction_id, amount, note, date
    `;
    
    // 更新新帳戶餘額
    const newBalanceChange = newCategoryType === 'expense' ? -amount : amount;
    await db.query`
      UPDATE accounts 
      SET current_balance = current_balance + ${newBalanceChange}
      WHERE account_id = ${account_id} AND user_id = ${user.userId}
    `;
    
    await db.query`COMMIT`;
    
    logger.info('交易更新成功', { ...context, userId: user.userId });
    return NextResponse.json(transactionResult.rows[0]);
  } catch (error) {
    logger.error('更新交易失敗', { ...context, userId: user.userId }, error);
    
    try {
      await db.query`ROLLBACK`;
      logger.debug('交易回滾成功', { ...context, userId: user.userId });
    } catch (rollbackError) {
      logger.error('交易回滾失敗', { ...context, userId: user.userId }, rollbackError);
    }
    
    return NextResponse.json({ error: '更新交易失敗' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = logger.getRequestContext(request, { transactionId: id });
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  try {
    logger.info('開始刪除交易', { ...context, userId: user.userId });
    
    await db.query`BEGIN`;
    
    // 取得交易資料
    const transaction = await db.query`
      SELECT t.amount, t.account_id,
             c.type as category_type
      FROM transactions t
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.transaction_id = ${id} AND t.user_id = ${user.userId}
    `;
    
    if (transaction.rows.length === 0) {
      await db.query`ROLLBACK`;
      logger.warn('交易不存在', { ...context, userId: user.userId });
      return NextResponse.json({ error: '交易不存在' }, { status: 404 });
    }
    
    const transactionData = transaction.rows[0];
    const categoryType = transactionData.category_type;
    
    // 還原帳戶餘額
    const balanceChange = categoryType === 'expense' ? transactionData.amount : -transactionData.amount;
    await db.query`
      UPDATE accounts 
      SET current_balance = current_balance + ${balanceChange}
      WHERE account_id = ${transactionData.account_id} AND user_id = ${user.userId}
    `;
    
    // 刪除交易
    await db.query`
      DELETE FROM transactions 
      WHERE transaction_id = ${id} AND user_id = ${user.userId}
    `;
    
    await db.query`COMMIT`;
    
    logger.info('交易刪除成功', { ...context, userId: user.userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('刪除交易失敗', { ...context, userId: user.userId }, error);
    
    try {
      await db.query`ROLLBACK`;
      logger.debug('交易回滾成功', { ...context, userId: user.userId });
    } catch (rollbackError) {
      logger.error('交易回滾失敗', { ...context, userId: user.userId }, rollbackError);
    }
    
    return NextResponse.json({ error: '刪除交易失敗' }, { status: 500 });
  }
}

