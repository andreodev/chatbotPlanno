export interface TransactionData {
  amount: number;
  category: string;
  accountName: string;
  description: string;
  date: string; // ISO 8601 ou algo como '2025-04-22'
}
