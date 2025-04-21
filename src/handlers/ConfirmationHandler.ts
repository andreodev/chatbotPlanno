// src/handlers/ConfirmationHandler.ts
import { Whatsapp } from "venom-bot";
import MessageView from "../views/MessageView";
import type { PendingConfirmation } from "../interfaces/IPendingConfirmation";
import type { MessageContext } from "../interfaces/IMessageController";

export class ConfirmationHandler {
  private pendingConfirmations: Map<string, PendingConfirmation>;
  private messageView: MessageView;

  constructor(pendingConfirmations: Map<string, PendingConfirmation>) {
    this.pendingConfirmations = pendingConfirmations;
    this.messageView = new MessageView();
  }

  async handle(
    phoneNumber: string,
    message: any,
    client: Whatsapp,
    context: MessageContext
  ): Promise<boolean> {
    const confirmation = this.pendingConfirmations.get(phoneNumber);
    if (!confirmation) return false;

    const response = message.body.toLowerCase().trim();
    const isConfirmed = response === "sim" || response === "s";

    if (isConfirmed) {
      switch (confirmation.type) {
        case "category":
          const newCategory = await this.createCategory(
            confirmation.data.category
          );
          await this.safeSendText(
            client,
            message.from,
            this.messageView.categoryCreatedMessage(newCategory.title)
          );
          break;

        case "transaction":
          await this.createTransaction(confirmation.data);
          await this.safeSendText(
            client,
            message.from,
            this.messageView.transactionCreatedMessage(confirmation.data)
          );
          break;
      }
    } else {
      await this.safeSendText(
        client,
        message.from,
        "Operação cancelada com sucesso."
      );
    }

    this.pendingConfirmations.delete(phoneNumber);
    return true;
  }

  private async createCategory(categoryName: string) {
    return {
      id: Date.now().toString(),
      title: categoryName,
      type: "expense",
      icon: "default-icon",
    };
  }

  private async createTransaction(data: any) {
    console.log("Transação criada:", data);
  }

  private async safeSendText(client: Whatsapp, to: string, text: string) {
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
}
