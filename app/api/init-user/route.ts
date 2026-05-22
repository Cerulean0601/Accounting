import { NextResponse } from 'next/server';

// 此 API 已被 /api/auth/register 取代
export async function POST() {
  return NextResponse.json(
    { error: '請使用 /api/auth/register 註冊', redirect: '/api/auth/register' },
    { status: 410 }
  );
}
