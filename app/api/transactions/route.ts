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

  logger.info('開始查詢交易', { ...context, userId: user.userId });
  
  try {
    const result = await db.query`
      SELECT t.transaction_id, t.amount, t.type, t.note, t.date, 
             a.name as account_name, a.account_id,
             c.name as category_name, s.name as subcategory_name
      FROM transactions t
      JOIN accounts a ON t.account_id = a.account_id
      LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      LEFT JOIN categories c ON s.category_id = c.category_id
      WHERE t.user_id = ${user.userId}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 50
    `;
    
    logger.info('交易查詢成功', { ...context, userId: user.userId, params: { count: result.rows.length } });
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('查詢交易失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '取得交易失敗' }, { status: 500 });
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
    const { account_id, subcategory_id, amount, type, note, date } = body;
    
    if (!account_id || !amount || !type) {
      logger.warn('缺少必要欄位', { ...context, userId: user.userId, params: body });
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 });
    }
    
    logger.info('開始新增交易', { ...context, userId: user.userId, params: body });
    
    await db.query`BEGIN`;
    
    // 新增交易記錄
    const transactionResult = await db.query`
      INSERT INTO transactions (transaction_id, user_id, account_id, subcategory_id, amount, type, note, date)
      VALUES (gen_random_uuid(), ${user.userId}, ${account_id}, ${subcategory_id}, ${amount}, ${type}, ${note}, ${date || new Date().toISOString().split('T')[0]})
      RETURNING transaction_id, amount, type, note, date
    `;
    
    // 更新帳戶餘額
    const balanceChange = type === 'expense' ? -amount : amount;
    await db.query`
      UPDATE accounts 
      SET current_balance = current_balance + ${balanceChange}
      WHERE account_id = ${account_id} AND user_id = ${user.userId}
    `;
    
    await db.query`COMMIT`;
    
    logger.info('交易新增成功', { 
      ...context, 
      userId: user.userId, 
      params: { 
        transactionId: transactionResult.rows[0].transaction_id,
        balanceChange 
      } 
    });
    
    return NextResponse.json(transactionResult.rows[0]);
  } catch (error) {
    logger.error('新增交易失敗', { ...context, userId: user.userId }, error);
    
    try {
      await db.query`ROLLBACK`;
      logger.debug('交易回滾成功', { ...context, userId: user.userId });
    } catch (rollbackError) {
      logger.error('交易回滾失敗', { ...context, userId: user.userId }, rollbackError);
    }
    
    return NextResponse.json({ error: '新增交易失敗' }, { status: 500 });
  }
}
