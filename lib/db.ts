import { sql } from '@vercel/postgres';
import { kv } from '@vercel/kv';

export const db = {
  query: sql,
  cache: kv
};

export interface User {
  user_id: string;
  email: string;
  name: string;
  default_account_id?: string;
}

export interface Account {
  account_id: string;
  user_id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit_card' | 'digital_wallet';
  balance: number;
  currency: string;
  color?: string;
  is_active: boolean;
}

export interface Transaction {
  transaction_id: string;
  user_id: string;
  account_id: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  tags: string[];
  note?: string;
  date: string;
  created_at: string;
}
