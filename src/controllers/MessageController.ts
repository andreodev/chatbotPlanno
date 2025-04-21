// src/controllers/MessageController.ts
import { extractPhoneNumber } from "../utils/phonneUtils";
import User from "../models/User";
import MessageView from "../views/MessageView";
import deepseekService from "../services/DeepSeekService";
import { Whatsapp } from "venom-bot";
import AuthService from "../services/auth/AuthService";
import { Category } from "../models/Category";
import { ConfirmationHandler } from "../handlers/ConfirmationHandler";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import { AccountSelectionHandler } from "../handlers/AccountSelectionHandler";

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
  private ContaBancariaSelecionada: IContaBancario | null = null
  private ListaContaBancaria: IContaBancario[] | null = null
  private messageView: MessageView;
  private greetings = [
    "oi",
    "olá",
    "ola",
    "eae",
    "e aí",
    "hello",
    "hi",
    "bom dia",
    "boa tarde",
    "boa noite",
  ];
  private pendingConfirmations: Map<string, PendingConfirmation>;

  constructor() {
    this.userModel = new User();
    this.messageView = new MessageView();
    this.pendingConfirmations = new Map();
  }

  private isGreeting(message: string): boolean {
    if (!message) return false;
    return this.greetings.includes(message.toLowerCase().trim());
  }

  private async handleConfirmation(
    phoneNumber: string,
    message: any,
    client: Whatsapp,
    context: MessageContext
  ) {
    const confirmation = this.pendingConfirmations.get(phoneNumber);
    if (!confirmation) return false;

    const response = message.body.toLowerCase().trim();
    const isConfirmed = response === "sim" || response === "s";


    if (isConfirmed) {
      switch (confirmation.type) {
        case "category":
          // Aqui você implementaria a criação da categoria no seu banco
          const newCategory = await this.createCategory(
            confirmation.data.category
          );
          await this.safeSendText(
            client,
            message.from,
            this.messageView.categoryCreatedMessage(newCategory.title)
          );
          break;

        case "transaction":
          // Aqui você implementaria a criação da transação
          await this.createTransaction(confirmation.data);
          await this.safeSendText(
            client,
            message.from,
            this.messageView.transactionCreatedMessage(confirmation.data)
          );
          break;
      }
    } else {
      await this.safeSendText(
        client,
        message.from,
        "Operação cancelada com sucesso."
      );
    }

    this.pendingConfirmations.delete(phoneNumber);
    return true;
  }

  private async createCategory(categoryName: string): Promise<Category> {
    // Implemente a criação real da categoria no seu banco de dados
    return { id: Date.now().toString(), title: categoryName, type: "expense", icon: "default-icon" };
  }

  private async createTransaction(data: any) {
    // Implemente a criação da transação no seu banco
    console.log("Transação criada:", data);
  }

  public async handleIncomingMessage(message: any, client: Whatsapp) {
    try {
      const phoneNumber = extractPhoneNumber(message.from);
      const user = await this.userModel.findByPhone(phoneNumber);
      const authService = new AuthService();
      const authData = await authService.login();
      const userName = authData.user.name || "Usuário";
  
      // ✅ Verifica saudação antes de qualquer outra coisa
      if (this.isGreeting(message.body)) {
        const greetingResponse = await this.messageView.getGreetingMessage(userName);
        return this.safeSendText(client, message.from, greetingResponse);
      }
  
     
  
      const validCategories = (authData.categories || []).map((cat: any) => ({
        id: cat.id || "",
        title: cat.title,
        type: cat.type,
        icon: cat.icon || "🎈",
      }));
  
      const context: MessageContext = {
        phoneNumber,
        user,
        userName,
        authData,
        validCategories,
      };

      const responseAccount = await authService.SearchAccounts();
  
      const contasEncontradas = responseAccount?.data || [];

if (contasEncontradas.length > 1) {
  this.ListaContaBancaria = contasEncontradas;

  if (!this.ContaBancariaSelecionada) {
    const selected = await AccountSelectionHandler.handle({
      message,
      client,
      phoneNumber,
      contas: this.ListaContaBancaria,
      onSelect: async (contaSelecionada) => {
        this.ContaBancariaSelecionada = contaSelecionada;
        this.ListaContaBancaria = null;

        await client.sendText(
          message.from,
          `✅ Conta selecionada: *${contaSelecionada.name}*`
        );
      },
    });

    if (selected) return;
  }
} else if (contasEncontradas.length === 1) {
  this.ListaContaBancaria = null;
  this.ContaBancariaSelecionada = contasEncontradas[0];
} else {
  await client.sendText(
    message.from,
    "⚠️ Nenhuma conta bancária foi encontrada vinculada ao seu usuário."
  );
  return;
}
  
      const confirmationHandler = new ConfirmationHandler(this.pendingConfirmations);
  
      if (await confirmationHandler.handle(phoneNumber, message, client, context)) {
        return;
      }
  
      if (message.isFirstMsg || !context.user) {
        const welcome = await this.messageView.getWelcomeMessage(context.userName);
        return this.safeSendText(client, message.from, welcome);
      }
  
      return this.handleWithDeepSeek(message, client, context);
    } catch (error) {
      this.handleError(error, message, client);
    }
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

  private async handleWithDeepSeek(message: any, client: any, context: MessageContext) {
    if (!message.body || typeof message.body !== "string") {
        const text = this.messageView.invalidMessageResponse();
        return this.safeSendText(client, message.from, text);
    }

    const messageBody = message.body.toLowerCase().trim();
    
    // 1. Verificação para LISTAGEM de categorias (prioridade máxima)
    if (this.isCategoryListRequest(messageBody)) {
        const categoriesMessage = this.messageView.listAllCategories(context.validCategories);
        return this.safeSendText(client, message.from, categoriesMessage);
    }

    // 2. Verificação para ADIÇÃO de novas categorias
    if (this.isAddCategoryRequest(messageBody)) {
        const helpMessage = this.messageView.getCategoryHelpMessage(context.validCategories);
        return this.safeSendText(client, message.from, helpMessage);
    }

    // 3. Processamento normal com DeepSeek
    const aiResponse = await deepseekService.generateFormattedResponse(message.body);

    if (aiResponse.data?.category) {
        return this.handleTransactionWithCategory(message, client, context, aiResponse);
    }

    return this.safeSendText(
        client,
        message.from,
        aiResponse.content || "🤖 Resposta padrão"
    );
}

// Métodos auxiliares novos:
private isCategoryListRequest(messageBody: string): boolean {
    const listKeywords = [
        'categorias existentes',
        'listar categorias',
        'quais categorias',
        'me diga as categorias',
        'categorias válidas',
        'lista de categorias',
        'e quais existem',
        'traga minhas categorias',
        'me mostre minhas categorias'
    ];
    return listKeywords.some(keyword => messageBody.includes(keyword));
}

private isAddCategoryRequest(messageBody: string): boolean {
    const addKeywords = [
        'adicionar categorias',
        'nova categoria',
        'como faço pra adicionar',
        'criar categoria',
        'adicionar nova categoria',
        
    ];
    return addKeywords.some(keyword => messageBody.includes(keyword));
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
        const isVehicleRelated = /(gasolina|posto|combustível|abastecer|carro|moto)/i.test(
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

    this.pendingConfirmations.set(context.phoneNumber, {
        type: "transaction",
        data: aiResponse.data,
        timestamp: Date.now(),
    });

    const confirmationMessage = this.messageView.transactionConfirmationMessage({
        ...aiResponse.data,
        contaBancariaSelecionada: this.ContaBancariaSelecionada,
        listaContasBancarias: this.ListaContaBancaria,
        setSelectedContaBancaria: this.setSelectedContaBancaria,
        userName: context.userName,
        body: message.body
    });
    return this.safeSendText(client, message.from, confirmationMessage);
}
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
    this.ContaBancariaSelecionada = contaBancaria
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
}

export default MessageController;
