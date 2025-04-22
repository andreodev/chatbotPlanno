import AppContext from "../context/AppContext";
import { IContaBancario } from "../interfaces/IContaBancaria";
import { Category } from "../models/Category";

class MessageView {
  public errorResponse(): string {
    return "❌ Ocorreu um erro ao processar sua mensagem. Por favor, tente novamente mais tarde.";
  }

  public invalidMessageResponse(): string {
    return (
      "📌 *Mensagem inválida*\n\n" +
      "Por favor, envie no formato:\n" +
      '• "Gastei [valor] em [categoria]"\n' +
      '• "Adicionei [valor] em [categoria]"\n\n' +
      'Exemplo: _"Gastei 50 reais em transporte"_'
    );
  }

  public async getGreetingMessage(userName?: string): Promise<string> {
    const user = await AppContext.getUser();
    userName = user.name; // Assuming 'name' is the string property of the User object
    return this.getWelcomeTemplate(userName);
  }

  private getWelcomeTemplate(userName: string): string {
    return (
      `👋 Olá ${userName}, eu sou o Plannito! 🤖\n\n` +
      `*Seu assistente financeiro inteligente*\n\n` +
      `Posso ajudar você com:\n` +
      `✓ Registrar gastos e receitas\n` +
      `✓ Analisar seus hábitos\n` +
      `✓ Dar dicas personalizadas\n\n` +
      `*Como usar:*\n` +
      `- "Gastei 100 em combustível"\n` +
      `- "Adicionei 1500 de salário"\n` +
      `- "Resumo do mês"\n\n` +
      `Me diga como posso ajudar! 💚`
    );
  }

  public aiResponseFormat(response: string): string {
    return `💡 *Resposta:*\n${response}\n\n` + `Precisa de mais alguma coisa?`;
  }

  public invalidCategoryMessage(
    invalidCategory: string,
    validCategories: Category[]
  ): string {
    const categoriesList = this.formatCategoriesList(validCategories); // Usar o método correto
    return (
      `🔍 *Categoria não encontrada*\n\n` +
      `A categoria "${invalidCategory}" não existe em seu cadastro.\n\n` +
      `*Categorias disponíveis:*\n${categoriesList}\n\n` +
      `Deseja criar "${invalidCategory}"? (Sim/Não)`
    );
  }
  
  public suggestCategoryMessage(
    originalCategory: string,
    suggestedCategory: string,
    validCategories: Category[]
  ): string {
    const categoriesList = this.formatCategoriesList(validCategories); // Usar o método correto
  
    return (
      `🔍 *Sugestão de Categoria*\n\n` +
      `Para "${originalCategory}", sugerimos usar:\n` +
      `*${suggestedCategory}*\n\n` +
      `*Categorias disponíveis:*\n${categoriesList}\n\n` +
      `Deseja usar *${suggestedCategory}*? (Sim/Não)`
    );
  }
  
  private formatCategoriesList(categories: Category[]): string {
    return categories
      .map((c) => `• ${c.title} ${c.type === "expense" ? "📉" : "📈"}`)
      .join("\n");
  }

  public categoryCreatedMessage(categoryName: string): string {
    return (
      `✅ *Categoria criada com sucesso!*\n\n` +
      `"${categoryName}" foi adicionada às suas categorias.\n\n` +
      `Agora você pode registrar transações nesta categoria.`
    );
  }

  public transactionConfirmationMessage(data: {
    value: string;
    category: string;
    userName?: string;
    listaContasBancarias: IContaBancario[] | null;
    contaBancariaSelecionada: IContaBancario | null;
    setSelectedContaBancaria: (Conta: IContaBancario) => void;
    description?: string;
    type: string;
    body: string;
  }): string {
    if (!data.contaBancariaSelecionada) {
      return this.requestAccountSelection(data);
    }
  
    if (data.contaBancariaSelecionada) {
      if (data.type) {
        return this.confirmTransaction({
          value: data.value,
          category: data.category,
          contaBancariaSelecionada: data.contaBancariaSelecionada,
          type: data.type,
        });
      } else {
        return this.confirmTransaction({
          value: data.value,
          category: data.category,
          contaBancariaSelecionada: data.contaBancariaSelecionada,
          type: "expense", // Definindo tipo padrão
        });
      }
    }
  
    return `❌ Não foi possível processar a transação. Por favor, tente novamente.`;
  }

