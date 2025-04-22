import { Whatsapp } from "venom-bot";
import { IContaBancario } from "../interfaces/IContaBancaria";
import { Category } from "../models/Category";
import MessageView from "../views/MessageView";
import AppContext from "../context/AppContext";
import { Transaction } from "../models/Transaction";
import AuthService from "../services/auth/AuthService";
import { AccountHandler } from "./AccountHandler";

interface TransactionData {
  amount: number;
  description: string;
  category: string;
  accountId: string;
  date: string;
}

export class TransactionHandler {
  private messageView: MessageView;
  private ContaBancariaSelecionada: IContaBancario | null = null
  private ListaContaBancaria: IContaBancario[] | null = null

  constructor() {
    this.messageView = new MessageView();
  }

  public async handleTransaction(
    phoneNumber: string,
    message: any,
    client: Whatsapp,
    transactionData: TransactionData
  ) {
    try {
      // 1. Validação de valor
      if (transactionData.amount <= 0) {
        await client.sendText(message.from, "⚠️ O valor da transação deve ser maior que zero.");
        return;
      }

      // 2. Obtenção de categorias válidas
      const formattedCategories = await AppContext.getCategories();
      const allCategories = [...formattedCategories.income, ...formattedCategories.expense];

      const category = this.getCategory(transactionData.category, allCategories);
      if (!category) {
        await client.sendText(message.from, "⚠️ Categoria inválida.");
        return;
      }

      // 3. Obtenção de contas bancárias do usuário logado
const authService = new AuthService();
const responseAccount = await authService.SearchAccounts();
const accounts: IContaBancario[] = responseAccount.data || [];

if (accounts.length > 1) {
  this.ListaContaBancaria = accounts;
}

if (!this.ContaBancariaSelecionada) {
  const contaSelecionada = await AccountHandler.selectBankAccount(
    phoneNumber,         // 1: número do usuário
    message,             // 2: mensagem original
    client,              // 3: instância do WhatsApp (venom)
    null,                // 4: conta previamente selecionada (null nesse caso)
    (conta) => {         // 5: função para setar a conta selecionada
      this.ContaBancariaSelecionada = conta;
    }
  );

  if (contaSelecionada) {
    await client.sendText(
      message.from,
      `✅ Conta selecionada: *${contaSelecionada.name}*`
    );
  } else {
    await client.sendText(message.from, "⚠️ Nenhuma conta foi selecionada.");
    return;
  }
}
const authData = await authService.login();
      // 4. Criação da transação
      const transaction = await this.createTransaction(transactionData, this.ContaBancariaSelecionada!);

      // 5. Confirmação para o usuário
      const confirmationMessage = this.messageView.transactionCreatedMessage({
        value: transaction.amount.toFixed(2),
        category: transaction.category,
        userName: authData.user.name,
        type: transaction.amount < 0 ? "expense" : "income",
      });
      await client.sendText(message.from, confirmationMessage);

    } catch (error) {
      console.error("❌ Erro ao processar transação:", error);
      await client.sendText(message.from, "⚠️ Ocorreu um erro ao processar sua transação.");
    }
  }

  // Validação de categoria (case insensitive)
  private getCategory(categoryName: string, validCategories: Category[]): Category | null {
    return validCategories.find((category) =>
      category.title.toLowerCase() === categoryName.toLowerCase()
    ) || null;
  }

  // Simulação de criação da transação no banco
  private async createTransaction(transactionData: TransactionData, account: IContaBancario): Promise<Transaction> {
    const newTransaction = new Transaction({
      amount: transactionData.amount,
      description: transactionData.description,
      category: transactionData.category,
      accountId: account.idSync,
      date: transactionData.date,
    });

    await newTransaction.save();
    return newTransaction;
  }
}

export default TransactionHandler;
