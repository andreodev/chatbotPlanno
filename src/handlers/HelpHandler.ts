import { IMessageHandler, MessageContext } from '../interfaces/IMessageController';

export class HelpHandler implements IMessageHandler {
  private readonly helpKeywords = ['ajuda', 'help', 'comandos', 'opções'];

  canHandle(message: string): boolean {
    return this.helpKeywords.includes(message.toLowerCase().trim());
  }

  async handle(message: any, client: any, context: MessageContext) {
    const helpText = `📋 *Menu de Ajuda*\n\n` +
      `• *Categorias* - Ver suas categorias\n` +
      `• *Extrato* - Consultar seu extrato\n` +
      `• *Ajuda* - Mostra esta mensagem`;
    
    await client.sendText(message.from, helpText);
  }
}