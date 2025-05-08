import type { Whatsapp } from "venom-bot";
import type { MessageContext } from "../interfaces/IMessageController";
import { AccountHandler } from "./AccountHandler";
import { AutoSelectAccount } from "./autoSelectAccount";
import { PromptSelectionAccount } from "./PromptUserSelectAccount";
import  selectedAccountStore  from "../global/selectAccountStore";

export class ProcessAccountSelection {
  async processAccountSelection(
    message: any,
    client: Whatsapp,
    context: MessageContext
  ): Promise<boolean> {
    const autoSelectAccount = new AutoSelectAccount();
    const prompUserSelectAccount = new PromptSelectionAccount();


    // ✅ 1. Já tem conta selecionada? Não faz mais nada
    if (selectedAccountStore.get(context.phoneNumber)) {
      console.log("✅ Conta já selecionada, pulando seleção.");
      return false;
    }

    // ✅ 2. Se só há uma conta, seleciona automaticamente
    const contas = await AccountHandler.getBankAccounts();
    console.log("Contas disponíveis:", contas);

    if (contas.length === 1) {
      await autoSelectAccount.autoSelectAccount(contas[0], message, client);
      return false; // Continua o fluxo
    }

    // ✅ 3. Senão, pede para o usuário selecionar
    const contaSelecionada = await prompUserSelectAccount.promptUserToSelectAccount(
      context.phoneNumber,
      message,
      client
    );

    return !!contaSelecionada; // true se escolheu, false se timeout ou erro
  }
}
