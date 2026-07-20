import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyBotAuth } from '@/lib/bot-auth';

/**
 * DELETE /api/bot/categories/[id] — 刪除分類
 */

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyBotAuth(request);
  if (!auth.success) return auth.response;
  const { id } = await params;

  try {
    const transactionCheck = await db.query`
      SELECT COUNT(*) as count FROM transactions t
      JOIN subcategories s ON t.subcategory_id = s.subcategory_id
      WHERE s.category_id = ${id} AND t.user_id = ${auth.userId}
    `;

    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return NextResponse.json({ error: '此分類有相關交易記錄，無法刪除' }, { status: 400 });
    }

    const result = await db.query`
      DELETE FROM categories WHERE category_id = ${id} AND user_id = ${auth.userId}
      RETURNING category_id
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '分類不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Bot DELETE /categories/[id] 錯誤:', error);
    return NextResponse.json({ error: '刪除分類失敗' }, { status: 500 });
  }
}
