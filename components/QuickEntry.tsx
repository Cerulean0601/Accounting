'use client';

import { useState, useEffect } from 'react';
import { Account } from '@/lib/db';

interface QuickEntryProps {
  accounts: Account[];
  onSubmit: (transaction: any) => void;
}

export default function QuickEntry({ accounts, onSubmit }: QuickEntryProps) {
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const categories = {
    expense: ['餐飲', '交通', '購物', '娛樂', '醫療', '其他'],
    income: ['薪資', '獎金', '投資', '其他']
  };

  const frequentTags = ['旅遊', '出差', '健身', '聚餐', '加油'];

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const defaultAccount = accounts.find(acc => acc.type === 'cash') || accounts[0];
      setAccountId(defaultAccount.account_id);
    }
  }, [accounts, accountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId || !category) return;

    onSubmit({
      account_id: accountId,
      amount: parseFloat(amount),
      type,
      category,
      tags,
      note,
      date: new Date().toISOString().split('T')[0]
    });

    setAmount('');
    setCategory('');
    setTags([]);
    setNote('');
  };

  const toggleTag = (tag: string) => {
    setTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="nes-container with-title">
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
                  {account.name} (${account.balance})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 分類 */}
        <div style={{marginBottom: '20px'}}>
          <label>分類</label>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px'}}>
            {categories[type].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`nes-btn ${category === cat ? 'is-primary' : ''}`}
                style={{fontSize: '12px'}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 標籤 */}
        <div style={{marginBottom: '20px'}}>
          <label>標籤</label>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px'}}>
            {frequentTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`nes-btn ${tags.includes(tag) ? 'is-warning' : ''}`}
                style={{fontSize: '10px', padding: '4px 8px'}}
              >
                {tag}
              </button>
            ))}
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
