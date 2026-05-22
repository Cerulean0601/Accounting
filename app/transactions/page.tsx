'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/components/ThemeProvider';


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

interface Account {
  account_id: string;
  name: string;
  type: string;
}

interface Category {
  category_id: string;
  name: string;
  type: string;
  subcategories: Array<{
    subcategory_id: string;
    name: string;
  }>;
}

interface Filters {
  startDate: string | null;
  endDate: string | null;
  accountId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  type: 'income' | 'expense' | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  // 篩選狀態
  const [filters, setFilters] = useState<Filters>({
    startDate: null,
    endDate: null,
    accountId: null,
    categoryId: null,
    subcategoryId: null,
    type: null
  });
  
  // 分頁狀態
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0
  });
  
  // 帳戶和分類列表
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // 載入帳戶和分類列表
  const loadFilterOptions = useCallback(async () => {
    try {
      setLoadingFilters(true);
      
      // 載入帳戶
      const accountsResponse = await fetch('/api/accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData || []);
      }
      
      // 載入分類（包含子分類）
      const categoriesResponse = await fetch('/api/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData || []);
      }
    } catch (error) {
      console.error('載入篩選選項錯誤:', error);
    } finally {
      setLoadingFilters(false);
    }
  }, []);

  // 載入交易資料
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      
      // 構建查詢參數
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      });
      
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.accountId) params.append('accountId', filters.accountId);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.subcategoryId) params.append('subcategoryId', filters.subcategoryId);
      if (filters.type) params.append('type', filters.type);

      const response = await fetch(`/api/transactions?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.data || []);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }));
      } else {
        console.error('載入交易失敗');
      }
    } catch (error) {
      console.error('載入交易錯誤:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, router]);

  // 初始化
  useEffect(() => {
    setIsClient(true);
    loadFilterOptions();
  }, [loadFilterOptions]);

  // 當篩選條件變更時重置到第一頁
  const filtersString = JSON.stringify(filters);
  useEffect(() => {
    if (isClient && !loadingFilters) {
      setPagination(prev => {
        if (prev.page !== 1) {
          return { ...prev, page: 1 };
        }
        return prev;
      });
    }
  }, [filtersString, isClient, loadingFilters]);

  // 當頁碼或篩選條件變更時載入資料
  useEffect(() => {
    if (isClient && !loadingFilters) {
      loadTransactions();
    }
  }, [pagination.page, filtersString, isClient, loadingFilters, loadTransactions]);

  // 根據選中的分類獲取子分類列表
  const availableSubcategories = useMemo(() => {
    if (!filters.categoryId) return [];
    const category = categories.find(c => c.category_id === filters.categoryId);
    return category?.subcategories || [];
  }, [categories, filters.categoryId]);

  // 處理篩選變更
  const handleFilterChange = (key: keyof Filters, value: string | null) => {
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value };
      // 如果分類變更，清除子分類選擇
      if (key === 'categoryId') {
        newFilters.subcategoryId = null;
      }
      return newFilters;
    });
  };

  // 清除所有篩選
  const handleClearFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      accountId: null,
      categoryId: null,
      subcategoryId: null,
      type: null
    });
  };

  // 處理分頁
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleEdit = (transaction: Transaction) => {
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
      const response = await fetch(`/api/transactions/${transactionId}`, {
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

        {/* 篩選區域 */}
        <div className={`nes-container ${isDark ? 'is-dark' : ''}`} style={{marginTop: '20px'}}>
          <p className="title" style={{fontSize: '18px', marginBottom: '15px'}}>篩選條件</p>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
          }}>
            {/* 日期範圍 */}
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>開始日期</label>
              <input
                type="date"
                className="nes-input"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || null)}
                style={{width: '100%'}}
              />
            </div>
            
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>結束日期</label>
              <input
                type="date"
                className="nes-input"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || null)}
                style={{width: '100%'}}
              />
            </div>
            
            {/* 帳戶 */}
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>帳戶</label>
              <select
                className="nes-select"
                value={filters.accountId || ''}
                onChange={(e) => handleFilterChange('accountId', e.target.value || null)}
                style={{width: '100%'}}
              >
                <option value="">全部</option>
                {accounts.map(account => (
                  <option key={account.account_id} value={account.account_id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 分類 */}
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>分類</label>
              <select
                className="nes-select"
                value={filters.categoryId || ''}
                onChange={(e) => handleFilterChange('categoryId', e.target.value || null)}
                style={{width: '100%'}}
              >
                <option value="">全部</option>
                {categories.map(category => (
                  <option key={category.category_id} value={category.category_id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 子分類 */}
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>子分類</label>
              <select
                className="nes-select"
                value={filters.subcategoryId || ''}
                onChange={(e) => handleFilterChange('subcategoryId', e.target.value || null)}
                style={{width: '100%'}}
                disabled={!filters.categoryId || availableSubcategories.length === 0}
              >
                <option value="">全部</option>
                {availableSubcategories.map(subcategory => (
                  <option key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                    {subcategory.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 類型 */}
            <div>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '14px'}}>類型</label>
              <select
                className="nes-select"
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', (e.target.value as 'income' | 'expense' | '') || null)}
                style={{width: '100%'}}
              >
                <option value="">全部</option>
                <option value="income">收入</option>
                <option value="expense">支出</option>
              </select>
            </div>
          </div>
          
          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
            <button
              className="nes-btn"
              onClick={handleClearFilters}
            >
              清除篩選
            </button>
          </div>
        </div>

        {/* 交易列表 */}
        {loading ? (
          <div className={`nes-container ${isDark ? 'is-dark' : ''}`} style={{marginTop: '20px'}}>
            <p>載入中...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className={`nes-container ${isDark ? 'is-dark' : ''}`} style={{marginTop: '20px'}}>
            <p>尚無交易紀錄</p>
          </div>
        ) : (
          <>
            <div className={`nes-container ${isDark ? 'is-dark' : ''}`} style={{marginTop: '20px'}}>
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

            {/* 分頁控制 */}
            {pagination.totalPages > 1 && (
              <div className={`nes-container ${isDark ? 'is-dark' : ''}`} style={{marginTop: '20px'}}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{fontSize: '14px'}}>
                    第 {pagination.page} 頁，共 {pagination.totalPages} 頁（總共 {pagination.total} 筆）
                  </div>
                  
                  <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <button
                      className="nes-btn"
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                    >
                      第一頁
                    </button>
                    <button
                      className="nes-btn"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      上一頁
                    </button>
                    
                    <span style={{fontSize: '14px'}}>
                      第 <input
                        type="number"
                        className="nes-input"
                        value={pagination.page}
                        onChange={(e) => {
                          const page = parseInt(e.target.value, 10);
                          if (page >= 1 && page <= pagination.totalPages) {
                            handlePageChange(page);
                          }
                        }}
                        min={1}
                        max={pagination.totalPages}
                        style={{width: '60px', textAlign: 'center'}}
                      /> 頁
                    </span>
                    
                    <button
                      className="nes-btn"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      下一頁
                    </button>
                    <button
                      className="nes-btn"
                      onClick={() => handlePageChange(pagination.totalPages)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      最後一頁
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
