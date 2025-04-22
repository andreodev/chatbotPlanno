import type { Whatsapp } from "venom-bot";

export class ErrorHandler {
  static async handle(error: any, message: any, client: Whatsapp, fallback: string) {
    console.error("Erro:", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : null,
      body: message?.body,
    });

    await client.sendText(message.from, fallback);
  }
}
