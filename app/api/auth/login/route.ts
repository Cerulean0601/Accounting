import { NextResponse } from 'next/server';

// 舊的登入 API 已被 NextAuth 取代
// 保留此 route 以避免 404，重定向到 NextAuth
export async function POST() {
  return NextResponse.json(
    { error: '請使用新的登入方式', redirect: '/api/auth/signin' },
    { status: 410 }
  );
}
