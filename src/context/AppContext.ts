// src/context/AppContext.ts

import type { AuthResponse, Category, Role } from "../services/auth/AuthDto/AuthDto";
import AuthService from "../services/auth/AuthService";

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

  public async getAuthData(): Promise<AuthResponse> {
    if (!this.authData) {
      this.authData = await new AuthService().login();
    }
    return this.authData;
  }

  public resetAuth(): void {
    this.authData = null;
  }

  public async getCategories(): Promise<Record<'income' | 'expense', Category[]>> {
    const auth = await this.getAuthData();
    return AuthService.formatCategories(auth.categories);
  }

  public async getRole(): Promise<Role> {
    const auth = await this.getAuthData();
    return auth.role;
  }

  public async getToken(): Promise<string> {
    const auth = await this.getAuthData();
    return auth.token;
  }


  public async getUser() {
    const auth = await this.getAuthData();
    return auth.user;
  }
}

export default AppContext.getInstance();
