// src/models/Transaction.ts
export class Transaction {
  amount: number;
  description: string;
  category: string;
  accountId: string;
  date: string;

  constructor(data: { amount: number; description: string; category: string; accountId: string; date: string }) {
    this.amount = data.amount;
    this.description = data.description;
    this.category = data.category;
    this.accountId = data.accountId;
    this.date = data.date;
  }

  // Método fictício para salvar a transação no banco (ajuste conforme necessário)
  async save() {
    // Lógica para salvar no banco de dados
    console.log("Transação salva no banco:", this);
  }
}
