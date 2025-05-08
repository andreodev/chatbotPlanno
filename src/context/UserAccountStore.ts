// src/store/UserAccountsStore.ts
import type { IContaBancario } from "../interfaces/IContaBancaria";

class UserAccountsStore {
  private contas: Record<string, IContaBancario[]> = {};

  set(phoneNumber: string, contas: IContaBancario[]) {
    this.contas[phoneNumber] = contas;
  }

  get(phoneNumber: string): IContaBancario[] {
    return this.contas[phoneNumber] || [];
  }

  clear(phoneNumber: string) {
    delete this.contas[phoneNumber];
  }
}

export const userAccountsStore = new UserAccountsStore();
