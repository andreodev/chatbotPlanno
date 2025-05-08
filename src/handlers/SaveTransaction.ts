import type { IContaBancario } from "../interfaces/IContaBancaria";

export class SaveTransaction {
 async saveTransaction(transactionData: {
   value: string;
   category: string;
   contaBancariaSelecionada: IContaBancario;
   type: string;
   accountId: string | null;
 }) {
   try {
     // Salve os dados da transação no seu banco de dados ou onde for necessário
     console.log("Salvando transação:", transactionData);

     // Atualizar o saldo da conta bancária diretamente
     if (transactionData.type === "income") {
       transactionData.contaBancariaSelecionada.balance += parseFloat(
         transactionData.value
       );
     } else if (transactionData.type === "expense") {
       transactionData.contaBancariaSelecionada.balance -= parseFloat(
         transactionData.value
       );
     }

     // Aqui você pode chamar a função para salvar no seu banco de dados (Exemplo fictício)
     // await this.transactionRepository.save(transactionData);
     // await this.accountRepository.updateBalance(transactionData.contaBancariaSelecionada);

     return true;
   } catch (error) {
     console.error("Erro ao salvar transação:", error);
     return false;
   }
 }
}
