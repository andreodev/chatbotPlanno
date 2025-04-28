import { Whatsapp } from 'venom-bot';
import type { Category } from '../models/Category';

export interface IMessageHandler {
  canHandle(message: string): boolean;
  handle(message: any, client: Whatsapp, context: MessageContext): Promise<void>;
}

export interface MessageContext {
  phoneNumber: string;
  user: any;
  userName: string;
  authData: any;
  validCategories: Category[];
  selectedBankAccount ?: any;
}