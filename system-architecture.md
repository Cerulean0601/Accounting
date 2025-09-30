# 記帳網站系統架構設計

## 系統架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  Mobile PWA                    │  Desktop Web                   │
│  ┌─────────────────────────┐   │  ┌─────────────────────────┐   │
│  │ • 快速記帳介面           │   │  │ • 分析儀表板             │   │
│  │ • 帳戶選擇器             │   │  │ • 多維度篩選             │   │
│  │ • 離線支援               │   │  │ • 圖表顯示               │   │
│  │ • 常用項目快選           │   │  │ • 報表匯出               │   │
│  │ • Service Worker        │   │  │ • 預算管理               │   │
│  └─────────────────────────┘   │  └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/API Calls (JWT Auth)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Vercel Platform                            │
├─────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (Static + SSR)                               │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ • 響應式設計 (Tailwind CSS)                                │
│  │ • PWA 配置 (Manifest + Service Worker)                     │
│  │ • Chart.js 圖表庫                                          │
│  └─────────────────────────────────────────────────────────────┤
│                              │                                 │
│  Serverless Functions (API Routes)                             │
│  ┌─────────────────────────────────────────────────────────────┤
│  │ Auth APIs          │ Transaction APIs     │ Analytics APIs   │
│  │ • /api/auth/login  │ • GET /transactions  │ • GET /summary   │
│  │ • /api/auth/register│ • POST /transactions │ • GET /charts   │
│  │ • /api/auth/refresh│ • PUT /transactions  │ • GET /export    │
│  │                    │ • DELETE /transactions│ • GET /budget   │
│  │ Account APIs       │ Category APIs        │ Tag APIs         │
│  │ • GET /accounts    │ • GET /categories    │ • GET /tags      │
│  │ • POST /accounts   │ • POST /categories   │ • GET /frequent  │
│  │ • PUT /accounts    │                      │                  │
│  └─────────────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Database Queries & Cache
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
├─────────────────────────────────────────────────────────────────┤
│  Vercel Postgres                    │  Vercel KV (Redis)        │
│  ┌─────────────────────────────┐   │  ┌─────────────────────────┐│
│  │ Tables:                     │   │  │ Cache Keys:             ││
│  │ • users                     │   │  │ • user:{id}:session     ││
│  │ • accounts                  │   │  │ • accounts:{user_id}    ││
│  │ • transactions             │   │  │ • categories:{user_id}  ││
│  │ • categories               │   │  │ • analytics:{user_id}   ││
│  │ • budgets                  │   │  │ • frequent_tags:{id}    ││
│  └─────────────────────────────┘   │  └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

## 資料流圖

### 1. 用戶認證流程
```
Client → /api/auth/login → Verify Credentials → Generate JWT → 
Store Session in KV → Return Token → Client Storage (localStorage)
```

### 2. 快速記帳流程 (Mobile)
```
Mobile PWA → Select Account → Input Transaction → 
├─ Online:  /api/transactions → Postgres Insert → Update KV Cache
└─ Offline: IndexedDB Store → Background Sync → API Sync When Online
```

### 3. 帳戶管理流程
```
Client → /api/accounts → Check KV Cache → 
├─ Cache Hit:  Return Cached Accounts
└─ Cache Miss: Query Postgres → Update Cache → Return Accounts
```

### 4. 分析查詢流程 (Desktop)
```
Desktop → /api/analytics/summary → JWT Verify → Check KV Cache → 
├─ Cache Hit:  Return Cached Analytics
└─ Cache Miss: Complex Query Postgres → Update Cache → Return Data
```

## 資料庫設計

### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    default_account_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Accounts Table
```sql
CREATE TABLE accounts (
    account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('cash', 'bank', 'credit_card', 'digital_wallet')),
    balance DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'TWD',
    color VARCHAR(7), -- Hex color
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_active (user_id, is_active)
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense', 'transfer')),
    category VARCHAR(50) NOT NULL,
    tags TEXT[], -- PostgreSQL array
    note TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_user_date (user_id, date DESC),
    INDEX idx_account_date (account_id, date DESC),
    INDEX idx_category (category),
    INDEX idx_tags USING GIN (tags),
    INDEX idx_type_date (type, date DESC)
);
```

### Categories Table
```sql
CREATE TABLE categories (
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
```

