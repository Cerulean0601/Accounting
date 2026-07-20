import { NextRequest, NextResponse } from 'next/server';

/**
 * Bot API 認證模組
 * 驗證 x-bot-key header + BOT_USER_ID 環境變數
 */

export interface BotAuthResult {
  success: true;
  userId: string;
}

export interface BotAuthError {
  success: false;
  response: NextResponse;
}

export type BotAuth = BotAuthResult | BotAuthError;

export function verifyBotAuth(request: NextRequest): BotAuth {
  const key = request.headers.get('x-bot-key');
  const expected = process.env.BOT_API_KEY;

  if (!expected || !key || key !== expected) {
    return {
      success: false,
      response: NextResponse.json({ error: '未授權：無效的 API key' }, { status: 401 }),
    };
  }

  const userId = process.env.BOT_USER_ID;
  if (!userId) {
    return {
      success: false,
      response: NextResponse.json({ error: '未設定 BOT_USER_ID 環境變數' }, { status: 401 }),
    };
  }

  return { success: true, userId };
}
