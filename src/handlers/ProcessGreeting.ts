import type { Whatsapp } from "venom-bot";
import type { MessageContext } from "../interfaces/IMessageController";
import { GreetingHandler } from "./GreetingHandler";
import { SafeSendText } from "./SafeSendText";
import type MessageView from "../views/MessageView";



export class ProcessGreeting {
 constructor(private messageView: MessageView) {}
  async processGreeting(
     message: any,
     client: Whatsapp,
     context: MessageContext
   ) {
    const safeSendText = new SafeSendText()
     if (GreetingHandler.isGreeting(message.body)) {
       const greetingResponse = await this.messageView.getGreetingMessage(
         context.userName
       );
       await safeSendText.safeSendText(client, message.from, greetingResponse);
       return true;
     }
     return false;
   }
}