### Budgets Table
```sql
CREATE TABLE budgets (
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
```

## API 端點設計

### Authentication APIs
| Method | Endpoint | 描述 |
|--------|----------|------|
| POST | /api/auth/login | 用戶登入 |
| POST | /api/auth/register | 用戶註冊 |
| POST | /api/auth/refresh | 刷新 JWT |
| POST | /api/auth/logout | 登出 |

### Account APIs
| Method | Endpoint | 描述 |
|--------|----------|------|
| GET | /api/accounts | 取得用戶所有帳戶 |
| POST | /api/accounts | 新增帳戶 |
| PUT | /api/accounts/:id | 更新帳戶 |
| DELETE | /api/accounts/:id | 刪除帳戶 |
| GET | /api/accounts/:id/balance | 取得帳戶餘額 |

### Transaction APIs
| Method | Endpoint | 描述 |
|--------|----------|------|
| GET | /api/transactions | 取得交易列表 (支援篩選) |
| POST | /api/transactions | 新增交易 |
| PUT | /api/transactions/:id | 更新交易 |
| DELETE | /api/transactions/:id | 刪除交易 |
| POST | /api/transactions/bulk | 批量操作 |

### Analytics APIs
| Method | Endpoint | 描述 |
|--------|----------|------|
| GET | /api/analytics/summary | 總覽統計 |
| GET | /api/analytics/charts | 圖表資料 |
| GET | /api/analytics/export | 匯出報表 |
| GET | /api/analytics/budget | 預算狀態 |
| GET | /api/analytics/trends | 趨勢分析 |

### Category & Tag APIs
| Method | Endpoint | 描述 |
|--------|----------|------|
| GET | /api/categories | 取得分類 |
| POST | /api/categories | 新增分類 |
| GET | /api/tags/frequent | 常用標籤 |
| GET | /api/tags/suggestions | 標籤建議 |

## 技術實作重點

### PWA 離線支援
```javascript
// Service Worker 快取策略
const CACHE_NAME = 'accounting-app-v1';
const API_CACHE = 'api-cache-v1';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // API 請求處理
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 快取 GET 請求
          if (request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 離線時從快取讀取
          return caches.match(request);
        })
    );
  }
});
```

### Redis 快取策略
```javascript
// 快取鍵設計
const CACHE_KEYS = {
  USER_SESSION: (userId) => `user:${userId}:session`,
  USER_ACCOUNTS: (userId) => `accounts:${userId}`,
  USER_CATEGORIES: (userId) => `categories:${userId}`,
  MONTHLY_SUMMARY: (userId, month) => `analytics:${userId}:${month}`,
  FREQUENT_TAGS: (userId) => `frequent_tags:${userId}`,
  ACCOUNT_BALANCE: (accountId) => `balance:${accountId}`
};

// TTL 設定
const CACHE_TTL = {
  SESSION: 7 * 24 * 3600,      // 7天
  ACCOUNTS: 24 * 3600,         // 1天
  CATEGORIES: 24 * 3600,       // 1天
  ANALYTICS: 3600,             // 1小時
  FREQUENT_TAGS: 12 * 3600,    // 12小時
  BALANCE: 300                 // 5分鐘
};
```

### 響應式設計
```css
/* 斷點設計 */
@media (max-width: 767px) {
  /* Mobile: 快速記帳優先 */
  .quick-entry { display: block; }
  .analytics-panel { display: none; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  /* Tablet: 混合介面 */
  .layout { grid-template-columns: 1fr 1fr; }
}

@media (min-width: 1024px) {
  /* Desktop: 完整分析功能 */
  .layout { grid-template-columns: 300px 1fr 400px; }
}
```

### 帳戶餘額同步機制
```javascript
// 交易後更新帳戶餘額
async function updateAccountBalance(accountId, amount, type) {
  const balanceChange = type === 'expense' ? -amount : amount;
  
  // 更新資料庫
  await db.query(`
    UPDATE accounts 
    SET balance = balance + $1, updated_at = NOW() 
    WHERE account_id = $2
  `, [balanceChange, accountId]);
  
  // 清除快取
  await redis.del(`balance:${accountId}`);
}
```

這個架構設計充分考慮了帳戶管理的需求，提供完整的多帳戶記帳功能，同時保持高效能和良好的用戶體驗。
