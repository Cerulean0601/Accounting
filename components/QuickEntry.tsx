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

    // 重置表單
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
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4">快速記帳</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 收支類型 */}
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 px-4 rounded ${
              type === 'expense' ? 'bg-red-500 text-white' : 'bg-gray-200'
            }`}
          >
            支出
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 px-4 rounded ${
              type === 'income' ? 'bg-green-500 text-white' : 'bg-gray-200'
            }`}
          >
            收入
          </button>
        </div>

        {/* 金額 */}
        <input
          type="number"
          placeholder="金額"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-3 border rounded-lg text-lg"
          step="0.01"
          required
        />

        {/* 帳戶選擇 */}
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full p-3 border rounded-lg"
          required
        >
          {accounts.map(account => (
            <option key={account.account_id} value={account.account_id}>
              {account.name} (${account.balance})
            </option>
          ))}
        </select>

        {/* 分類 */}
        <div className="grid grid-cols-3 gap-2">
          {categories[type].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`p-2 rounded text-sm ${
                category === cat ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 標籤 */}
        <div>
          <label className="block text-sm font-medium mb-2">標籤</label>
          <div className="flex flex-wrap gap-2">
            {frequentTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  tags.includes(tag) ? 'bg-blue-500 text-white' : 'bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* 備註 */}
        <input
          type="text"
          placeholder="備註 (可選)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />

        <button
          type="submit"
          className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold"
        >
          記帳
        </button>
      </form>
    </div>
  );
}
