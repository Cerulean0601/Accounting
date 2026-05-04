export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  parent_id?: string;
  children?: Category[];
  color?: string;
  sort_order?: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'credit';
  balance: number;
  initial_balance: number;
  current_balance: number;
}
