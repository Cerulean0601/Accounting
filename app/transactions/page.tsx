'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';
import { fetchWithAuth } from '@/lib/api-client';

interface Transaction {
  transaction_id: string;
  date: string;
  amount: number;
  account_name: string;
  category_name: string | null;
  subcategory_name: string | null;
  note: string | null;
  type: string | null;
  account_id: string;
  subcategory_id: string | null;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setIsClient(true);
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      setLoading(true);
      const response = await fetchWithAuth('/api/transactions');

      if (response.ok) {
        const data = await response.json();
        setTransactions(data || []);
      } else {
        console.error('載入交易失敗');
      }
    } catch (error) {
      console.error('載入交易錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    // 將交易資料編碼為 URL 參數
    const params = new URLSearchParams({
      edit: 'true',
      transaction_id: transaction.transaction_id,
      account_id: transaction.account_id,
      subcategory_id: transaction.subcategory_id || '',
      amount: transaction.amount.toString(),
      date: transaction.date,
      note: transaction.note || '',
      type: transaction.type || 'expense'
    });
    
    router.push(`/?${params.toString()}`);
  };

  const handleDelete = async (transactionId: string) => {
    if (!confirm('確定要刪除這筆交易嗎？')) return;

    try {
      const response = await fetchWithAuth(`/api/transactions/${transactionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('交易刪除成功！');
        loadTransactions();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      console.error('刪除交易錯誤:', error);
      alert('刪除失敗');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (!isClient) {
    return <div className="app-container">Loading...</div>;
  }

  return (
    <div className="app-container">
      <main>
        <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <p className="title">交易紀錄</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <button
                className="nes-btn is-primary"
                onClick={() => router.push('/')}
              >
                返回首頁
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
            <p>載入中...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
            <p>尚無交易紀錄</p>
          </div>
        ) : (
          <div className={`nes-container ${isDark ? 'is-dark' : ''}`}>
            <table className="nes-table is-bordered is-centered" style={{width: '100%'}}>
              <thead>
                <tr>
                  <th>日期</th>
                  <th>帳戶</th>
                  <th>分類</th>
                  <th>子分類</th>
                  <th>金額</th>
                  <th>備註</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr 
                    key={transaction.transaction_id}
                    style={{cursor: 'pointer'}}
                    onClick={() => handleEdit(transaction)}
                  >
                    <td>{formatDate(transaction.date)}</td>
                    <td>{transaction.account_name}</td>
                    <td>{transaction.category_name || '-'}</td>
                    <td>{transaction.subcategory_name || '-'}</td>
                    <td style={{
                      color: transaction.type === 'expense' ? '#ff6b6b' : '#51cf66',
                      fontWeight: 'bold'
                    }}>
                      {transaction.type === 'expense' ? '-' : '+'}
                      ${transaction.amount.toLocaleString()}
                    </td>
                    <td>{transaction.note || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{display: 'flex', gap: '5px'}}>
                        <button
                          className="nes-btn is-primary"
                          style={{padding: '5px 10px', fontSize: '12px'}}
                          onClick={() => handleEdit(transaction)}
                        >
                          編輯
                        </button>
                        <button
                          className="nes-btn is-error"
                          style={{padding: '5px 10px', fontSize: '12px'}}
                          onClick={() => handleDelete(transaction.transaction_id)}
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

