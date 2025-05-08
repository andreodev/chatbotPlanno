import type { Whatsapp } from "venom-bot";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import { SafeSendText } from "./SafeSendText";
import { AccountHandler } from "./AccountHandler";
import  selectedAccountStore  from "../global/selectAccountStore";

export class PromptSelectionAccount {
  private isPromptMessageSent: boolean = false;

  async promptUserToSelectAccount(
     phoneNumber: string,
     message: any,
     client: Whatsapp
   ): Promise<IContaBancario | null> {
    const safeSendText = new SafeSendText();

     return new Promise((resolve) => {
       const timeout = setTimeout(() => {
         console.log("⏳ Tempo de resposta expirado.");
         resolve(null); // Quando der timeout, retorna NULL
       }, 30000); // 30 segundos
   
       // Verifica se a mensagem já foi enviada
       if (!this.isPromptMessageSent) {
         const promptMessage = "Por favor, selecione a conta bancária.";
         safeSendText.safeSendText(client, message.from, promptMessage);
         this.isPromptMessageSent = true;
       }

       AccountHandler.selectBankAccount(
         phoneNumber,
         message,
         client,
         null,
         (contaSelecionada: IContaBancario | null) => {
           clearTimeout(timeout);
           this.isPromptMessageSent = false;

           if (contaSelecionada) {
             selectedAccountStore.set(phoneNumber, contaSelecionada); // ✅ Salva no store global
             resolve(contaSelecionada);
           } else {
             resolve(null);
           }
         }
       ).catch((error: any) => {
         console.log("Erro ao selecionar conta:", error);
         clearTimeout(timeout);
         this.isPromptMessageSent = false;
         resolve(null);
       });
     });
   }
}
