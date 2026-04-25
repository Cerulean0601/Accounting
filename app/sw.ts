import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// === 離線記帳：IndexedDB 儲存 + 背景同步 ===

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("AccountingDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("offline_transactions")) {
        const store = db.createObjectStore("offline_transactions", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp");
      }
    };
  });
}

async function storeOfflineTransaction(request: Request): Promise<Response> {
  const data = await request.json();
  const db = await openDB();
  const tx = db.transaction(["offline_transactions"], "readwrite");
  const store = tx.objectStore("offline_transactions");
  store.add({ ...data, timestamp: Date.now(), synced: false });
  return new Response(JSON.stringify({ success: true, offline: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function syncOfflineTransactions(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(["offline_transactions"], "readwrite");
  const store = tx.objectStore("offline_transactions");
  const all: any[] = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  for (const item of all.filter((t) => !t.synced)) {
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (response.ok) {
        const delTx = db.transaction(["offline_transactions"], "readwrite");
        delTx.objectStore("offline_transactions").delete(item.id);
      }
    } catch {
      // 仍然離線，下次再試
    }
  }
}

// 攔截離線 POST /api/transactions
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  if (
    request.method === "POST" &&
    request.url.includes("/api/transactions")
  ) {
    event.respondWith(
      fetch(request.clone()).catch(() => storeOfflineTransaction(request))
    );
  }
});

// 背景同步
self.addEventListener("sync", (event: any) => {
  if (event.tag === "background-sync") {
    event.waitUntil(syncOfflineTransactions());
  }
});
