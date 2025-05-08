import { Whatsapp } from "venom-bot";
import DeepSeekService from "../services/DeepSeekService";
import type MessageView from "../views/MessageView";
import type { MessageContext } from "../interfaces/IMessageController";

export class CategoryHandler {
  constructor(private messageView: MessageView) {}

  async handle(message: any, client: Whatsapp, context: MessageContext): Promise<boolean> {
    console.log("🟡 Entrando em CategoryHandler");

    const response = await DeepSeekService.analyzeMessage(message.body);
    console.log("🔵 Resposta da IA:", response);

    if (response.type === "categories") {
      console.log("🟢 Identificado type === 'categories'");

      const categories = context.validCategories;

      if (!categories || categories.length === 0) {
        console.log("⚠️ Nenhuma categoria cadastrada");
        await client.sendText(message.from, "😕 Você ainda não tem categorias cadastradas.");
        return true;
      }

      const formatted = this.messageView.listAllCategories(categories);
      await client.sendText(message.from, formatted);
      return true;
    }

    console.log("🔴 Tipo não é 'categories'");
    return false;
  }
}
