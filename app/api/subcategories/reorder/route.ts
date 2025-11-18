import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  const user = auth.getUserFromRequest(request);
  
  if (!user) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }
  
  try {
    const { subcategory_ids } = await request.json();
    
    for (let i = 0; i < subcategory_ids.length; i++) {
      await db.query`
        UPDATE subcategories 
        SET sort_order = ${i + 1}
        WHERE subcategory_id = ${subcategory_ids[i]}
        AND category_id IN (
          SELECT category_id FROM categories WHERE user_id = ${user.userId}
        )
      `;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '更新排序失敗' }, { status: 500 });
  }
}