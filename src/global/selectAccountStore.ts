import type { IContaBancario } from "../interfaces/IContaBancaria";

class selectedAccountStore  {
  private selectedAccounts = new Map<string, IContaBancario>();

  set(phoneNumber: string, conta: IContaBancario) {
    this.selectedAccounts.set(phoneNumber, conta);
  }

  get(phoneNumber: string): IContaBancario | undefined {
    return this.selectedAccounts.get(phoneNumber);
  }

  clear(phoneNumber: string) {
    this.selectedAccounts.delete(phoneNumber);
  }

  clearAll() {
    this.selectedAccounts.clear();
  }
}

export default new selectedAccountStore ();
