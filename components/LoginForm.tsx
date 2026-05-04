'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

interface LoginFormProps {
  isDark: boolean;
}

export default function LoginForm({ isDark }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    const form = new FormData(e.target as HTMLFormElement);
    const email = form.get('email') as string;
    const password = form.get('password') as string;

    if (isRegister) {
      const name = form.get('name') as string;
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAuthError(data.error || '註冊失敗');
        setAuthLoading(false);
        return;
      }
    }

    const result = await signIn('credentials', { email, password, redirect: false });
    setAuthLoading(false);
    if (result?.error) {
      setAuthError(isRegister ? '註冊成功但登入失敗，請手動登入' : '帳號或密碼錯誤');
    }
  };

  return (
    <div className={`nes-container is-centered ${isDark ? 'is-dark' : ''}`} style={{maxWidth: '400px', width: '100%'}}>
      <p className="title">{isRegister ? '註冊' : '登入'}</p>

      {authError && <p style={{color: '#ff6b6b', fontSize: '14px'}}>{authError}</p>}

      <form onSubmit={handleCredentialsSubmit}>
        {isRegister && (
          <div className="nes-field">
            <label htmlFor="name">名稱:</label>
            <input type="text" name="name" className="nes-input" />
          </div>
        )}
        <div className="nes-field">
          <label htmlFor="email">Email:</label>
          <input type="email" name="email" className="nes-input" required />
        </div>
        <div className="nes-field">
          <label htmlFor="password">密碼:</label>
          <input type="password" name="password" className="nes-input" required minLength={6} />
        </div>
        <button type="submit" className="nes-btn is-primary" disabled={authLoading} style={{width: '100%', marginTop: '12px'}}>
          {authLoading ? '處理中...' : isRegister ? '註冊' : '登入'}
        </button>
      </form>

      <div style={{margin: '16px 0', textAlign: 'center'}}>
        <span style={{color: '#999'}}>— 或 —</span>
      </div>

      <button
        className="nes-btn"
        style={{width: '100%'}}
        onClick={() => signIn('google')}
      >
        Google 登入
      </button>

      <p style={{marginTop: '16px', textAlign: 'center', cursor: 'pointer', textDecoration: 'underline'}}
        onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}>
        {isRegister ? '已有帳號？登入' : '沒有帳號？註冊'}
      </p>
    </div>
  );
}
