import { create, Whatsapp } from 'venom-bot';
import MessageController from './controllers/MessageController';
import AuthService from './services/auth/AuthService';

// function extractPhoneNumber(fullPhone: string): string {
//   const match = fullPhone.match(/^(\d+)@c\.us$/);
//   return match ? match[1] : fullPhone;
// }

async function startBot() {
  try {
    const client = await create({
      session: 'chatbot-planno',
      headless: "new",
      browserArgs: [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    try {
      const authService = new AuthService();
      console.log('⏳ Iniciando autenticação...');
      
      const authData = await authService.login();
      
      console.log(authData.user)
      
    } catch (error) {
      console.error('❌ Falha na autenticação inicial');
      process.exit(1);
    }

    const messageController = new MessageController();
    start(client, messageController);
  } catch (error) {
    console.error('Error starting Venom:', error);
    process.exit(1);
  }
}

function start(client: Whatsapp, messageController: MessageController) {
  console.log('Bot started successfully! ✅');

  client.onMessage(async (message) => {
    try {
      if (!message.body) {
        return console.warn('Empty message received', message);
      }
      
      console.log('Processing message:', {
        from: message.from,
        body: message.body.substring(0, 100) 
      });
  
      await messageController.handleIncomingMessage(message, client);
    } catch (error) {
      if (error instanceof Error) {
        console.error('Critical error:', {
          error: error.message,
          stack: error.stack
        });
      } else {
        console.error('Critical error:', { error });
      }
    }
  });
}

startBot();