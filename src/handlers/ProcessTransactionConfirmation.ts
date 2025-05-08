import type { Whatsapp } from "venom-bot";
import type { MessageContext } from "../interfaces/IMessageController";
import selectedAccountStore  from "../global/selectAccountStore";
import type { PendingConfirmation } from "../interfaces/IPendingConfirmation";
import { SafeSendText } from "./SafeSendText";
import MessageView from "../views/MessageView";
import { SaveTransaction } from "./SaveTransaction";

export class ProcessTransactionConfirmation {
 constructor() {
  this.pendingConfirmations = new Map()
  this.messageView = new MessageView()
 }
 private pendingConfirmations: Map<string, PendingConfirmation>;
 private messageView: MessageView;
  async processTransactionConfirmation(
    message: any,
    client: Whatsapp,
    context: MessageContext
  ) {
    const safeSendText = new SafeSendText()
    const saveTransactionService = new SaveTransaction();
    const confirmation = this.pendingConfirmations.get(context.phoneNumber);
    if (!confirmation || confirmation.type !== "transaction") return false;



    const response = message.body.toLowerCase().trim();
    if (response === "sim" || response === "s") {
      const contaBancaria = selectedAccountStore.get(context.phoneNumber);

      // Verifica se todos os dados necessários estão presentes
      if (
        !confirmation.data.originalData?.value ||
        !confirmation.data.originalData?.category ||
        !confirmation.data.originalData?.type ||
        !contaBancaria
      ) {
        await safeSendText.safeSendText(
          client,
          message.from,
          "❌ Dados incompletos para confirmar a transação. Por favor, inicie novamente."
        );
        this.pendingConfirmations.delete(context.phoneNumber);
        return false;
      }

      const transactionData = {
        value: confirmation.data.originalData.value.toString(),
        category: confirmation.data.originalData.category,
        contaBancariaSelecionada: contaBancaria,
        type: confirmation.data.originalData.type,
        accountId: contaBancaria.idSync || null,
      };

      try {
        const finalConfirmation = this.messageView.transactionCreatedMessage(transactionData);
        await safeSendText.safeSendText(client, message.from, finalConfirmation);

        const success = await saveTransactionService.saveTransaction(transactionData)
        if (success) {
          await safeSendText.safeSendText(client, message.from, "✅ Transação concluída com sucesso!");
          this.pendingConfirmations.delete(context.phoneNumber);
          return true;
        } else {
          await safeSendText.safeSendText(client, message.from, "❌ Ocorreu um erro ao salvar a transação.");
        }

        return true;
      } catch (error) {
        console.error("Erro ao confirmar transação:", error);
        await safeSendText.safeSendText(client, message.from, "❌ Erro ao processar transação. Tente novamente.");
        return false;
      } finally {
        this.pendingConfirmations.delete(context.phoneNumber);
      }
    } else {
      await safeSendText.safeSendText(client, message.from, "❌ Operação cancelada.");
      this.pendingConfirmations.delete(context.phoneNumber);
      return false;
    }
  }
}
