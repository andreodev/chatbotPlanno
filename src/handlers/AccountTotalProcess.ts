import type { Whatsapp } from "venom-bot";
import type { MessageContext } from "../interfaces/IMessageController";

export class AccountTotalProcess {
 async processAccountTotal(message: any, client: Whatsapp, context: MessageContext): Promise<boolean> {
   
     if (message.body?.toLowerCase() === "teste") {
       console.log("✅ caiu aqui");
       return true;
     }
   
     return false;
   }
 }