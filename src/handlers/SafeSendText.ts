import type { Whatsapp } from "venom-bot";

export class SafeSendText {
  async safeSendText(
     client: Whatsapp,
     to: string,
     text: string | null | undefined
   ) {
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