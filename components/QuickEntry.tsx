'use client';

import { useState, useEffect } from 'react';

interface Account {
  account_id: string;
  name: string;
  type: string;
  current_balance: number;
  currency: string;
  is_default: boolean;
}

interface Subcategory {
  subcategory_id: string;
  name: string;
}

interface Category {
  category_id: string;
  name: string;
  color: string;
  subcategories: Subcategory[];
}

interface QuickEntryProps {
  accounts: Account[];
  onSubmit: (transaction: any) => void;
}

export default function QuickEntry({ accounts, onSubmit }: QuickEntryProps) {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultAccount = accounts.find(acc => acc.is_default) || accounts[0];
      setAccountId(defaultAccount.account_id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('載入分類失敗:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId || !subcategoryId) return;

    onSubmit({
      account_id: accountId,
      subcategory_id: subcategoryId,
      amount: parseFloat(amount),
      type,
      note,
      date: new Date().toISOString().split('T')[0]
    });

    setAmount('');
    setSubcategoryId('');
    setNote('');
  };

  return (
    <div className="nes-container">
      <p className="title">快速記帳</p>
      
      <form onSubmit={handleSubmit}>
        {/* 收支類型 */}
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`nes-btn ${type === 'expense' ? 'is-error' : ''}`}
            style={{flex: 1}}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`nes-btn ${type === 'income' ? 'is-success' : ''}`}
            style={{flex: 1}}
          >
            收入
          </button>
        </div>

        {/* 金額 */}
        <div className="nes-field" style={{marginBottom: '20px'}}>
          <label htmlFor="amount">金額</label>
          <input
            type="number"
            id="amount"
            className="nes-input"
            placeholder="輸入金額"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            required
          />
        </div>

        {/* 帳戶選擇 */}
        <div className="nes-field" style={{marginBottom: '20px'}}>
          <label htmlFor="account">帳戶</label>
          <div className="nes-select">
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {accounts.map(account => (
                <option key={account.account_id} value={account.account_id}>
                  {account.name} (${account.current_balance.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 分類選擇 */}
        <div className="nes-field" style={{marginBottom: '20px'}}>
          <label htmlFor="subcategory">分類</label>
          <div className="nes-select">
            <select
              id="subcategory"
              value={subcategoryId}
              onChange={(e) => setSubcategoryId(e.target.value)}
              required
            >
              <option value="">選擇分類</option>
              {categories.map(category => (
                <optgroup key={category.category_id} label={category.name}>
                  {category.subcategories.map(sub => (
                    <option key={sub.subcategory_id} value={sub.subcategory_id}>
                      {sub.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* 備註 */}
        <div className="nes-field" style={{marginBottom: '20px'}}>
          <label htmlFor="note">備註</label>
          <input
            type="text"
            id="note"
            className="nes-input"
            placeholder="備註 (可選)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button type="submit" className="nes-btn is-primary" style={{width: '100%'}}>
          記帳
        </button>
      </form>
    </div>
  );
}
