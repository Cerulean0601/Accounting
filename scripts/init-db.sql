-- 使用者資料
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 帳戶資料
CREATE TABLE accounts (
  account_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  initial_balance DECIMAL(14,2) DEFAULT 0.00,
  current_balance DECIMAL(14,2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'TWD',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 主分類
CREATE TABLE categories (
  category_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  name VARCHAR(100) NOT NULL,
  color VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 子分類
CREATE TABLE subcategories (
  subcategory_id UUID PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 交易資料
CREATE TABLE transactions (
  transaction_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  account_id UUID NOT NULL REFERENCES accounts(account_id),
  subcategory_id UUID REFERENCES subcategories(subcategory_id),
  amount DECIMAL(14,2) NOT NULL,
  type VARCHAR(10) CHECK (type IN ('expense', 'income', 'transfer')) NOT NULL,
  note TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 轉帳資料表
CREATE TABLE transfers (
  transfer_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  from_account_id UUID NOT NULL REFERENCES accounts(account_id),
  to_account_id UUID NOT NULL REFERENCES accounts(account_id),
  amount DECIMAL(14,2) NOT NULL,
  note TEXT,
  date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
