// src/controllers/MessageController.ts
import { extractPhoneNumber } from "../utils/phonneUtils";
import User from "../models/User";
import MessageView from "../views/MessageView";
import deepseekService from "../services/DeepSeekService";
import { Whatsapp } from "venom-bot";
import AuthService from "../services/auth/AuthService";
import { Category } from "../models/Category";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import { CategoryHandler } from "../handlers/CategoryHandler";
import { AccountTotalProcess } from "../handlers/AccountTotalProcess";
import { ProcessGreeting } from "../handlers/ProcessGreeting";
import { ProcessAccountSelection } from "../handlers/ProcessAccountSelection";
import { TransactionWithCategory } from "../handlers/TransactionWithCategory";
import { ProcessTransactionConfirmation } from "../handlers/ProcessTransactionConfirmation";

interface MessageContext {
  phoneNumber: string;
  user: any;
  userName: string;
  authData: any;
  validCategories: Category[];
}

interface PendingConfirmation {
  type: "category" | "transaction";
  data: any;
  timestamp: number;
  suggestedCategory?: string; // Optional property for suggested category
}

export class MessageController {
  private userModel: User;
  private ContaBancariaSelecionada: IContaBancario | any = null;
  private ListaContaBancaria: IContaBancario[] | any = null;
  private messageView: MessageView;
  private pendingConfirmations: Map<string, PendingConfirmation>;

  constructor() {
    this.userModel = new User();
    this.messageView = new MessageView();
    this.pendingConfirmations = new Map();
  }

  public async handleIncomingMessage(message: any, client: Whatsapp) {
    try {
      const context = await this.buildContext(message);

      // 👉 Trata comandos diretos antes de usar IA
      const handled = await this.executeHandlersInOrder(
        message,
        client,
        context
      );
      if (handled) return;

      // 🤖 Se nenhum handler direto tratou, usa IA
      await this.handleWithDeepSeek(message, client, context);
    } catch (error) {
      this.handleError(error, message, client);
    }
  }

  // Executa os handlers na ordem definida
  private async executeHandlersInOrder(
    message: any,
    client: Whatsapp,
    context: MessageContext
  ): Promise<boolean> {
    const categoryHandler = new CategoryHandler(new MessageView());
    const accountTotalProcess = new AccountTotalProcess();
    const processGreeting = new ProcessGreeting(new MessageView());
    const accountSelection = new ProcessAccountSelection();
    const processTransactionConfirmation = new ProcessTransactionConfirmation();

    const handlers = [
      categoryHandler.handle.bind(categoryHandler), //responsavel pelas categorias
      processGreeting.processGreeting.bind(processGreeting), // responsavel pela recepção
      accountTotalProcess.processAccountTotal.bind(accountTotalProcess), //responsavel por mostrar a mensagem de total
      accountSelection.processAccountSelection.bind(accountSelection),
      processTransactionConfirmation.processTransactionConfirmation.bind(
        processTransactionConfirmation
      ), //responsavel pela transação
    ];

    for (const handler of handlers) {
      const result = await handler(message, client, context);
      if (result) return true;
    }

    return false;
  }

