'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QuickEntry from '@/components/QuickEntry';
import InstallPrompt from '@/components/InstallPrompt';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useTheme } from '@/components/ThemeProvider';
import { fetchWithAuth } from '@/lib/api-client';

export default function Home() {
  const router = useRouter();
  const { theme } = useTheme();
  const [user, setUser] = useState<{name: string} | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<{total_expense?: number, total_income?: number}>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // 檢查是否有 token，有的話設定用戶狀態
    const token = localStorage.getItem('token');
    if (token) {
      setUser({ name: 'User' }); // 設定基本用戶狀態
    }
    
    // 讀取 URL 參數（編輯模式）
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('edit') === 'true') {
        setEditData({
          transaction_id: params.get('transaction_id') || undefined,
          account_id: params.get('account_id') || undefined,
          subcategory_id: params.get('subcategory_id') || undefined,
          amount: params.get('amount') ? parseFloat(params.get('amount')!) : undefined,
          note: params.get('note') || undefined,
          date: params.get('date') || undefined,
          type: (params.get('type') as 'income' | 'expense') || undefined
        });
        // 清除 URL 參數
        window.history.replaceState({}, '', '/');
      }
    }
    
    loadUserData();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const accountsRes = await fetchWithAuth('/api/accounts');
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
      }

      const summaryRes = await fetchWithAuth('/api/analytics/summary');
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData || {});
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
      setAccounts([]);
      setSummary({});
    }
  };

  const handleTransaction = async (transaction: any) => {
    try {
      const isEdit = transaction.transaction_id;
      const url = isEdit 
        ? `/api/transactions/${transaction.transaction_id}`
        : '/api/transactions';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          account_id: transaction.account_id,
          subcategory_id: transaction.subcategory_id,
          amount: transaction.amount,
          note: transaction.note,
          date: transaction.date
        })
      });

      if (response.ok) {
        loadUserData();
        setEditData(null); // 清除編輯資料
        alert(isEdit ? '更新成功！' : '記帳成功！');
      } else {
        alert(isEdit ? '更新失敗' : '記帳失敗');
      }
    } catch (error) {
      // 離線時觸發背景同步
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          (registration as any).sync.register('background-sync');
        }
      }
      alert('已離線儲存，將在連線時同步');
    }
  };

  if (!isClient) {
    return <div className="app-container">Loading...</div>;
  }

  if (!user && typeof window !== 'undefined') {
    return (
      <div className="app-container" style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div className={`nes-container is-centered ${isDark ? 'is-dark' : ''}`} style={{maxWidth: '400px'}}>
          <p className="title">記帳應用</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const email = formData.get('email') as string;
            const password = formData.get('password') as string;
            
            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              });
              
              if (response.ok) {
                const { token, user: userData } = await response.json();
                localStorage.setItem('token', token);
                setUser(userData);
                loadUserData();
              } else {
                alert('登入失敗');
              }
            } catch (error) {
              alert('登入錯誤');
            }
          }}>
            <div className="nes-field">
              <label htmlFor="email">帳號:</label>
              <input type="email" name="email" className="nes-input" defaultValue="admin@test.com" required />
            </div>
            <div className="nes-field">
              <label htmlFor="password">密碼:</label>
              <input type="password" name="password" className="nes-input" required />
            </div>
            <button type="submit" className="nes-btn is-primary">登入</button>
          </form>
        </div>
        <InstallPrompt />
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className="app-container">
      <main>
        <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p className="title">記帳應用</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                className="nes-btn is-primary"
                onClick={() => router.push('/analytics')}
              >
                分析
              </button>
              <button
                className="nes-btn is-warning"
                onClick={() => router.push('/manage')}
              >
                管理
              </button>
              <button
                className="nes-btn is-success"
                onClick={() => router.push('/transactions')}
              >
                交易紀錄
              </button>
              <button
                className={`nes-btn ${isDark ? 'is-primary' : 'is-dark'}`}
                onClick={() => {
                  if (isDark) {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('theme', 'light');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    localStorage.setItem('theme', 'dark');
                  }
                  window.location.reload();
                }}
                title={isDark ? '切換為亮色主題' : '切換為暗色主題'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button
                className="nes-btn is-error"
                onClick={() => {
                  localStorage.removeItem('token');
                  setUser(null);
                }}
              >
                登出
              </button>
            </div>
          </div>
        </div>
        {isMobile ? (
          <div>
            <QuickEntry accounts={accounts} onSubmit={handleTransaction} initialData={editData} />
            
            <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
              <p className="title">本月概況</p>
              <div className="stats-grid">
                <div className={`nes-container is-dark`}>
                  <p>支出</p>
                  <p style={{color: '#ff6b6b', fontSize: '18px'}}>
                    ${summary.total_expense?.toLocaleString() || 0}
                  </p>
                </div>
                <div className={`nes-container is-dark`}>
                  <p>收入</p>
                  <p style={{color: '#51cf66', fontSize: '18px'}}>
                    ${summary.total_income?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <QuickEntry accounts={accounts} onSubmit={handleTransaction} initialData={editData} />
          </div>
        )}
      </main>
      
      {/* PWA 組件 */}
      <InstallPrompt />
      <OfflineIndicator />
    </div>
  );
}
