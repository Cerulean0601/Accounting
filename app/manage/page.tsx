'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string;
  children?: Category[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit';
  balance: number;
}

export default function ManagePage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags' | 'accounts'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // 分類相關狀態
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    parent_id: ''
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // 標籤相關狀態
  const [tagForm, setTagForm] = useState({ name: '', color: '#ff6b6b' });
  const [editingTag, setEditingTag] = useState<string | null>(null);

  // 帳戶相關狀態
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'cash' as 'cash' | 'bank' | 'credit',
    balance: 0
  });
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    // 模擬數據
    setCategories([
      { id: '1', name: '餐飲', type: 'expense' },
      { id: '2', name: '早餐', type: 'expense', parent_id: '1' },
      { id: '3', name: '午餐', type: 'expense', parent_id: '1' },
      { id: '4', name: '交通', type: 'expense' },
      { id: '5', name: '薪資', type: 'income' }
    ]);
    
    setTags([
      { id: '1', name: '旅遊', color: '#ff6b6b' },
      { id: '2', name: '出差', color: '#51cf66' },
      { id: '3', name: '健身', color: '#339af0' }
    ]);
    
    setAccounts([
      { id: '1', name: '現金', type: 'cash', balance: 5000 },
      { id: '2', name: '銀行帳戶', type: 'bank', balance: 50000 },
      { id: '3', name: '信用卡', type: 'credit', balance: -2000 }
    ]);
  };

  // 分類 CRUD
  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      setCategories(prev => prev.map(cat => 
        cat.id === editingCategory 
          ? { ...cat, ...categoryForm }
          : cat
      ));
      setEditingCategory(null);
    } else {
      const newCategory: Category = {
        id: Date.now().toString(),
        ...categoryForm
      };
      setCategories(prev => [...prev, newCategory]);
    }
    setCategoryForm({ name: '', type: 'expense', parent_id: '' });
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id && cat.parent_id !== id));
  };

  // 標籤 CRUD
  const handleTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTag) {
      setTags(prev => prev.map(tag => 
        tag.id === editingTag 
          ? { ...tag, ...tagForm }
          : tag
      ));
      setEditingTag(null);
    } else {
      const newTag: Tag = {
        id: Date.now().toString(),
        ...tagForm
      };
      setTags(prev => [...prev, newTag]);
    }
    setTagForm({ name: '', color: '#ff6b6b' });
  };

  const deleteTag = (id: string) => {
    setTags(prev => prev.filter(tag => tag.id !== id));
  };

  // 帳戶 CRUD
  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAccount) {
      setAccounts(prev => prev.map(acc => 
        acc.id === editingAccount 
          ? { ...acc, ...accountForm }
          : acc
      ));
      setEditingAccount(null);
    } else {
      const newAccount: Account = {
        id: Date.now().toString(),
        ...accountForm
      };
      setAccounts(prev => [...prev, newAccount]);
    }
    setAccountForm({ name: '', type: 'cash', balance: 0 });
  };

  const deleteAccount = (id: string) => {
    setAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  const mainCategories = categories.filter(cat => !cat.parent_id);
  const getSubCategories = (parentId: string) => categories.filter(cat => cat.parent_id === parentId);

  return (
    <div className="app-container">
      <div className="nes-container with-title">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <p className="title">資料管理</p>
          <button
            className="nes-btn"
            onClick={() => window.location.href = '/'}
          >
            返回主頁
          </button>
        </div>
        
        {/* 標籤頁 */}
        <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
          <button
            className={`nes-btn ${activeTab === 'categories' ? 'is-primary' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            分類管理
          </button>
          <button
            className={`nes-btn ${activeTab === 'tags' ? 'is-primary' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            標籤管理
          </button>
          <button
            className={`nes-btn ${activeTab === 'accounts' ? 'is-primary' : ''}`}
            onClick={() => setActiveTab('accounts')}
          >
            帳戶管理
          </button>
        </div>
      </div>

      {/* 分類管理 */}
      {activeTab === 'categories' && (
        <div>
          <div className="nes-container with-title">
            <p className="title">{editingCategory ? '編輯' : '新增'}分類</p>
            <form onSubmit={handleCategorySubmit}>
              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>分類名稱</label>
                <input
                  className="nes-input"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <button
                  type="button"
                  className={`nes-btn ${categoryForm.type === 'expense' ? 'is-error' : ''}`}
                  onClick={() => setCategoryForm({...categoryForm, type: 'expense'})}
                >
                  支出
                </button>
                <button
                  type="button"
                  className={`nes-btn ${categoryForm.type === 'income' ? 'is-success' : ''}`}
                  onClick={() => setCategoryForm({...categoryForm, type: 'income'})}
                >
                  收入
                </button>
              </div>

              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>主分類</label>
                <div className="nes-select">
                  <select
                    value={categoryForm.parent_id}
                    onChange={(e) => setCategoryForm({...categoryForm, parent_id: e.target.value})}
                  >
                    <option value="">無（作為主分類）</option>
                    {mainCategories.filter(cat => cat.type === categoryForm.type).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="nes-btn is-primary">
                  {editingCategory ? '更新' : '新增'}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    className="nes-btn"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryForm({ name: '', type: 'expense', parent_id: '' });
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="nes-container with-title">
            <p className="title">分類列表</p>
            {mainCategories.map(category => (
              <div key={category.id} style={{marginBottom: '15px'}}>
                <div className="nes-container is-dark" style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span>
                    <i className={`nes-icon ${category.type === 'income' ? 'coin' : 'heart'}`}></i>
                    {category.name}
                  </span>
                  <div>
                    <button
                      className="nes-btn is-warning"
                      style={{marginRight: '5px'}}
                      onClick={() => {
                        setCategoryForm({
                          name: category.name,
                          type: category.type,
                          parent_id: category.parent_id || ''
                        });
                        setEditingCategory(category.id);
                      }}
                    >
                      編輯
                    </button>
                    <button
                      className="nes-btn is-error"
                      onClick={() => deleteCategory(category.id)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
                
                {/* 子分類 */}
                {getSubCategories(category.id).map(subCategory => (
                  <div key={subCategory.id} style={{marginLeft: '20px', marginTop: '5px'}}>
                    <div className="nes-container" style={{
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px'
                    }}>
                      <span>└ {subCategory.name}</span>
                      <div>
                        <button
                          className="nes-btn is-warning"
                          style={{marginRight: '5px'}}
                          onClick={() => {
                            setCategoryForm({
                              name: subCategory.name,
                              type: subCategory.type,
                              parent_id: subCategory.parent_id || ''
                            });
                            setEditingCategory(subCategory.id);
                          }}
                        >
                          編輯
                        </button>
                        <button
                          className="nes-btn is-error"
                          onClick={() => deleteCategory(subCategory.id)}
                        >
                          刪除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 標籤管理 */}
      {activeTab === 'tags' && (
        <div>
          <div className="nes-container with-title">
            <p className="title">{editingTag ? '編輯' : '新增'}標籤</p>
            <form onSubmit={handleTagSubmit}>
              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>標籤名稱</label>
                <input
                  className="nes-input"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({...tagForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>顏色</label>
                <input
                  type="color"
                  className="nes-input"
                  value={tagForm.color}
                  onChange={(e) => setTagForm({...tagForm, color: e.target.value})}
                />
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="nes-btn is-primary">
                  {editingTag ? '更新' : '新增'}
                </button>
                {editingTag && (
                  <button
                    type="button"
                    className="nes-btn"
                    onClick={() => {
                      setEditingTag(null);
                      setTagForm({ name: '', color: '#ff6b6b' });
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="nes-container with-title">
            <p className="title">標籤列表</p>
            <div style={{display: 'grid', gap: '10px'}}>
              {tags.map(tag => (
                <div key={tag.id} className="nes-container is-dark" style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <div style={{
                      width: '20px', 
                      height: '20px', 
                      backgroundColor: tag.color,
                      border: '2px solid #fff'
                    }}></div>
                    {tag.name}
                  </span>
                  <div>
                    <button
                      className="nes-btn is-warning"
                      style={{marginRight: '5px'}}
                      onClick={() => {
                        setTagForm({ name: tag.name, color: tag.color });
                        setEditingTag(tag.id);
                      }}
                    >
                      編輯
                    </button>
                    <button
                      className="nes-btn is-error"
                      onClick={() => deleteTag(tag.id)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 帳戶管理 */}
      {activeTab === 'accounts' && (
        <div>
          <div className="nes-container with-title">
            <p className="title">{editingAccount ? '編輯' : '新增'}帳戶</p>
            <form onSubmit={handleAccountSubmit}>
              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>帳戶名稱</label>
                <input
                  className="nes-input"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>帳戶類型</label>
                <div className="nes-select">
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({...accountForm, type: e.target.value as any})}
                  >
                    <option value="cash">現金</option>
                    <option value="bank">銀行</option>
                    <option value="credit">信用卡</option>
                  </select>
                </div>
              </div>

              <div className="nes-field" style={{marginBottom: '15px'}}>
                <label>餘額</label>
                <input
                  type="number"
                  className="nes-input"
                  value={accountForm.balance}
                  onChange={(e) => setAccountForm({...accountForm, balance: parseFloat(e.target.value)})}
                  step="0.01"
                />
              </div>

              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="nes-btn is-primary">
                  {editingAccount ? '更新' : '新增'}
                </button>
                {editingAccount && (
                  <button
                    type="button"
                    className="nes-btn"
                    onClick={() => {
                      setEditingAccount(null);
                      setAccountForm({ name: '', type: 'cash', balance: 0 });
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="nes-container with-title">
            <p className="title">帳戶列表</p>
            <div style={{display: 'grid', gap: '10px'}}>
              {accounts.map(account => (
                <div key={account.id} className="nes-container is-dark" style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span>
                    <i className={`nes-icon ${
                      account.type === 'cash' ? 'coin' : 
                      account.type === 'bank' ? 'trophy' : 'heart'
                    }`}></i>
                    {account.name} ({account.type})
                  </span>
                  <span style={{color: account.balance >= 0 ? '#51cf66' : '#ff6b6b'}}>
                    ${account.balance.toLocaleString()}
                  </span>
                  <div>
                    <button
                      className="nes-btn is-warning"
                      style={{marginRight: '5px'}}
                      onClick={() => {
                        setAccountForm({
                          name: account.name,
                          type: account.type,
                          balance: account.balance
                        });
                        setEditingAccount(account.id);
                      }}
                    >
                      編輯
                    </button>
                    <button
                      className="nes-btn is-error"
                      onClick={() => deleteAccount(account.id)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
