'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CategoryManager from './CategoryManager';
import TagManager from './TagManager';
import AccountManager from './AccountManager';
import { Category, Tag, Account } from './types';

import PaletteSelector from '@/components/PaletteSelector';
import { useTheme } from '@/components/ThemeProvider';

export default function ManagePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'categories' | 'tags' | 'accounts' | 'appearance'>('categories');
  const { theme, toggleTheme } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const accountsRes = await fetch('/api/accounts');
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.map((acc: any) => ({
          id: acc.account_id,
          name: acc.name,
          type: acc.type,
          initial_balance: acc.initial_balance,
          current_balance: acc.current_balance,
        })));
      }

      const categoriesRes = await fetch('/api/categories');
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const flatCategories: Category[] = [];
        categoriesData.forEach((cat: any) => {
          flatCategories.push({ id: cat.category_id, name: cat.name, type: cat.type || 'expense', color: cat.color });
          if (cat.subcategories && Array.isArray(cat.subcategories)) {
            cat.subcategories.forEach((sub: any) => {
              if (sub?.subcategory_id && sub?.name) {
                flatCategories.push({ id: sub.subcategory_id, name: sub.name, type: cat.type || 'expense', parent_id: cat.category_id, sort_order: sub.sort_order || 999 });
              }
            });
          }
        });
        setCategories(flatCategories);
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
    }

    setTags([
      { id: '1', name: '旅遊', color: '#ff6b6b' },
      { id: '2', name: '出差', color: '#51cf66' },
      { id: '3', name: '健身', color: '#339af0' },
    ]);
  };

  return (
    <div className="app-container">
      <div className="nes-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p className="title">資料管理</p>
          <button className="nes-btn" onClick={() => router.push('/')}>返回主頁</button>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className={`nes-btn ${activeTab === 'categories' ? 'is-primary' : ''}`} onClick={() => setActiveTab('categories')}>分類管理</button>
          <button className={`nes-btn ${activeTab === 'tags' ? 'is-primary' : ''}`} onClick={() => setActiveTab('tags')}>標籤管理</button>
          <button className={`nes-btn ${activeTab === 'accounts' ? 'is-primary' : ''}`} onClick={() => setActiveTab('accounts')}>帳戶管理</button>
          <button className={`nes-btn ${activeTab === 'appearance' ? 'is-primary' : ''}`} onClick={() => setActiveTab('appearance')}>外觀</button>
        </div>
      </div>

      {activeTab === 'categories' && <CategoryManager categories={categories} setCategories={setCategories} onReload={loadData} />}
      {activeTab === 'tags' && <TagManager tags={tags} setTags={setTags} />}
      {activeTab === 'accounts' && <AccountManager accounts={accounts} onReload={loadData} />}
      {activeTab === 'appearance' && (
        <div className="nes-container" style={{ marginTop: '20px' }}>
          <p className="title">主題配色</p>
          <div style={{ marginBottom: '20px' }}>
            <button className="nes-btn" onClick={toggleTheme}>
              {theme === 'dark' ? '☀️ 切換亮色' : '🌙 切換暗色'}
            </button>
          </div>
          <p style={{ marginBottom: '10px' }}>選擇風格：</p>
          <PaletteSelector />
        </div>
      )}
    </div>
  );
}
