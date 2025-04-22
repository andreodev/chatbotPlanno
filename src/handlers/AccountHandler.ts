import { Whatsapp } from "venom-bot";
import { AccountSelectionHandler } from "./AccountSelectionHandler";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import AuthService from "../services/auth/AuthService";

export class AccountHandler {
  static async selectBankAccount(
    phoneNumber: string,
    message: any,
    client: Whatsapp,
    contaSelecionada: IContaBancario | null,
    setContaSelecionada: (conta: IContaBancario | null) => void
  ): Promise<IContaBancario | null> {
    try {
      const authService = new AuthService();
      const responseAccount = await authService.SearchAccounts();
      const contasEncontradas: IContaBancario[] = responseAccount?.data || [];

      if (contasEncontradas.length > 1 && !contaSelecionada) {
        await client.sendText(
          message.from,
          "Você tem múltiplas contas bancárias vinculadas. Por favor, selecione uma para continuar."
        );

        const selected = await AccountSelectionHandler.handle({
          message,
          client,
          phoneNumber,
          contas: contasEncontradas,
          onSelect: async (conta: IContaBancario) => {
            setContaSelecionada(conta); // Atualiza a variável com a conta selecionada
            await client.sendText(
              message.from,
              `✅ Conta selecionada: *${conta.name}*`
            );
          },
        });

        if (selected && typeof selected !== "boolean") {
          setContaSelecionada(selected); // Atualiza o estado com a conta escolhida
          return selected;
        }

        return null;
      } else if (contasEncontradas.length === 1) {
        setContaSelecionada(contasEncontradas[0]); // Apenas uma conta, seleciona automaticamente
        await client.sendText(
          message.from,
          `✅ Conta selecionada: *${contasEncontradas[0].name}*`
        );
        return contaSelecionada || contasEncontradas[0] || null;
      } 
        return null;
    } catch (error) {
      console.error("Erro ao selecionar conta bancária:", error);
      await client.sendText(
        message.from,
        "⚠️ Ocorreu um erro ao tentar acessar suas contas bancárias. Tente novamente mais tarde."
      );
      return null;
    }
  }
}
