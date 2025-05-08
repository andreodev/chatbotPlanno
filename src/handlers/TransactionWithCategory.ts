import selectAccountStore from "../global/selectAccountStore";
import type { MessageContext } from "../interfaces/IMessageController";
import type { PendingConfirmation } from "../interfaces/IPendingConfirmation";
import type { Category } from "../models/Category";
import MessageView from "../views/MessageView";
import { SafeSendText } from "./SafeSendText";

export class TransactionWithCategory {
  private pendingConfirmations: Map<string, PendingConfirmation>;
  private messageView: MessageView;

  constructor() {
    this.messageView = new MessageView();
    this.pendingConfirmations = new Map();
  }

  async handleTransactionWithCategory(
    message: any,
    client: any,
    context: MessageContext,
    aiResponse: any
  ) {
    const safeSendText = new SafeSendText();

    // Encontra a melhor correspondência para a categoria
    const bestMatch = await this.findBestCategoryMatch(
      aiResponse.data.category,
      context.validCategories
    );

    // Se não encontrar correspondência, sugira uma categoria
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
      return safeSendText.safeSendText(client, message.from, response);
    }

    // Define a categoria correta
    aiResponse.data.category = bestMatch.title;

    if (!aiResponse.data.type) {
      aiResponse.data.type = "expense"; // Ajuste para um valor padrão de tipo
    }

    // Obtém a conta bancária selecionada globalmente
    const contaBancariaSelecionada = selectAccountStore.get(context.phoneNumber);
    console.log("Conta encontrada no store para", context.phoneNumber, contaBancariaSelecionada);

    if (!contaBancariaSelecionada) {
      return "❌ Não há conta bancária selecionada. Por favor, selecione uma conta antes de continuar.";
    }

    // Prepara os dados para a confirmação
    const confirmationData = {
      ...aiResponse.data,
      contaBancariaSelecionada,
      userName: context.userName,
      body: message.body,
    };

    // Envia a mensagem de confirmação inicial
    const confirmationMessage = this.messageView.transactionConfirmationMessage(confirmationData);
    await safeSendText.safeSendText(client, message.from, confirmationMessage);

    // Armazena os dados da transação para confirmação posterior
    this.pendingConfirmations.set(context.phoneNumber, {
      type: "transaction",
      data: {
        originalData: aiResponse.data,
        confirmationData,
        contaBancariaSelecionada,
      },
      timestamp: Date.now(),
    });

    // Não faz return aqui, deixa o fluxo continuar para processar a resposta
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
}
