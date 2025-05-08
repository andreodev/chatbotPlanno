import axios from "axios";
import type { AuthResponse, Category, SearchAccountsResponse } from "./AuthDto/AuthDto";

class AuthService {
  private readonly API_URL: string;
  private readonly API_EMAIL: string;
  private readonly API_PASSWORD: string;

  private authToken: string | null = null;  // Armazena o token na memória

  constructor() {
    this.API_URL = process.env.API_URL || 'https://api.planofinancaspessoais.com';
    this.API_EMAIL = process.env.API_EMAIL || 'andreohenriqueleite@gmail.com';
    this.API_PASSWORD = process.env.API_PASSWORD || '30112004as';
    this.setupInterceptors();
  }

  private setupInterceptors() {
    axios.interceptors.request.use((config) => {
      return config;
    });

    axios.interceptors.response.use((response) => {
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
      this.authToken = response.data.token;  // Armazena o token na memória
      return response.data;
    } catch (error) {
      this.handleAuthError(error);
      throw error;
    }
  }

  public async SearchAccounts(): Promise<SearchAccountsResponse> {
    try {
      // Verifica se o token existe e é válido
      if (!this.authToken) {
        await this.login();  // Faz o login se o token não estiver disponível
      }
  
      const response = await axios.get<SearchAccountsResponse>(
        `${this.API_URL}/account/search`,
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

  public static formatCategories(rawCategories: any[]): Record<'income' | 'expense', Category[]> {
    const income: Category[] = [];
    const expense: Category[] = [];
  
    rawCategories.forEach((cat: any) => {
      const formatted: Category = {
        id: cat.id || '',
        title: cat.title,
        type: cat.type,
        color: cat.color || '#ccc',
        idSync: cat.idSync || null,
        icon: cat.icon || '' // Provide a default value or map it from `cat`
      };
  
      if (formatted.type === 'income') income.push(formatted);
      else if (formatted.type === 'expense') expense.push(formatted);
    });
  
    return { income, expense };
  }
}

export default AuthService;





