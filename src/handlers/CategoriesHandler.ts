// src/handlers/CategoryHandler.ts
import type { IMessageHandler, MessageContext } from "../interfaces/IMessageController";
import AppContext from "../context/AppContext";
import type { Category } from "../models/Category";

export class CategoriyHandler implements IMessageHandler {
  private readonly categoryKeywords = [
    'ver minhas categorias',
    'quais são minhas categorias',
    'categorias',
    'quero ver minhas categorias'
  ];

  constructor(
    private messageView: any,
    private safeSendText: Function
  ) {}

  canHandle(message: string): boolean {
    return this.categoryKeywords.some(keyword =>
      message.toLowerCase().includes(keyword)
    );
  }

  async handle(message: any, client: any, context: MessageContext) {
    try {
      const formattedCategories = await AppContext.getCategories();
      const categoriesText = this.formatCategoriesMessage(formattedCategories);

      await this.safeSendText(client, message.from, categoriesText);
    } catch (error) {
      console.error("❌ Erro ao buscar categorias:", error);
      await this.safeSendText(client, message.from, "Erro ao buscar categorias.");
    }
  }

  private formatCategoriesMessage(formattedCategories: Record<'income' | 'expense', Category[]>): string {
    let categoriesText = 'Suas categorias:\n\n';

    for (const [type, categories] of Object.entries(formattedCategories)) {
      categoriesText += `*${type.charAt(0).toUpperCase() + type.slice(1)}*\n`;
      categories.forEach((category) => {
        categoriesText += `- ${category.title}\n`;
      });
      categoriesText += '\n';
    }

    return categoriesText;
  }
}
