import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  const context = logger.getRequestContext(request);
  const user = await auth.getUser();
  
  if (!user) {
    logger.warn('未授權訪問', { ...context, userId: 'unknown' });
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  // 解析查詢參數
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const accountId = searchParams.get('accountId');
  const categoryId = searchParams.get('categoryId');
  const subcategoryId = searchParams.get('subcategoryId');
  const type = searchParams.get('type'); // 'income' 或 'expense'

  logger.info('開始查詢交易', { 
    ...context, 
    userId: user.userId,
    params: { page, limit, startDate, endDate, accountId, categoryId, subcategoryId, type }
  });
  
  try {
    const hasFilters = !!(startDate || endDate || accountId || subcategoryId || categoryId || type);
    
    // 計算總筆數
    let countResult;
    if (!hasFilters) {
      countResult = await db.query`
        SELECT COUNT(*) as total
        FROM transactions t
        JOIN accounts a ON t.account_id = a.account_id
        LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
        LEFT JOIN categories c ON s.category_id = c.category_id
        WHERE t.user_id = ${user.userId}
      `;
    } else {
      // 有篩選條件 - 構建條件 SQL 片段
      // 由於不能嵌套 sql``，我們使用條件表達式來構建 SQL 字串片段
      const conditions: string[] = [];
      
      if (startDate) {
        conditions.push(`t.date >= '${startDate.replace(/'/g, "''")}'`);
      }
      if (endDate) {
        conditions.push(`t.date <= '${endDate.replace(/'/g, "''")}'`);
      }
      if (accountId) {
        conditions.push(`t.account_id = '${accountId.replace(/'/g, "''")}'`);
      }
      if (subcategoryId) {
        conditions.push(`t.subcategory_id = '${subcategoryId.replace(/'/g, "''")}'`);
      }
      if (categoryId) {
        conditions.push(`c.category_id = '${categoryId.replace(/'/g, "''")}'`);
      }
      if (type && (type === 'income' || type === 'expense')) {
        conditions.push(`c.type = '${type.replace(/'/g, "''")}'`);
      }
      
      const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
      
      // 使用參數化查詢 - 但由於 @vercel/postgres 的限制，我們使用條件表達式
      // 分別處理每個可能的條件組合
      if (accountId && !startDate && !endDate && !subcategoryId && !categoryId && !type) {
        // 只有 accountId
        countResult = await db.query`
          SELECT COUNT(*) as total
          FROM transactions t
          JOIN accounts a ON t.account_id = a.account_id
          LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
          LEFT JOIN categories c ON s.category_id = c.category_id
          WHERE t.user_id = ${user.userId}
            AND t.account_id = ${accountId}
        `;
      } else {
        // 複雜條件 - 使用字串拼接（已轉義）
        // 注意：這裡已經對所有輸入進行了 SQL 注入防護（轉義單引號）
        // 由於 @vercel/postgres 的限制，我們使用字串拼接來構建查詢
        const queryText = `
          SELECT COUNT(*) as total
          FROM transactions t
          JOIN accounts a ON t.account_id = a.account_id
          LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
          LEFT JOIN categories c ON s.category_id = c.category_id
          WHERE t.user_id = '${user.userId.replace(/'/g, "''")}' ${whereClause}
        `;
        
        // 使用 sql 函數執行查詢 - 但需要手動構建
        // 由於 @vercel/postgres 的 sql 只接受 tagged template，我們需要使用不同的方法
        // 讓我們直接使用底層連接執行查詢
        const pool = sql as any;
        const client = await pool.connect();
        try {
          const result = await client.query(queryText);
          countResult = result;
        } finally {
          client.release();
        }
      }
    }

    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // 查詢當前頁的資料
    let result;
    if (!hasFilters) {
      result = await db.query`
        SELECT t.transaction_id, t.amount, t.note, t.date, 
               a.name as account_name, a.account_id,
               c.name as category_name, c.type, 
               s.name as subcategory_name, s.subcategory_id
        FROM transactions t
        JOIN accounts a ON t.account_id = a.account_id
        LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
        LEFT JOIN categories c ON s.category_id = c.category_id
        WHERE t.user_id = ${user.userId}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      // 構建條件 SQL 片段（與 countResult 相同）
      const conditions: string[] = [];
      
      if (startDate) {
        conditions.push(`t.date >= '${startDate.replace(/'/g, "''")}'`);
      }
      if (endDate) {
        conditions.push(`t.date <= '${endDate.replace(/'/g, "''")}'`);
      }
      if (accountId) {
        conditions.push(`t.account_id = '${accountId.replace(/'/g, "''")}'`);
      }
      if (subcategoryId) {
        conditions.push(`t.subcategory_id = '${subcategoryId.replace(/'/g, "''")}'`);
      }
      if (categoryId) {
        conditions.push(`c.category_id = '${categoryId.replace(/'/g, "''")}'`);
      }
      if (type && (type === 'income' || type === 'expense')) {
        conditions.push(`c.type = '${type.replace(/'/g, "''")}'`);
      }
      
      const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
      
      // 分別處理每個可能的條件組合
      if (accountId && !startDate && !endDate && !subcategoryId && !categoryId && !type) {
        // 只有 accountId
        result = await db.query`
          SELECT t.transaction_id, t.amount, t.note, t.date, 
                 a.name as account_name, a.account_id,
                 c.name as category_name, c.type, 
                 s.name as subcategory_name, s.subcategory_id
          FROM transactions t
          JOIN accounts a ON t.account_id = a.account_id
          LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
          LEFT JOIN categories c ON s.category_id = c.category_id
          WHERE t.user_id = ${user.userId}
            AND t.account_id = ${accountId}
          ORDER BY t.date DESC, t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        // 複雜條件 - 使用字串拼接（已轉義）
        const queryText = `
          SELECT t.transaction_id, t.amount, t.note, t.date, 
                 a.name as account_name, a.account_id,
                 c.name as category_name, c.type, 
                 s.name as subcategory_name, s.subcategory_id
          FROM transactions t
          JOIN accounts a ON t.account_id = a.account_id
          LEFT JOIN subcategories s ON t.subcategory_id = s.subcategory_id
          LEFT JOIN categories c ON s.category_id = c.category_id
          WHERE t.user_id = '${user.userId.replace(/'/g, "''")}' ${whereClause}
          ORDER BY t.date DESC, t.created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        
        // 使用底層連接執行查詢
        const pool = sql as any;
        const client = await pool.connect();
        try {
          const queryResult = await client.query(queryText);
          result = queryResult;
        } finally {
          client.release();
        }
      }
    }
    
    logger.info('交易查詢成功', { 
      ...context, 
      userId: user.userId, 
      params: { 
        count: result.rows.length,
        total,
        page,
        totalPages
      } 
    });

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('查詢交易失敗', { ...context, userId: user.userId }, error);
    return NextResponse.json({ error: '取得交易失敗' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const context = logger.getRequestContext(request);
  const user = await auth.getUser();
  
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
    
    logger.info('開始新增交易', { ...context, userId: user.userId, params: body });
    
    await db.query`BEGIN`;
    
    // 取得分類類型
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
    
    const categoryType = categoryResult.rows[0].type;
    
    // 新增交易記錄
    const transactionResult = await db.query`
      INSERT INTO transactions (transaction_id, user_id, account_id, subcategory_id, amount, note, date)
      VALUES (gen_random_uuid(), ${user.userId}, ${account_id}, ${subcategory_id}, ${amount}, ${note}, ${date || new Date().toISOString().split('T')[0]})
      RETURNING transaction_id, amount, note, date
    `;
    
    // 更新帳戶餘額
    const balanceChange = categoryType === 'expense' ? -amount : amount;
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
