'use client';

import { useState } from 'react';
import { Account } from './types';

interface AccountManagerProps {
  accounts: Account[];
  onReload: () => void;
}

export default function AccountManager({ accounts, onReload }: AccountManagerProps) {
  const [accountForm, setAccountForm] = useState({ name: '', type: 'cash' as 'cash' | 'bank' | 'credit', initial_balance: 0 });
  const [editingAccount, setEditingAccount] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const response = await fetch(`/api/accounts/${editingAccount}`, {
          method: 'PUT',
          body: JSON.stringify({ name: accountForm.name, type: accountForm.type, current_balance: accountForm.initial_balance }),
        });
        if (response.ok) { onReload(); setEditingAccount(null); setAccountForm({ name: '', type: 'cash', initial_balance: 0 }); alert('帳戶更新成功！'); }
        else alert('帳戶更新失敗');
      } else {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          body: JSON.stringify({ name: accountForm.name, type: accountForm.type, initial_balance: accountForm.initial_balance }),
        });
        if (response.ok) { onReload(); setAccountForm({ name: '', type: 'cash', initial_balance: 0 }); alert('帳戶新增成功！'); }
        else alert('帳戶新增失敗');
      }
    } catch (error) {
      console.error('帳戶操作失敗:', error);
      alert('操作失敗');
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('確定要刪除此帳戶嗎？')) return;
    try {
      const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (response.ok) { onReload(); alert('帳戶刪除成功！'); }
      else alert('帳戶刪除失敗');
    } catch (error) {
      console.error('刪除帳戶失敗:', error);
      alert('刪除失敗');
    }
  };

  return (
    <div>
      <div className="nes-container">
        <p className="title">{editingAccount ? '編輯' : '新增'}帳戶</p>
        <form onSubmit={handleSubmit}>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>帳戶名稱</label>
            <input className="nes-input" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} required />
          </div>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>帳戶類型</label>
            <div className="nes-select">
              <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as any })}>
                <option value="cash">現金</option>
                <option value="bank">銀行</option>
                <option value="credit">信用卡</option>
              </select>
            </div>
          </div>
          <div className="nes-field" style={{ marginBottom: '15px' }}>
            <label>初始金額</label>
            <input type="number" className="nes-input" value={accountForm.initial_balance} onChange={(e) => setAccountForm({ ...accountForm, initial_balance: parseFloat(e.target.value) })} step="0.01" />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="nes-btn is-primary">{editingAccount ? '更新' : '新增'}</button>
            {editingAccount && (
              <button type="button" className="nes-btn" onClick={() => { setEditingAccount(null); setAccountForm({ name: '', type: 'cash', initial_balance: 0 }); }}>取消</button>
            )}
          </div>
        </form>
      </div>

      <div className="nes-container">
        <p className="title">帳戶列表</p>
        <div style={{ display: 'grid', gap: '10px' }}>
          {accounts.map(account => (
            <div key={account.id} className="nes-container is-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                <i className={`nes-icon ${account.type === 'cash' ? 'coin' : account.type === 'bank' ? 'trophy' : 'heart'}`}></i>
                {account.name} ({account.type})
              </span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#999' }}>初始: ${account.initial_balance.toLocaleString()}</div>
                <div>當前: ${account.current_balance.toLocaleString()}</div>
              </div>
              <div>
                <button className="nes-btn is-warning" style={{ marginRight: '5px' }} onClick={() => { setAccountForm({ name: account.name, type: account.type, initial_balance: account.initial_balance }); setEditingAccount(account.id); }}>編輯</button>
                <button className="nes-btn is-error" onClick={() => deleteAccount(account.id)}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
