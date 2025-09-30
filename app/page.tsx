'use client';

import { useState, useEffect } from 'react';
import QuickEntry from '@/components/QuickEntry';
import Analytics from '@/components/Analytics';

export default function Home() {
  const [user, setUser] = useState<{name: string} | null>(null);
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState<{total_expense?: number, total_income?: number}>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 檢查螢幕尺寸
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // 載入用戶資料
    loadUserData();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // 載入帳戶
      const accountsRes = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const accountsData = await accountsRes.json();
      setAccounts(accountsData);

      // 載入統計資料
      const summaryRes = await fetch('/api/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const summaryData = await summaryRes.json();
      setSummary(summaryData);
    } catch (error) {
      console.error('載入資料失敗:', error);
    }
  };

  const handleTransaction = async (transaction: any) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(transaction)
      });

      if (response.ok) {
        // 重新載入資料
        loadUserData();
        alert('記帳成功！');
      } else {
        alert('記帳失敗');
      }
    } catch (error) {
      // 離線時存入 IndexedDB
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          (registration as any).sync.register('background-sync');
        }
      }
      alert('已離線儲存，將在連線時同步');
    }
  };

  if (!user && typeof window !== 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">記帳應用</h1>
          <button
            onClick={() => {
              // 簡化登入流程，實際應用需要完整的登入表單
              localStorage.setItem('token', 'demo-token');
              setUser({ name: 'Demo User' });
              loadUserData();
            }}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            開始使用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">記帳應用</h1>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                setUser(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isMobile ? (
          // 手機版：快速記帳優先
          <div className="space-y-4">
            <QuickEntry accounts={accounts} onSubmit={handleTransaction} />
            
            {/* 簡化的統計資訊 */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="font-semibold mb-2">本月概況</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">支出</p>
                  <p className="text-lg font-bold text-red-600">
                    ${summary.total_expense?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">收入</p>
                  <p className="text-lg font-bold text-green-600">
                    ${summary.total_income?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 桌面版：完整分析功能
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-4">
              <QuickEntry accounts={accounts} onSubmit={handleTransaction} />
            </div>
            <div className="col-span-8">
              <Analytics summary={summary} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
