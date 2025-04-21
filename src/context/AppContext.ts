// src/context/AppContext.ts
import AuthService, { AuthResponse, Category, Role } from '../services/auth/AuthService';

class AppContext {
  private static instance: AppContext;
  private authData: AuthResponse | null = null;

  private constructor() {}

  public static getInstance(): AppContext {
    if (!AppContext.instance) {
      AppContext.instance = new AppContext();
    }
    return AppContext.instance;
  }

  public setAuthData(data: AuthResponse): void {
    this.authData = data;
  }

  public getAuthData(): AuthResponse {
    if (!this.authData) {
      throw new Error('Dados de autenticação ainda não foram carregados.');
    }
    return this.authData;
  }

  public getUser() {
    return this.getAuthData().user;
  }

  public getToken() {
    return this.getAuthData().token;
  }

  public getCategories(): Record<'income' | 'expense', Category[]> {
    return AuthService.formatCategories(this.getAuthData().categories);
  }

  public getRole(): Role {
    return this.getAuthData().role;
  }
}

export default AppContext.getInstance();
