// src/services/AuthService.ts
import axios from 'axios';
import dotenv from 'dotenv';
import {SearchAccountsResponse, } from "./AuthDto/AuthDto"

dotenv.config();

interface User {
  id: number;
  name: string;
  email: string;
  photo: string | null;
  phone: string | null;
  idSync: string;
}

export interface Category {
  title: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  idSync: string;
}

export interface ContaBancaria {
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

class AuthService {
  private readonly API_URL: string;
  private readonly API_EMAIL: string;
  private readonly API_PASSWORD: string;

  private authToken: string | null = null; 

  constructor() {
    this.API_URL = process.env.API_URL || '';
    this.API_EMAIL = process.env.API_EMAIL || 'andreohenriqueleite@gmail.com';
    this.API_PASSWORD = process.env.API_PASSWORD || '30112004as';
    this.setupInterceptors();
  }

  private setupInterceptors() {
    axios.interceptors.request.use((config) => {
      return config;
    });

    axios.interceptors.response.use((response) => {
      console.log('📥 Recebida resposta com status:', response.status);
      return response;
    }, (error) => {
      console.error('🔴 Erro na requisição:', error.response?.status || error.message);
      return Promise.reject(error);
    });
  }

  public async login(): Promise<AuthResponse> {
    console.log('🔍 Iniciando processo de login...');
    
    try {
      if (!this.API_URL) {
        throw new Error('URL da API não configurada');
      }

      const response = await axios.post<AuthResponse>(`${this.API_URL}/login`, {
        email: this.API_EMAIL,
        password: this.API_PASSWORD
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      this.logAuthData(response.data);
      this.authToken = response.data.token
      return response.data;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  public async SearchAccounts(): Promise<SearchAccountsResponse> {
    try {
      if (!this.API_URL) {
        throw new Error('URL da API não configurada');
      }
  
      if (!this.authToken) {
        throw new Error('Token de autenticação não disponível. Faça login primeiro.');
      }
      
      console.log('passou aqui')

      const response = await axios.get<SearchAccountsResponse>(
        `https://api.planofinancaspessoais.com/account/search`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.authToken}`
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  private logAuthData(data: AuthResponse) {
    console.log('✅ Login bem-sucedido!');
    console.log('👤 Usuário:', {
      id: data.token,
      name: data.user.name,
      email: data.user.email
    });
  }

  private handleAuthError(error: unknown) {
    console.error('❌ Falha no login:');
    
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Mensagem:', error.response?.data?.message || error.message);
      
      if (error.response?.status === 401) {
        console.error('Credenciais inválidas - verifique email e senha');
      }
    } else {
      console.error('Erro desconhecido:', error);
    }
  }

  // Método para obter categorias formatadas para uso no frontend
  public static formatCategories(categories: Category[]) {
    return categories.reduce((acc, category) => {
      if (!acc[category.type]) {
        acc[category.type] = [];
      }
      acc[category.type].push(category);
      return acc;
    }, {} as Record<'income' | 'expense', Category[]>);
  }
}

export default AuthService;