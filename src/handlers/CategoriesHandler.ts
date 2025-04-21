import { IMessageHandler, MessageContext } from '../interfaces/IMessageController';

export class CategoriesHandler implements IMessageHandler {
  private readonly categoryKeywords = [
    'ver minhas categorias',
    'quais são minhas categorias',
    'categorias',
    'quero ver minhas categorias'
  ];

  constructor(
    private messageView: any,
    private safeSendText: Function,
    private getCategoriesMessage: Function
  ) {}

  canHandle(message: string): boolean {
    return this.categoryKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  async handle(message: any, client: any, context: MessageContext) {
    const categoriesText = await this.getCategoriesMessage();
    await this.safeSendText(client, message.from, categoriesText);
  }
}