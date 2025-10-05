'use client';

import { useState, useEffect } from 'react';
import Analytics from '@/components/Analytics';
import { useTheme } from '@/components/ThemeProvider';

export default function AnalyticsPage() {
  const { theme } = useTheme();
  const [summary, setSummary] = useState<{total_expense?: number, total_income?: number}>({});
  const [isClient, setIsClient] = useState(false);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setIsClient(true);
    loadSummaryData();
  }, []);

  const loadSummaryData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const summaryRes = await fetch('/api/analytics/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData || {});
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
      setSummary({});
    }
  };

  const handleBack = () => {
    // 確保返回首頁時有正確的狀態
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', '/');
      window.location.reload();
    }
  };

  if (!isClient) {
    return <div className="app-container">Loading...</div>;
  }

  return (
    <div className="app-container">
      <main>
        <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p className="title">分析</p>
            <button
              className="nes-btn is-primary"
              onClick={handleBack}
            >
              返回
            </button>
          </div>
        </div>
        
        <Analytics summary={summary} />
      </main>
    </div>
  );
}
