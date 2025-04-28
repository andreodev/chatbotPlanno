import { Whatsapp } from "venom-bot";
import { AccountSelectionHandler } from "./AccountSelectionHandler";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import AuthService from "../services/auth/AuthService";

export class AccountHandler {
  static async selectBankAccount(
    phoneNumber: string,
    message: any,
    client: Whatsapp,
    contaSelecionadaEscolhida: IContaBancario | null,
    setContaSelecionada: (conta: IContaBancario | null) => void
  ): Promise<IContaBancario | null> {
    
    try {
      const authService = new AuthService();
      const responseAccount = await authService.SearchAccounts();
      const contasEncontradas: IContaBancario[] = responseAccount?.data || [];

      // Verifique se existem contas
      if (contasEncontradas.length === 0) {
        await client.sendText(
          message.from,
          "⚠️ Não foram encontradas contas bancárias vinculadas à sua conta."
        );
        return null;
      }

      // Se o usuário tem múltiplas contas e nenhuma conta foi selecionada
      if (contasEncontradas.length > 1 && !contaSelecionadaEscolhida) {
        await client.sendText(
          message.from,
          "Você tem múltiplas contas bancárias vinculadas. Por favor, selecione uma para continuar."
        );

        // Chama o handler de seleção de conta
        const contaSelecionada = await AccountSelectionHandler.handle({
          message,
          client,
          phoneNumber,
          contas: contasEncontradas,
          onSelect: async (conta: IContaBancario) => {
            console.log("Conta selecionada:", conta); // Log para verificar se a conta está sendo selecionada
            setContaSelecionada(conta); // Atualiza a conta selecionada
            await client.sendText(
              message.from,
              `✅ Conta selecionada: *${conta.name}*`
            );
          },
        });

        console.log("Conta selecionada no handle:", contaSelecionada); // Verifique o retorno da função

        // Verifica se uma conta foi selecionada
        if (contaSelecionada) {
          return contaSelecionada;
        }

        return null; // Retorna null se nenhuma conta for selecionada
      } else if (contasEncontradas.length === 1) {
        // Caso o usuário tenha apenas uma conta
        const contaUnica = contasEncontradas[0];
        setContaSelecionada(contaUnica); // Atualiza a conta
        await client.sendText(
          message.from,
          `✅ Você só possui uma conta: *${contaUnica.name}*`
        );
        return contaUnica; // Retorna a conta única selecionada
      }

      // Caso não haja contas encontradas ou algum erro
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

  static async getBankAccounts(): Promise<IContaBancario[]> {
    try {
      const authService = new AuthService();
      const responseAccount = await authService.SearchAccounts();

      // Verificação adicional para garantir que temos uma resposta válida
      if (!responseAccount || !responseAccount.data) {
        throw new Error("Resposta inválida ao buscar contas.");
      }

      const contasEncontradas: IContaBancario[] = responseAccount.data || [];
      return contasEncontradas;
    } catch (error) {
      console.error("Erro ao buscar contas bancárias:", error);
      return []; // Retorna um array vazio caso ocorra algum erro
    }
  }
}
