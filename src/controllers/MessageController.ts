// src/controllers/MessageController.ts
import { extractPhoneNumber } from "../utils/phonneUtils";
import User from "../models/User";
import MessageView from "../views/MessageView";
import deepseekService from "../services/DeepSeekService";
import { Whatsapp } from "venom-bot";
import AuthService from "../services/auth/AuthService";
import { Category } from "../models/Category";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import { GreetingHandler } from "../handlers/GreetingHandler";
import { AccountHandler } from "../handlers/AccountHandler";

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

  public async handleIncomingMessage(message: any, client: Whatsapp) {
    try {
        const context = await this.buildContext(message);

        if (await this.processGreeting(message, client, context)) return;
        if (await this.processAccountSelection(message, client, context)) return;
        if (await this.processTransactionConfirmation(message, client, context)) return; // Nova linha
        await this.handleWithDeepSeek(message, client, context);
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

    console.log("AI RESPONSE DATA", aiResponse);
    if (aiResponse.data?.category) {
      return this.handleTransactionWithCategory(
        message,
        client,
        context,
        aiResponse
      );
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
      "categorias existentes",
      "listar categorias",
      "quais categorias",
      "me diga as categorias",
      "categorias válidas",
      "lista de categorias",
      "e quais existem",
      "traga minhas categorias",
      "me mostre minhas categorias",
    ];
    return listKeywords.some((keyword) => messageBody.includes(keyword));
  }

  private isAddCategoryRequest(messageBody: string): boolean {
    const addKeywords = [
      "adicionar categorias",
      "nova categoria",
      "como faço pra adicionar",
      "criar categoria",
      "adicionar nova categoria",
    ];
    return addKeywords.some((keyword) => messageBody.includes(keyword));
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
    const confirmationMessage = this.messageView.transactionConfirmationMessage(confirmationData);
    await this.safeSendText(client, message.from, confirmationMessage);

    // 2. Armazena os dados da transação para usar depois do "sim"
    this.pendingConfirmations.set(context.phoneNumber, {
      type: "transaction",
      data: {
          originalData: aiResponse.data,
          confirmationData: confirmationData,
          contaBancariaSelecionada: this.ContaBancariaSelecionada // <-- adiciona isso
      },
      timestamp: Date.now(),
  });

    // Não faz return aqui, deixa o fluxo continuar para processar a resposta
}

// Adicione este método no MessageController para processar a resposta "sim"


private async processTransactionConfirmation(
  message: any,
  client: Whatsapp,
  context: MessageContext
) {
  const confirmation = this.pendingConfirmations.get(context.phoneNumber);
  if (!confirmation || confirmation.type !== "transaction") return false;

  const response = message.body.toLowerCase().trim();
  if (response === "sim" || response === "s") {
    // Verifica se todos os dados necessários estão presentes
    if (!confirmation.data.originalData?.value || 
        !confirmation.data.originalData?.category ||
        !this.ContaBancariaSelecionada ||
        !confirmation.data.originalData?.type) {

        await this.safeSendText(
            client, 
            message.from, 
            "❌ Dados incompletos para confirmar a transação. Por favor, inicie novamente."
        );
        this.pendingConfirmations.delete(context.phoneNumber);
        return false;
    }

    // Prepara os dados garantindo que todos os campos existam
    const transactionData = {
        value: confirmation.data.originalData.value.toString(),
        category: confirmation.data.originalData.category,
        contaBancariaSelecionada: this.ContaBancariaSelecionada,
        type: confirmation.data.originalData.type,
        accountId: this.ContaBancariaSelecionada.idSync || null
    };

    console.log(transactionData);

    try {
        // Mostra a confirmação final
        const finalConfirmation = this.messageView.transactionCreatedMessage(transactionData);
        await this.safeSendText(client, message.from, finalConfirmation);

        // Salva a transação
        const success = await this.saveTransaction(transactionData);
        if (success) {
            await this.safeSendText(client, message.from, "✅ Transação concluída com sucesso!");
        } else {
            await this.safeSendText(client, message.from, "❌ Ocorreu um erro ao salvar a transação.");
        }

        return true;
    } catch (error) {
        console.error("Erro ao confirmar transação:", error);
        await this.safeSendText(
            client, 
            message.from, 
            "❌ Erro ao processar transação. Tente novamente."
        );
        return false;
    } finally {
        this.pendingConfirmations.delete(context.phoneNumber);
    }
  } else {
    await this.safeSendText(client, message.from, "❌ Operação cancelada.");
    this.pendingConfirmations.delete(context.phoneNumber);
    return false;
  }
}


private async saveTransaction(transactionData: {
  value: string;
  category: string;
  contaBancariaSelecionada: IContaBancario;
  type: string;
  accountId: string | null;
}) {
  try {
      // Salve os dados da transação no seu banco de dados ou onde for necessário
      console.log("Salvando transação:", transactionData);

      // Atualizar o saldo da conta bancária
      if (transactionData.type === "income") {
          this.ContaBancariaSelecionada.balance += parseFloat(transactionData.value);
      } else if (transactionData.type === "expense") {
          this.ContaBancariaSelecionada.balance -= parseFloat(transactionData.value);
      }

      // Aqui você pode chamar a função para salvar no seu banco de dados (Exemplo fictício)
      // await this.transactionRepository.save(transactionData);
      // await this.accountRepository.updateBalance(this.contaBancariaSelecionada);

      // Retorna sucesso, ou alguma outra resposta
      return true;
  } catch (error) {
      console.error("Erro ao salvar transação:", error);
      return false;
  }
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

  private async processGreeting(
    message: any,
    client: Whatsapp,
    context: MessageContext
  ) {
    if (GreetingHandler.isGreeting(message.body)) {
      const greetingResponse = await this.messageView.getGreetingMessage(
        context.userName
      );
      await this.safeSendText(client, message.from, greetingResponse);
      return true;
    }
    return false;
  }

  private async processAccountSelection(
    message: any,
    client: Whatsapp,
    context: MessageContext
  ): Promise<boolean> {
    const contas = await AccountHandler.getBankAccounts();
    console.log("CONTAAS", contas[0]);

    if (contas.length === 1) {
      return await this.autoSelectAccount(contas[0], message, client);
    }

    return this.promptUserToSelectAccount(context.phoneNumber, message, client);
  }

  private async autoSelectAccount(
    conta: any,
    message: any,
    client: Whatsapp
  ): Promise<boolean> {
    this.ContaBancariaSelecionada = conta;
    await this.safeSendText(
      client,
      message.from,
      `✅ Conta ${conta.nome} selecionada automaticamente.`
    );
    return true;
  }

  private async promptUserToSelectAccount(
    phoneNumber: string,
    message: any,
    client: Whatsapp
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log("Tem  po de resposta expirado.");
        resolve(false); // Fallback se o usuário não selecionar a conta a tempo
      }, 3000); // 3 segundos de timeout

      AccountHandler.selectBankAccount(
        phoneNumber,
        message,
        client,
        this.ContaBancariaSelecionada,
        (contaSelecionada) => {
          clearTimeout(timeout); // Limpa o timeout quando a conta for selecionada
          console.log("Conta Selecionadaaaaaa: ", contaSelecionada); // Log de depuração
          if (contaSelecionada) {
            this.ContaBancariaSelecionada = contaSelecionada;
            resolve(true);
          } else {
            resolve(false);
          }
        }
      ).catch((error) => {
        console.log("Erro ao selecionar a conta: ", error);
        clearTimeout(timeout); // Limpa o timeout caso haja erro
        resolve(false);
      });
    });
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
