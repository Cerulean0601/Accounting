-- investments 資料表
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('台股', 'ETF', '美股', '債券', '外匯')),
  shares DECIMAL(18, 6) NOT NULL DEFAULT 0,
  avg_cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'TWD',
  buy_rate DECIMAL(18, 6) NOT NULL DEFAULT 1,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_investments_user_symbol ON investments(user_id, symbol);