  private async findBestCategoryMatch(
    categoryName: string,
    categories: Category[]
  ): Promise<Category | null> {
    const lowerInput = categoryName.toLowerCase();

    // 1. Verifica correspondência exata
    const exactMatch = categories.find(
      (c) => c.title.toLowerCase() === lowerInput
    );
    if (exactMatch) return exactMatch;

    // 2. Verifica correspondência parcial (mais tolerante)
    const partialMatch = categories.find(
      (c) =>
        c.title.toLowerCase().includes(lowerInput) ||
        lowerInput.includes(c.title.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    // 3. Mapeamento de subcategorias mais abrangente
    const subcategoryMap: Record<string, string> = {
      uber: "Transporte",
      taxi: "Transporte",
      "99": "Transporte",
      ifood: "Alimentação",
      gasolina: "Transporte",
      posto: "Transporte",
      combustível: "Transporte",
      abastecimento: "Transporte",
      // Adicione outros mapeamentos conforme necessário
    };

    // Verifica se alguma palavra-chave do mapeamento está contida na categoria informada
    for (const [keyword, mappedCategory] of Object.entries(subcategoryMap)) {
      if (lowerInput.includes(keyword)) {
        return categories.find((c) => c.title === mappedCategory) || null;
      }
    }

    return null;
  }

  private async handleWithDeepSeek(
    message: any,
    client: any,
    context: MessageContext
  ) {
    if (!message.body || typeof message.body !== "string") {
      const text = this.messageView.invalidMessageResponse();
      return this.safeSendText(client, message.from, text);
    }

    // 3. Processamento normal com DeepSeek
    const aiResponse = await deepseekService.generateFormattedResponse(
      message.body
    );

    if (!aiResponse || !aiResponse.data) {
      const response =
        "❌ Não conseguimos processar sua mensagem corretamente. Por favor, tente novamente.";
      return this.safeSendText(client, message.from, response);
    }

    console.log("AI RESPONSE DATA", aiResponse);
    const transactionWithCategory = new TransactionWithCategory();

    // Verifica se aiResponse.data e aiResponse.data.category estão presentes
    if (aiResponse?.data?.category) {
      console.log("Categoria encontrada:", aiResponse.data.category);
      return transactionWithCategory.handleTransactionWithCategory(
        message,
        client,
        context,
        aiResponse
      );
    } else {
      console.log("Categoria não encontrada no AI Response");
      const response =
        "❌ Não conseguimos identificar a categoria. Por favor, tente novamente.";
      return this.safeSendText(client, message.from, response);
    }
  }

  private async handleTransactionWithCategory(
    message: any,
    client: any,
    context: MessageContext,
    aiResponse: any
  ) {
    const bestMatch = await this.findBestCategoryMatch(
      aiResponse.data.category,
      context.validCategories
    );

    if (!bestMatch) {
      const isVehicleRelated =
        /(gasolina|posto|combustível|abastecer|carro|moto)/i.test(
          aiResponse.data.category
        );
      const suggestedCategory = isVehicleRelated ? "Transporte" : "Outros";

      this.pendingConfirmations.set(context.phoneNumber, {
        type: "category",
        data: aiResponse.data,
        suggestedCategory,
        timestamp: Date.now(),
      });

      const response = this.messageView.suggestCategoryMessage(
        aiResponse.data.category,
        suggestedCategory,
        context.validCategories
      );
      return this.safeSendText(client, message.from, response);
    }

    aiResponse.data.category = bestMatch.title;

    if (!aiResponse.data.type) {
      aiResponse.data.type = "expense"; // 👈 ajuste aqui conforme sua regra
    }

    // Prepara os dados para a confirmação
    const confirmationData = {
      ...aiResponse.data,
      contaBancariaSelecionada: this.ContaBancariaSelecionada,
      listaContasBancarias: this.ListaContaBancaria,
      setSelectedContaBancaria: this.setSelectedContaBancaria,
      userName: context.userName,
      body: message.body,
    };

    // 1. Primeiro mostra a mensagem de confirmação inicial
    const confirmationMessage =
      this.messageView.transactionConfirmationMessage(confirmationData);
    await this.safeSendText(client, message.from, confirmationMessage);

    // 2. Armazena os dados da transação para usar depois do "sim"
    this.pendingConfirmations.set(context.phoneNumber, {
      type: "transaction",
      data: {
        originalData: aiResponse.data,
        confirmationData: confirmationData,
        contaBancariaSelecionada: this.ContaBancariaSelecionada, // <-- adiciona isso
      },
      timestamp: Date.now(),
    });

    // Não faz return aqui, deixa o fluxo continuar para processar a resposta
  }

  // Adicione este método no MessageController para processar a resposta "sim"
  private async safeSendText(
    client: Whatsapp,
    to: string,
    text: string | null | undefined
  ) {
    if (text && text.trim() !== "") {
      try {
        await client.sendText(to, text);
      } catch (error) {
        console.error(`Erro ao enviar mensagem para ${to}:`, error);
      }
    } else {
      console.warn(`⚠️ Tentativa de envio de mensagem vazia para ${to}`);
    }
  }

  private setSelectedContaBancaria(contaBancaria: IContaBancario) {
    this.ContaBancariaSelecionada = contaBancaria;
  }

  private handleError(error: any, message: any, client: Whatsapp) {
    console.error("Erro ao processar mensagem:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : null,
      body: message?.body,
    });

    const fallbackError = this.messageView.errorResponse();
    this.safeSendText(client, message.from, fallbackError);
  }

  private async buildContext(message: any): Promise<MessageContext> {
    const phoneNumber = extractPhoneNumber(message.from);
    const user = await this.userModel.findByPhone(phoneNumber);
    const authService = new AuthService();
    const authData = await authService.login();
    const userName = authData.user.name || "Usuário";
    const validCategories = (authData.categories || []).map((cat: any) => ({
      id: cat.id || "",
      title: cat.title,
      type: cat.type,
      icon: cat.icon || "🎈",
    }));

    return { phoneNumber, user, userName, authData, validCategories };
  }
}

export default MessageController;
