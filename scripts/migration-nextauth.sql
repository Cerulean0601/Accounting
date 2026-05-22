-- Migration: 支援 NextAuth (Google OAuth + Credentials)
-- 在 users 表加入 provider 和 provider_account_id 欄位

-- 加入 name 欄位（如果不存在）
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- 加入 provider 欄位（預設 credentials）
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'credentials';

-- 加入第三方登入的帳號 ID
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_account_id VARCHAR(255);

-- 允許 Google 登入的用戶沒有密碼
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- 建立索引加速查詢
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_account_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
