export interface Category {
  title: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  idSync: string;
}

export interface Role {
  code: string;
  idSync: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  categories: Category[];
  role: Role;
}

export interface User {
  id: number;
  name: string;
  email: string;
  photo: string | null;
  phone: string | null;
  idSync: string;
}


export interface Bank {
  name: string;
  icon: string;
  idSync: string;
}

export interface Account {
  name: string;
  balance: number;
  archived: boolean;
  idSync: string;
  bank: Bank;
}

export interface SearchAccountsResponse {
  count: number;
  data: Account[];
}
