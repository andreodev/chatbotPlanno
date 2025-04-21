// Definindo o tipo Category no próprio arquivo ou em um arquivo separado
export interface Category {
  id: string
  title: string;
  type: string; // Exemplo: 'expense' ou 'income'
  icon: string
}
