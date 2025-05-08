import type { Whatsapp } from "venom-bot";
import { SafeSendText } from "./SafeSendText";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import selectedAccountStore  from "../global/selectAccountStore";

export class AutoSelectAccount {
  private isAutoMessageSent: boolean = false;

  async autoSelectAccount(
    conta: IContaBancario,
    message: any,
    client: Whatsapp
  ): Promise<boolean> {
    const safeSendText = new SafeSendText();

    // Salva a conta selecionada no store global
    selectedAccountStore.set(message.sender.id, conta);

    if (!this.isAutoMessageSent) {
      await safeSendText.safeSendText(
        client,
        message.from,
        `✅ Conta ${conta.name} selecionada automaticamente.`
      );
      this.isAutoMessageSent = true;
    }

    return true;
  }
}
