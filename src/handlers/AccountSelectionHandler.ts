import type { Message, Whatsapp } from "venom-bot";
import type { IContaBancario } from "../interfaces/IContaBancaria";

type AccountSelectionParams = {
  message: Message;
  client: Whatsapp;
  phoneNumber: string;
  contas: IContaBancario[];
  onSelect: (conta: IContaBancario) => Promise<void>;
};

export class AccountSelectionHandler {
  static formatAccountListMessage(contas: IContaBancario[]): string {
    const listaContasFormatada = contas
      .map((conta, index) => `${index + 1}. ${conta.name}`)
      .join('\n');

    return `💳 *Selecione uma Conta Bancária*\n\n${listaContasFormatada}\n\nResponda com o número da conta que deseja usar.`;
  }

  static async handle({
    message,
    client,
    contas,
    onSelect,
  }: AccountSelectionParams): Promise<IContaBancario | null> {
    const response = message.body.trim();
    const selectedIndex = parseInt(response);

    if (!isNaN(selectedIndex) && selectedIndex >= 1 && selectedIndex <= contas.length) {
      const contaSelecionada = contas[selectedIndex - 1];
      await onSelect(contaSelecionada);
      return contaSelecionada; // Retorna a conta selecionada
    } else {
      const listaContasFormatada = contas
        .map((conta, index) => `${index + 1}. ${conta.name}`)
        .join('\n');
      await client.sendText(
        message.from,
        `💳 *Selecione uma Conta Bancária*\n\n${listaContasFormatada}\n\nResponda com o número da conta que deseja usar.`
      );
      return null; // Retorna null se a seleção for inválida
    }
  }
}
