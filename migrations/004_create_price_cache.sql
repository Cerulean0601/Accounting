-- price_cache 資料表：儲存每日收盤價與匯率
CREATE TABLE IF NOT EXISTS price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(20) NOT NULL,
  close_price DECIMAL(18, 6) NOT NULL,
  exchange_rate DECIMAL(18, 6) NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同一天同一標的只存一筆
CREATE UNIQUE INDEX IF NOT EXISTS idx_price_cache_symbol_date ON price_cache(symbol, date);

-- 查詢最新價格用
CREATE INDEX IF NOT EXISTS idx_price_cache_symbol_latest ON price_cache(symbol, date DESC);
