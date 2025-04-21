import { IMessageHandler, MessageContext } from '../interfaces/IMessageController';

export class GreetingHandler implements IMessageHandler {
  private readonly greetingKeywords = ['oi', 'olá', 'ola', 'eae', 'iai', 'hello', 'hi'];

  canHandle(message: string): boolean {
    return this.greetingKeywords.includes(message.toLowerCase().trim());
  }

  async handle(message: any, client: any, context: MessageContext) {
    const welcome = await this.messageView.getWelcomeMessage(context.userName);
    await this.safeSendText(client, message.from, welcome);
  }

  constructor(private messageView: any, private safeSendText: Function) {}
}