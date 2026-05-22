# Service Worker 改進方案2 - 詳細流程說明

## 📋 改進目標

解決 Cursor 內建瀏覽器卡在 loading 的問題，透過改進緩存策略和版本控制機制。

---

## 🔄 改進流程詳解

### 1. **動態版本控制機制**

#### 問題
- 舊版：`CACHE_NAME = 'accounting-app-v1'` 是固定字串
- 當 Service Worker 更新時，舊緩存不會自動清除
- 可能導致使用過期或損壞的緩存資源

#### 解決方案
```javascript
const CACHE_VERSION = 'v2'; // 每次更新時修改版本號
const CACHE_NAME = `accounting-app-${CACHE_VERSION}`;
```

**流程**：
1. 更新 Service Worker 時，修改 `CACHE_VERSION`
2. 新的緩存名稱會不同（如 `accounting-app-v2`）
3. 在安裝階段清除所有舊版本的緩存

---

### 2. **安裝階段：清除舊緩存**

#### 問題
- 舊版：只創建新緩存，不清理舊緩存
- 舊緩存會一直佔用空間，且可能包含錯誤資源

#### 解決方案
```javascript
self.addEventListener('install', (event) => {
  event.waitUntil(
    // 步驟1：列出所有現有緩存
    caches.keys().then((cacheNames) => {
      // 步驟2：過濾出舊版本的緩存
      const oldCaches = cacheNames.filter(
        (name) => name.startsWith('accounting-app-') && name !== CACHE_NAME
      );
      // 步驟3：刪除所有舊緩存
      return Promise.all(oldCaches.map((name) => caches.delete(name)));
    }).then(() => {
      // 步驟4：創建新緩存並預載入資源
      return caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache));
    })
  );
  // 步驟5：立即啟用新 Service Worker（不等待舊的關閉）
  self.skipWaiting();
});
```

**流程圖**：
```
安裝事件觸發
    ↓
列出所有緩存名稱
    ↓
過濾出舊版本緩存（accounting-app-v1, api-cache-v1）
    ↓
並行刪除所有舊緩存
    ↓
創建新緩存（accounting-app-v2）
    ↓
預載入關鍵資源（/, manifest.json, icons）
    ↓
立即啟用新 Service Worker
```

---

### 3. **激活階段：清理舊 Service Worker**

#### 問題
- 舊版：沒有激活階段的處理
- 可能有多個 Service Worker 同時運行

#### 解決方案
```javascript
self.addEventListener('activate', (event) => {
  event.waitUntil(
    // 清除所有舊緩存（雙重保險）
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => 
            (name.startsWith('accounting-app-') && name !== CACHE_NAME) ||
            (name.startsWith('api-cache-') && name !== API_CACHE)
          )
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      // 立即控制所有客戶端
      return self.clients.claim();
    })
  );
});
```

**流程圖**：
```
激活事件觸發
    ↓
再次檢查並清除舊緩存（確保清理乾淨）
    ↓
立即控制所有客戶端頁面
    ↓
新 Service Worker 開始處理請求
```

---

### 4. **改進的靜態資源緩存策略**

#### 問題（舊版第 48-51 行）
```javascript
// ❌ 舊策略：緩存優先
caches.match(request)
  .then((response) => response || fetch(request))
```
- 如果緩存中有損壞的資源，會一直返回損壞的資源
- 不會嘗試從網路獲取最新版本
- 沒有錯誤處理

#### 解決方案：網路優先策略
```javascript
// ✅ 新策略：網路優先，降級到緩存
event.respondWith(
  fetch(request)  // 步驟1：先嘗試網路請求
    .then((response) => {
      // 步驟2：網路成功，更新緩存
      if (response.ok) {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
      }
      return response;
    })
    .catch(() => {
      // 步驟3：網路失敗，降級到緩存
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;  // 返回緩存
        }
        // 步驟4：緩存也沒有，返回錯誤
        return new Response('離線模式：無法載入資源', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
);
```

**流程圖**：
```
請求靜態資源（CSS, JS, 圖片等）
    ↓
嘗試從網路獲取（優先）
    ↓
    ├─ 成功 → 更新緩存 → 返回資源
    └─ 失敗 → 檢查緩存
              ├─ 有緩存 → 返回緩存
              └─ 無緩存 → 返回 503 錯誤
```

**優點**：
- ✅ 總是嘗試獲取最新版本
- ✅ 網路失敗時有降級方案（使用緩存）
- ✅ 自動更新緩存，保持資源新鮮

---

### 5. **超時機制**

#### 問題
- 舊版：沒有超時處理
- 如果網路很慢，可能導致長時間等待

#### 解決方案
```javascript
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeout)
    )
  ]);
}
```

**流程**：
```
發起網路請求
    ↓
同時啟動 5 秒計時器
    ↓
    ├─ 請求在 5 秒內完成 → 返回結果
    └─ 5 秒超時 → 拋出錯誤 → 降級到緩存
```

---

## 🎯 完整改進流程總結

### 第一次載入（新用戶）
```
1. 頁面載入
2. 註冊 Service Worker (sw.js)
3. Service Worker 安裝
   - 創建緩存 accounting-app-v2
   - 預載入關鍵資源
4. Service Worker 激活
   - 控制頁面
5. 請求資源
   - 網路優先策略
   - 成功後更新緩存
```

### 更新 Service Worker（現有用戶）
```
1. 檢測到新的 sw.js
2. 安裝新 Service Worker
   - 列出所有緩存
   - 刪除舊緩存（v1）
   - 創建新緩存（v2）
   - 預載入資源
3. 舊 Service Worker 關閉
4. 新 Service Worker 激活
   - 再次清理舊緩存（確保）
   - 控制所有客戶端
5. 後續請求使用新策略
   - 網路優先，自動更新緩存
```

### 離線場景
```
1. 請求資源
2. 嘗試網路請求 → 失敗（離線）
3. 降級到緩存
   - 有緩存 → 返回緩存資源
   - 無緩存 → 返回 503 錯誤
```

---

## 🔍 關鍵改進點對比

| 項目 | 舊版 | 改進版 | 效果 |
|------|------|--------|------|
| **緩存策略** | 緩存優先 | 網路優先 | ✅ 總是獲取最新資源 |
| **版本控制** | 固定名稱 | 動態版本 | ✅ 自動清理舊緩存 |
| **錯誤處理** | 無 | 完整處理 | ✅ 不會卡住 |
| **超時機制** | 無 | 5秒超時 | ✅ 避免長時間等待 |
| **激活機制** | 無 | 立即激活 | ✅ 快速生效 |

---

## 🚀 實作後的預期效果

1. **解決 Cursor 內建瀏覽器卡 loading**：網路優先策略確保獲取最新資源
2. **自動清理舊緩存**：版本控制機制自動清除問題緩存
3. **更好的離線體驗**：網路失敗時有明確的降級方案
4. **更快的更新**：立即激活機制讓更新更快生效
