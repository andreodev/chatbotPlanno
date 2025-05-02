// src/handlers/DeepSeekHandler.ts
import deepseekService from "../services/DeepSeekService";
import MessageView from "../views/MessageView";
import { Category } from "../models/Category";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import type { Whatsapp } from "venom-bot";

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
  suggestedCategory?: string;
}

interface Props {
  message: any;
  client: Whatsapp;
  context: MessageContext;
  contaSelecionada: IContaBancario | null;
  listaContas: IContaBancario[] | null;
  setSelectedConta: (conta: IContaBancario) => void;
  pendingConfirmations: Map<string, PendingConfirmation>;
}

export class DeepSeekHandler {
  private view = new MessageView();

  public async handle({
    message,
    client,
    context,
    contaSelecionada,
    listaContas,
    setSelectedConta,
    pendingConfirmations
  }: Props) {
    const messageBody = message.body?.toLowerCase().trim();

    if (!messageBody) {
      const text = this.view.invalidMessageResponse();
      return client.sendText(message.from, text);
    }

    if (this.isCategoryListRequest(messageBody)) {
      const text = this.view.listAllCategories(context.validCategories);
      return client.sendText(message.from, text);
    }


    const aiResponse = await deepseekService.generateFormattedResponse(message.body);

    if (aiResponse.data?.category) {
      return this.handleTransactionWithCategory({
        message,
        client,
        context,
        aiResponse,
        contaSelecionada,
        listaContas,
        setSelectedConta,
        pendingConfirmations,
      });
    }

    return client.sendText(message.from, aiResponse.content || "🤖 Resposta padrão");
  }

  private isCategoryListRequest(text: string) {
    return [
      "categorias existentes",
      "listar categorias",
      "quais categorias",
      "me diga as categorias",
      "categorias válidas",
      "lista de categorias",
      "e quais existem",
      "traga minhas categorias",
      "me mostre minhas categorias",
    ].some((k) => text.includes(k));
  }

  private isAddCategoryRequest(text: string) {
    return [
      "adicionar categorias",
      "nova categoria",
      "como faço pra adicionar",
      "criar categoria",
      "adicionar nova categoria",
    ].some((k) => text.includes(k));
  }

  private async handleTransactionWithCategory({
    message,
    client,
    context,
    aiResponse,
    contaSelecionada,
    listaContas,
    setSelectedConta,
    pendingConfirmations
  }: {
    message: any;
    client: Whatsapp;
    context: MessageContext;
    aiResponse: any;
    contaSelecionada: IContaBancario | null;
    listaContas: IContaBancario[] | null;
    setSelectedConta: (conta: IContaBancario) => void;
    pendingConfirmations: Map<string, PendingConfirmation>;
  }) {
    // Aqui você vai usar findBestCategoryMatch()
    const bestCategory = await this.findBestCategoryMatch(
      aiResponse.data.category,
      context.validCategories
    );

    if (bestCategory) {
      // Lógica de confirmação de transação com categoria sugerida
      const text = `💡 Encontrei a categoria mais parecida: *${bestCategory.title}*. Deseja usá-la? (sim/não)`;
      // Você pode salvar no pendingConfirmations para seguir depois
      pendingConfirmations.set(context.phoneNumber, {
        type: "transaction",
        data: aiResponse.data,
        timestamp: Date.now(),
        suggestedCategory: bestCategory.title,
      });
      return client.sendText(message.from, text);
    }

    return client.sendText(message.from, "⚠️ Não consegui encontrar uma categoria parecida.");
  }

  private async findBestCategoryMatch(
    categoryName: string,
    categories: Category[]
  ): Promise<Category | null> {
    const lowerInput = categoryName.toLowerCase();

    const exactMatch = categories.find(
      (c) => c.title.toLowerCase() === lowerInput
    );
    if (exactMatch) return exactMatch;

    const partialMatch = categories.find(
      (c) =>
        c.title.toLowerCase().includes(lowerInput) ||
        lowerInput.includes(c.title.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    const subcategoryMap: Record<string, string> = {
      uber: "Transporte",
      taxi: "Transporte",
      "99": "Transporte",
      ifood: "Alimentação",
      gasolina: "Transporte",
      posto: "Transporte",
      combustível: "Transporte",
      abastecimento: "Transporte",
    };

    for (const [keyword, mappedCategory] of Object.entries(subcategoryMap)) {
      if (lowerInput.includes(keyword)) {
        return categories.find((c) => c.title === mappedCategory) || null;
      }
    }

    return null;
  }
}