  private requestAccountSelection(data: {
    listaContasBancarias: IContaBancario[] | null;
    contaBancariaSelecionada: IContaBancario | null;
    setSelectedContaBancaria: (Conta: IContaBancario) => void;
    body: string;
  }): string {
    const contas = data.listaContasBancarias || [];
    console.log("dados: ", data.listaContasBancarias);

    if (contas.length === 0) {
      return `❌ Não há contas bancárias registradas. Por favor, adicione uma conta antes de continuar.`;
    }

    const escolhaUsuario = parseInt(data.body.trim());

    if (!isNaN(escolhaUsuario) && escolhaUsuario > 0 && escolhaUsuario <= contas.length) {
      const contaSelecionada = contas[escolhaUsuario - 1];
      data.setSelectedContaBancaria(contaSelecionada);

    }

    const listaContasFormatada = contas
      .map((conta, index) => `${index + 1}. ${conta.name}`)
      .join("\n");

    return `💳 *Selecione uma Conta Bancária*\n\n${listaContasFormatada}\n\nResponda com o número da conta que deseja usar.`;
  }

  private confirmTransaction(data: {
    value: string;
    category: string;
    contaBancariaSelecionada: IContaBancario;
    type: string;
  }): string {
    return `✅ *Transação Confirmada!*\n\nVocê escolheu a conta: *${data.contaBancariaSelecionada.name}*\nValor: *${data.value}*\nCategoria: *${data.category}*\nTipo: *${data.type}*\n\nSe tudo estiver correto, confirme a transação.`;
  }

  public transactionCreatedMessage(data: {
  value: string;
  category: string;
  userName?: string;
  type: string;
}): string {
  if (!data.type) {
    // Atribua um valor padrão ou avise sobre a falta de tipo
    console.warn('Tipo de transação não especificado, atribuindo valor padrão.');
    data.type = 'expense'; // Atribuindo valor padrão
  }

  return (
    `✅ *Transação registrada!*\n\n` +
    `▸ *Valor:* R$ ${data.value}\n` +
    `▸ *Nome:* ${data.userName}\n` +
    `▸ *Tipo:* ${data.type === "expense" ? "Despesa 📉" : "Receita 📈"}\n` +
    `\nObrigado por usar o Planno! 💚`
  );
}

  public getCategoryHelpMessage(validCategories: Category[]): string {
    return (
      `📱 *Como adicionar novas categorias* 📱\n\n` +
      `Você pode criar categorias personalizadas diretamente no app Planno:\n\n` +
      `1. Abra o aplicativo Planno no seu celular\n` +
      `2. Toque no ícone de menu (☰) ou em "Configurações"\n` +
      `3. Selecione "Minhas Categorias"\n` +
      `4. Toque no botão "+" para criar nova\n\n` +
      `💡 *Categorias disponíveis atualmente:*\n` +
      `${this.formatCategoriesList(validCategories)}\n\n` +
      `Posso te ajudar a escolher uma categoria existente para seu registro?`
    );
  }

  public listAllCategories(validCategories: Category[]): string {
    const expenses = validCategories.filter((c) => c.type === "expense");
    const incomes = validCategories.filter((c) => c.type === "income");

    const formatCategoryList = (categories: Category[]) =>
      categories
        .map((c) => `• ${c.title} ${c.type === "expense" ? "📉" : "📈"}`)
        .join("\n");

    let message = `📋 *Categorias Disponíveis no Planno* 📋\n\n`;

    message += `📉 *Despesas:*\n${formatCategoryList(expenses)}\n\n`;
    message += `📈 *Receitas:*\n${formatCategoryList(incomes)}\n\n`;
    message += `💡 Você pode usar qualquer uma dessas categorias para registrar seus gastos ou receitas.\n`;
    message += `Exemplo: "Gastei 50 reais em Transporte"`;

    return message;
  }
}

export default MessageView;
