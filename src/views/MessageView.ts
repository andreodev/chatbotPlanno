import AppContext from "../context/AppContext";
import type { IContaBancario } from "../interfaces/IContaBancaria";
import { Category } from "../models/Category";

class MessageView {
  public errorResponse(): string {
    return '❌ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.';
  }

  public invalidMessageResponse(): string {
    return '📌 *Mensagem inválida*\n\n' +
      'Por favor, envie no formato:\n' +
      '• "Gastei [valor] em [categoria]"\n' +
      '• "Adicionei [valor] em [categoria]"\n\n' +
      'Exemplo: _"Gastei 50 reais em transporte"_';
  }

  public async getGreetingMessage(userName?: string): Promise<string> {
    userName = await this.getUserName(userName);
    return this.getWelcomeTemplate(userName);
  }

  public async getWelcomeMessage(userName?: string): Promise<string> {
    userName = await this.getUserName(userName);
    return this.getWelcomeTemplate(userName);
  }

  private async getUserName(userName?: string): Promise<string> {
    if (!userName) {
      try {
        const user = AppContext.getUser();
        userName = user.name;
      } catch {
        userName = 'amigo(a)';
      }
    }
    return userName;
  }

  private getWelcomeTemplate(userName: string): string {
    return `👋 Olá ${userName}, eu sou o Plannito! 🤖\n\n` +
      `*Seu assistente financeiro inteligente*\n\n` +
      `Posso ajudar você com:\n` +
      `✓ Registrar gastos e receitas\n` +
      `✓ Analisar seus hábitos\n` +
      `✓ Dar dicas personalizadas\n\n` +
      `*Como usar:*\n` +
      `- "Gastei 100 em combustível"\n` +
      `- "Adicionei 1500 de salário"\n` +
      `- "Resumo do mês"\n\n` +
      `Me diga como posso ajudar! 💚`;
  }

  public aiResponseFormat(response: string): string {
    return `💡 *Resposta:*\n${response}\n\n` +
      `Precisa de mais alguma coisa?`;
  }

  public invalidCategoryMessage(invalidCategory: string, validCategories: Category[]): string {
    const categoriesList = this.formatCategoriesList(validCategories);
    return `🔍 *Categoria não encontrada*\n\n` +
      `A categoria "${invalidCategory}" não existe em seu cadastro.\n\n` +
      `*Categorias disponíveis:*\n${categoriesList}\n\n` +
      `Deseja criar "${invalidCategory}"? (Sim/Não)`;
  }

  public suggestCategoryMessage(
    originalCategory: string,
    suggestedCategory: string,
    validCategories: Category[]
  ): string {
    const categoriesList = this.formatCategoriesList(validCategories);
    
    return `🔍 *Sugestão de Categoria*\n\n` +
      `Para "${originalCategory}", sugerimos usar:\n` +
      `*${suggestedCategory}*\n\n` +
      `*Categorias disponíveis:*\n${categoriesList}\n\n` +
      `Deseja usar *${suggestedCategory}*? (Sim/Não)`;
  }

  private formatCategoriesList(categories: Category[]): string {
    return categories.map(c => `• ${c.title} ${c.type === 'expense' ? '📉' : '📈'}`).join('\n');
}

  public categoryCreatedMessage(categoryName: string): string {
    return `✅ *Categoria criada com sucesso!*\n\n` +
      `"${categoryName}" foi adicionada às suas categorias.\n\n` +
      `Agora você pode registrar transações nesta categoria.`;
  }

  public transactionConfirmationMessage(data: {
    value: string;
    category: string;
    userName?: string;
    listaContasBancarias: IContaBancario[] | null ;
    contaBancariaSelecionada: IContaBancario | null ;
    setSelectedContaBancaria: (Conta: IContaBancario) => void;
    description?: string;
    type: string
  }): string {
    console.log(data.contaBancariaSelecionada)


    if (!data.contaBancariaSelecionada) {
      const contas = data.listaContasBancarias || [];
    
      const listaContasFormatada = contas
        .map((conta: any, index: number) => `${index + 1}. ${conta.name}`)
        .join('\n');
      
       await safeSendText(client, message.from, `SELECIONE QUAL DAS CONTAS:\n${listaContasFormatada}`);
        const resposta = getResposta()
        const nomeDaMinhaConta = listaContasFormatada (onde for igual a 1) //onde o numero digitado pelo usuario for igual ao numero da linha

      const contaBancariaSelecionada = data.listaContasBancarias?.find((conta) => conta.name === nomeDaMinhaConta) //
      data.setSelectedContaBancaria(contaBancariaSelecionada)
      this.transactionConfirmationMessage(data)
      
      // this.transactionConfirmationMessage(data); <-- Se quiser chamar depois
    }


    let message = `💰 *Confirmar Transação*\n\n` +
      `▸ *Valor:* R$ ${data.value}\n` +
      `▸ *Categoria:* ${data.category}\n` +
      `▸ *Nome:* ${data.userName}\n` +
       `▸ *Conta Bancaria:* ${data.contaBancariaSelecionada.name}\n` +
     `▸ *Tipo:* ${data.type === 'expense' ? 'Despesa 📉' : 'Receita 📈'}\n`;
    message += `\nEsta transação está correta? (Sim/Não)`;
    return message;
  }

  public transactionCreatedMessage(data: {
    value: string;
    category: string;
    userName?: string;
    type: string
  }): string {
    let message = `✅ *Transação registrada!*\n\n` +
   `▸ *Valor:* R$ ${data.value}\n` +
      `▸ *Categoria:* ${data.category}\n` +
      `▸ *Nome:* ${data.userName}\n` +
      `▸ *Tipo:* ${data.type === 'expense' ? 'Despesa 📉' : 'Receita 📈'}\n`;


    message += `\nObrigado por usar o Planno! 💚`;
    return message;
  }

  public getCategoryHelpMessage(validCategories: Category[]): string {
    return `📱 *Como adicionar novas categorias* 📱\n\n` +
           `Você pode criar categorias personalizadas diretamente no app Planno:\n\n` +
           `1. Abra o aplicativo Planno no seu celular\n` +
           `2. Toque no ícone de menu (☰) ou em "Configurações"\n` +
           `3. Selecione "Minhas Categorias"\n` +
           `4. Toque no botão "+" para criar nova\n\n` +
           `💡 *Categorias disponíveis atualmente:*\n` +
           `${this.formatCategoriesList(validCategories)}\n\n` +
           `Posso te ajudar a escolher uma categoria existente para seu registro?`;
}

public listAllCategories(validCategories: Category[]): string {
  // Separar despesas e receitas
  const expenses = validCategories.filter(c => c.type === 'expense');
  const incomes = validCategories.filter(c => c.type === 'income');

  // Formatar a lista de categorias
  const formatCategoryList = (categories: Category[]) => 
      categories.map(c => `• ${c.title} ${c.type === 'expense' ? '📉' : '📈'}`).join('\n');

  // Construir a mensagem
  let message = `📋 *Categorias Disponíveis no Planno* 📋\n\n`;
  
  message += `📉 *Despesas:*\n${formatCategoryList(expenses)}\n\n`;
  message += `📈 *Receitas:*\n${formatCategoryList(incomes)}\n\n`;
  message += `💡 Você pode usar qualquer uma dessas categorias para registrar seus gastos ou receitas.\n`;
  message += `Exemplo: "Gastei 50 reais em Transporte"`;

  return message;
}
}



export default MessageView;