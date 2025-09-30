const CACHE_NAME = 'accounting-app-v1';
const API_CACHE = 'api-cache-v1';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 安裝 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// 攔截網路請求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // API 請求處理
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // 快取 GET 請求
          if (request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 離線時從快取讀取
          if (request.method === 'GET') {
            return caches.match(request);
          }
          // POST 請求離線時存入 IndexedDB
          return storeOfflineTransaction(request);
        })
    );
  } else {
    // 靜態資源快取策略
    event.respondWith(
      caches.match(request)
        .then((response) => response || fetch(request))
    );
  }
});

// 背景同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineTransactions());
  }
});

// 存儲離線交易
async function storeOfflineTransaction(request) {
  if (request.method === 'POST' && request.url.includes('/api/transactions')) {
    const data = await request.json();
    
    // 開啟 IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['offline_transactions'], 'readwrite');
    const store = transaction.objectStore('offline_transactions');
    
    await store.add({
      ...data,
      timestamp: Date.now(),
      synced: false
    });
    
    return new Response(JSON.stringify({ success: true, offline: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 同步離線交易
async function syncOfflineTransactions() {
  const db = await openDB();
  const transaction = db.transaction(['offline_transactions'], 'readwrite');
  const store = transaction.objectStore('offline_transactions');
  const unsynced = await store.getAll();
  
  for (const item of unsynced.filter(t => !t.synced)) {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(item)
      });
      
      if (response.ok) {
        await store.delete(item.id);
      }
    } catch (error) {
      console.error('同步失敗:', error);
    }
  }
}

// 開啟 IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('AccountingDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_transactions')) {
        const store = db.createObjectStore('offline_transactions', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}
