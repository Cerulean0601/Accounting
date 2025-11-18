'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string;
  children?: Category[];
  color?: string;
  sort_order?: number;
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
  initial_balance: number;
  current_balance: number;
}

export default function ManagePage() {
  const router = useRouter();
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
    initial_balance: 0
  });
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // 載入真實帳戶資料
      const accountsRes = await fetch('/api/accounts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData.map((acc: any) => ({
          id: acc.account_id,
          name: acc.name,
          type: acc.type,
          initial_balance: acc.initial_balance,
          current_balance: acc.current_balance
        })));
      }

      // 載入真實分類資料
      const categoriesRes = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const flatCategories: Category[] = [];
        
        categoriesData.forEach((cat: any) => {
          // 主分類
          flatCategories.push({
            id: cat.category_id,
            name: cat.name,
            type: cat.type || 'expense',
            color: cat.color
          });
          
          // 子分類
          if (cat.subcategories && Array.isArray(cat.subcategories) && cat.subcategories.length > 0) {
            cat.subcategories.forEach((sub: any) => {
              if (sub && sub.subcategory_id && sub.name) {
                flatCategories.push({
                  id: sub.subcategory_id,
                  name: sub.name,
                  type: cat.type || 'expense',
                  parent_id: cat.category_id,
                  sort_order: sub.sort_order || 999
                });
              }
            });
          }
        });
        
        console.log('載入的分類資料:', flatCategories); // Debug log
        setCategories(flatCategories);
      }
    } catch (error) {
      console.error('載入資料失敗:', error);
    }

    // 模擬標籤資料
    setTags([
      { id: '1', name: '旅遊', color: '#ff6b6b' },
      { id: '2', name: '出差', color: '#51cf66' },
      { id: '3', name: '健身', color: '#339af0' }
    ]);
  };

  // 分類 CRUD
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (editingCategory) {
        // 更新分類 (需要新增 PUT API)
        alert('編輯功能尚未實作');
      } else {
        if (categoryForm.parent_id) {
          // 新增子分類
          const response = await fetch('/api/subcategories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              category_id: categoryForm.parent_id,
              name: categoryForm.name
            })
          });

          if (response.ok) {
            loadData();
            setCategoryForm({ name: '', type: 'expense', parent_id: '' });
            alert('子分類新增成功！');
          } else {
            alert('子分類新增失敗');
          }
        } else {
          // 新增主分類
          const response = await fetch('/api/categories', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              name: categoryForm.name,
              color: '#ff6b6b',
              type: categoryForm.type
            })
          });

          if (response.ok) {
            loadData();
            setCategoryForm({ name: '', type: 'expense', parent_id: '' });
            alert('分類新增成功！');
          } else {
            alert('分類新增失敗');
          }
        }
      }
    } catch (error) {
      console.error('分類操作失敗:', error);
      alert('操作失敗');
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('確定要刪除此分類嗎？')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const category = categories.find(cat => cat.id === id);
      const isSubcategory = category?.parent_id;
      
      const endpoint = isSubcategory ? `/api/subcategories/${id}` : `/api/categories/${id}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        loadData(); // 重新載入資料
        alert('刪除成功！');
      } else {
        const errorData = await response.json();
        alert(errorData.error || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除分類失敗:', error);
      alert('刪除失敗');
    }
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
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      if (editingAccount) {
        // 更新帳戶 (需要新增 PUT API)
        const response = await fetch(`/api/accounts/${editingAccount}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: accountForm.name,
            type: accountForm.type,
            current_balance: accountForm.initial_balance
          })
        });

        if (response.ok) {
          loadData(); // 重新載入資料
          setEditingAccount(null);
          setAccountForm({ name: '', type: 'cash', initial_balance: 0 });
          alert('帳戶更新成功！');
        } else {
          alert('帳戶更新失敗');
        }
      } else {
        // 新增帳戶
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: accountForm.name,
            type: accountForm.type,
            initial_balance: accountForm.initial_balance
          })
        });

        if (response.ok) {
          loadData(); // 重新載入資料
          setAccountForm({ name: '', type: 'cash', initial_balance: 0 });
          alert('帳戶新增成功！');
        } else {
          alert('帳戶新增失敗');
        }
      }
    } catch (error) {
      console.error('帳戶操作失敗:', error);
      alert('操作失敗');
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('確定要刪除此帳戶嗎？')) return;
    
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        loadData(); // 重新載入資料
        alert('帳戶刪除成功！');
      } else {
        alert('帳戶刪除失敗');
      }
    } catch (error) {
      console.error('刪除帳戶失敗:', error);
      alert('刪除失敗');
    }
  };

  const mainCategories = categories.filter(cat => !cat.parent_id);
  const getSubCategories = (parentId: string) => 
    categories.filter(cat => cat.parent_id === parentId)
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖曳排序處理
  const handleDragEnd = async (event: DragEndEvent, parentId: string) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const subCategories = getSubCategories(parentId);
      const oldIndex = subCategories.findIndex(item => item.id === active.id);
      const newIndex = subCategories.findIndex(item => item.id === over?.id);
      
      const newOrder = arrayMove(subCategories, oldIndex, newIndex);
      
      // 更新本地狀態
      const updatedCategories = categories.map(cat => {
        if (cat.parent_id === parentId) {
          const newIdx = newOrder.findIndex(item => item.id === cat.id);
          return { ...cat, sort_order: newIdx + 1 };
        }
        return cat;
      });
      setCategories(updatedCategories);
      
      // 發送到後端
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await fetch('/api/subcategories/reorder', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              subcategory_ids: newOrder.map(item => item.id)
            })
          });
        } catch (error) {
          console.error('排序更新失敗:', error);
          loadData();
        }
      }
    }
  };

  // 可拖曳的子分類項目
  function SortableItem({ subCategory }: { subCategory: Category }) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: subCategory.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className="nes-container"
      >
        <span>🔸 {subCategory.name}</span>
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
    );
  }

  return (
    <div className="app-container">
      <div className="nes-container">
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <p className="title">資料管理</p>
          <button
            className="nes-btn"
            onClick={() => router.push('/')}
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
        <style jsx global>{`
          .nes-container:active {
            z-index: 1000;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
          }
        `}</style>
      )}
      {activeTab === 'categories' && (
        <div>
          <div className="nes-container">
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

          <div className="nes-container">
            <p className="title">分類列表</p>
            {mainCategories.map(category => (
              <div key={category.id} style={{marginBottom: '15px'}}>
                <div className="nes-container is-dark" style={{
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span>
                    <i className={`nes-icon ${category.type === 'income' ? 'like' : 'coin'}`}></i>
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
                
                {/* 可拖曳的子分類 */}
                {getSubCategories(category.id).length > 0 && (
                  <div style={{marginLeft: '20px'}}>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(event) => handleDragEnd(event, category.id)}
                    >
                      <SortableContext
                        items={getSubCategories(category.id).map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {getSubCategories(category.id).map((subCategory) => (
                          <SortableItem key={subCategory.id} subCategory={subCategory} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 標籤管理 */}
      {activeTab === 'tags' && (
        <div>
          <div className="nes-container">
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

          <div className="nes-container">
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
          <div className="nes-container">
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
                <label>初始金額</label>
                <input
                  type="number"
                  className="nes-input"
                  value={accountForm.initial_balance}
                  onChange={(e) => setAccountForm({...accountForm, initial_balance: parseFloat(e.target.value)})}
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
                      setAccountForm({ name: '', type: 'cash', initial_balance: 0 });
                    }}
                  >
                    取消
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="nes-container">
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
                  <div style={{textAlign: 'right'}}>
                    <div style={{fontSize: '12px', color: '#999'}}>
                      初始: ${account.initial_balance.toLocaleString()}
                    </div>
                    <div>
                      當前: ${account.current_balance.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <button
                      className="nes-btn is-warning"
                      style={{marginRight: '5px'}}
                      onClick={() => {
                        setAccountForm({
                          name: account.name,
                          type: account.type,
                          initial_balance: account.initial_balance
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
