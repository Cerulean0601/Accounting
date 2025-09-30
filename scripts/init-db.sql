-- 創建用戶表
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    default_account_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建帳戶表
CREATE TABLE IF NOT EXISTS accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('cash', 'bank', 'credit_card', 'digital_wallet')),
    balance DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'TWD',
    color VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建交易表
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense', 'transfer')),
    category VARCHAR(50) NOT NULL,
    tags TEXT[],
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 創建分類表
CREATE TABLE IF NOT EXISTS categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')),
    color VARCHAR(7),
    icon VARCHAR(50),
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 創建預算表
CREATE TABLE IF NOT EXISTS budgets (
    budget_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id),
    category VARCHAR(50),
    amount DECIMAL(12,2) NOT NULL,
    period VARCHAR(20) DEFAULT 'monthly',
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_accounts_user_active ON accounts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_tags ON transactions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_transactions_type_date ON transactions(type, date DESC);

-- 插入預設分類
INSERT INTO categories (user_id, name, type, color, is_default) VALUES
(NULL, '餐飲', 'expense', '#FF6384', TRUE),
(NULL, '交通', 'expense', '#36A2EB', TRUE),
(NULL, '購物', 'expense', '#FFCE56', TRUE),
(NULL, '娛樂', 'expense', '#4BC0C0', TRUE),
(NULL, '醫療', 'expense', '#9966FF', TRUE),
(NULL, '薪資', 'income', '#4BC0C0', TRUE),
(NULL, '獎金', 'income', '#36A2EB', TRUE),
(NULL, '投資', 'income', '#FFCE56', TRUE)
ON CONFLICT DO NOTHING;
