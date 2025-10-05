import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: '未授權' }, { status: 401 });
  
  try {
    const result = await db.query`
      SELECT c.category_id, c.name, c.color,
             json_agg(
               json_build_object(
                 'subcategory_id', s.subcategory_id,
                 'name', s.name
               )
             ) as subcategories
      FROM categories c
      LEFT JOIN subcategories s ON c.category_id = s.category_id
      WHERE c.user_id = ${user.userId}
      GROUP BY c.category_id, c.name, c.color
      ORDER BY c.name
    `;
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('GET /api/categories - 錯誤:', error);
    return NextResponse.json({ error: '取得分類失敗' }, { status: 500 });
  }
}
