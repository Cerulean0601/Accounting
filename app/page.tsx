'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import QuickEntry from '@/components/QuickEntry';
import InstallPrompt from '@/components/InstallPrompt';
import OfflineIndicator from '@/components/OfflineIndicator';
import LoginForm from '@/components/LoginForm';
import { useTheme } from '@/components/ThemeProvider';

export default function Home() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [summary, setSummary] = useState<{total_expense?: number, total_income?: number}>({});
  const [isMobile, setIsMobile] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

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
          type: (params.get('type') as 'income' | 'expense') || undefined,
        });
        window.history.replaceState({}, '', '/');
      }
    }

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (session) loadUserData();
  }, [session]);

  const loadUserData = async () => {
    try {
      const [accountsRes, summaryRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/analytics/summary'),
      ]);
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
      if (summaryRes.ok) {
        setSummary((await summaryRes.json()) || {});
      }
    } catch {
      setAccounts([]);
      setSummary({});
    }
  };

  const handleTransaction = async (transaction: any) => {
    try {
      const isEdit = transaction.transaction_id;
      const url = isEdit ? `/api/transactions/${transaction.transaction_id}` : '/api/transactions';
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: transaction.account_id,
          subcategory_id: transaction.subcategory_id,
          amount: transaction.amount,
          note: transaction.note,
          date: transaction.date,
        }),
      });
      if (response.ok) {
        loadUserData();
        setEditData(null);
        alert(isEdit ? '更新成功！' : '記帳成功！');
      } else {
        alert(isEdit ? '更新失敗' : '記帳失敗');
      }
    } catch {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          (registration as any).sync.register('background-sync');
        }
      }
      alert('已離線儲存，將在連線時同步');
    }
  };

  if (status === 'loading') {
    return <div className="app-container" style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading...</div>;
  }

  if (!session) {
    return (
      <div className="app-container" style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <LoginForm isDark={isDark} />
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
              <button className="nes-btn is-primary" onClick={() => router.push('/analytics')}>分析</button>
              <button className="nes-btn is-warning" onClick={() => router.push('/manage')}>管理</button>
              <button className="nes-btn is-success" onClick={() => router.push('/transactions')}>交易紀錄</button>
              <button
                className={`nes-btn ${isDark ? 'is-primary' : 'is-dark'}`}
                onClick={toggleTheme}
                title={isDark ? '切換為亮色主題' : '切換為暗色主題'}
              >
                {isDark ? '☀️' : '🌙'}
              </button>
              <button className="nes-btn is-error" onClick={() => signOut()}>登出</button>
            </div>
          </div>
        </div>
        {isMobile ? (
          <div>
            <QuickEntry accounts={accounts} onSubmit={handleTransaction} initialData={editData} />
            <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
              <p className="title">本月概況</p>
              <div className="stats-grid">
                <div className="nes-container is-dark">
                  <p>支出</p>
                  <p style={{color: '#ff6b6b', fontSize: '18px'}}>${summary.total_expense?.toLocaleString() || 0}</p>
                </div>
                <div className="nes-container is-dark">
                  <p>收入</p>
                  <p style={{color: '#51cf66', fontSize: '18px'}}>${summary.total_income?.toLocaleString() || 0}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <QuickEntry accounts={accounts} onSubmit={handleTransaction} initialData={editData} />
        )}
      </main>
      <InstallPrompt />
      <OfflineIndicator />
    </div>
  );
}
