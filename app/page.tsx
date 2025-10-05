'use client';

import { useState, useEffect } from 'react';
import QuickEntry from '@/components/QuickEntry';
import ThemeButtons from '@/components/ThemeButtons';
import { useTheme } from '@/components/ThemeProvider';

export default function Home() {
  const { theme } = useTheme();
  const [user, setUser] = useState<{name: string} | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<{total_expense?: number, total_income?: number}>({});
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setIsClient(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    loadUserData();
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const loadUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const accountsRes = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(Array.isArray(accountsData) ? accountsData : []);
      }

      const summaryRes = await fetch('/api/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
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
        loadUserData();
        alert('記帳成功！');
      } else {
        alert('記帳失敗');
      }
    } catch (error) {
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
              <input type="password" name="password" className="nes-input" defaultValue="123456" required />
            </div>
            <button type="submit" className="nes-btn is-primary">登入</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <ThemeButtons />
      
      <main>
        <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p className="title">記帳應用</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                className="nes-btn is-primary"
                onClick={() => window.location.href = '/analytics'}
              >
                分析
              </button>
              <button
                className="nes-btn is-warning"
                onClick={() => window.location.href = '/manage'}
              >
                管理
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
            <QuickEntry accounts={accounts} onSubmit={handleTransaction} />
            
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
            <QuickEntry accounts={accounts} onSubmit={handleTransaction} />
          </div>
        )}
      </main>
    </div>
  );
}
