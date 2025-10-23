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

  logger.info('開始處理請求', { ...context, userId: user.userId });
  
  try {
    const result = await db.query`
      SELECT account_id, name, type, initial_balance, current_balance, currency, is_default
      FROM accounts 
      WHERE user_id = ${user.userId}
      ORDER BY is_default DESC, name
    `;
    
    logger.info('查詢成功', { ...context, userId: user.userId, params: { count: result.rows.length } });
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('查詢失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '取得帳戶失敗' }, { status: 500 });
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
    const { name, type, initial_balance = 0, currency = 'TWD', is_default = false } = body;
    
    logger.info('開始新增帳戶', { ...context, userId: user.userId, params: body });
    
    const result = await db.query`
      INSERT INTO accounts (account_id, user_id, name, type, initial_balance, current_balance, currency, is_default)
      VALUES (gen_random_uuid(), ${user.userId}, ${name}, ${type}, ${initial_balance}, ${initial_balance}, ${currency}, ${is_default})
      RETURNING account_id, name, type, initial_balance, current_balance, currency, is_default
    `;
    
    logger.info('帳戶新增成功', { ...context, userId: user.userId, params: { accountId: result.rows[0].account_id } });
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('新增帳戶失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '新增帳戶失敗' }, { status: 500 });
  }
}
