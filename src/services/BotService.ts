import { create, Whatsapp } from 'venom-bot';
import MessageController from '../controllers/MessageController';

class BotService {
  private client!: Whatsapp;
  private messageController: MessageController;

  constructor() {
    this.messageController = new MessageController();
  }

  public async start() {
    try {
      this.client = await create({
        session: 'chatbot-planno',
        headless: 'new',
        browserArgs: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      this.setupListeners();
      console.log('Bot iniciado com sucesso! ✅');
    } catch (error) {
      console.error('Erro ao iniciar o Venom:', error);
      process.exit(1);
    }
  }

  private setupListeners() {
    this.client.onMessage((message) => {
      this.messageController.handleIncomingMessage(message, this.client);
    });
  }
}

export default BotService;