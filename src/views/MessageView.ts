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
    userName = user.name;
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

    if (
      !isNaN(escolhaUsuario) &&
      escolhaUsuario > 0 &&
      escolhaUsuario <= contas.length
    ) {
      const contaSelecionada = contas[escolhaUsuario - 1];
      data.setSelectedContaBancaria(contaSelecionada);
    }

    const listaContasFormatada = contas
      .map((conta, index) => `${index + 1}. ${conta.name}`)
      .join("\n");

    return `💳 *Selecione uma Conta Bancária*\n\n${listaContasFormatada}\n\nResponda com o número da conta que deseja usar.`;
  }

  public confirmTransaction(data: {
    value: string;
    category: string;
    contaBancariaSelecionada: IContaBancario;
    type: string;
  }): string {
    // Validação adicional para tipo inconsistente
    console.log('Tipo antes do envio:', data.type);
    const isIncomeCategory = ["salário", "rendimento"].includes(
      data.category.toLowerCase()
    );
    if (isIncomeCategory && data.type === "expense") {
      console.warn("Aviso: Tipo inconsistente para categoria de receita");
      data.type = "income"; // Auto-correção
    }

    // Restante da validação original...
    if (
      !data.value ||
      !data.category ||
      !data.contaBancariaSelecionada ||
      !data.type
    ) {
      return "❌ Não foi possível confirmar a transação. Dados incompletos.";
    }

    return (
      `✅ *Transação Criada com sucesso!*\n\n` +
      `▸ *Conta:* ${data.contaBancariaSelecionada.name}\n` +
      `▸ *Valor:* R$ ${data.value}\n` +
      `▸ *Categoria:* ${data.category}\n` +
      `▸ *Tipo:* ${data.type === "income" ? "📥 Entrada" : "📤 Saída"}\n\n` +
      `Se tudo estiver correto, confirme com *Sim* ou cancele com *Não*.`
    );
  }

  public transactionCreatedMessage(data: {
    value: string;
    category: string;
    type: string;
    contaBancariaSelecionada: IContaBancario;
  }): string {

    console.log('Tipo antes do envio:', data.type);
    const isIncomeCategory = ["salário", "rendimento"].includes(
      data.category.toLowerCase()
    );
    if (isIncomeCategory && data.type === "expense") {
      console.warn("Aviso: Tipo inconsistente para categoria de receita");
      data.type = "income"; // Auto-correção
    }
    // Verificação de dados essenciais
    if (
      !data.value ||
      !data.category ||
      !data.contaBancariaSelecionada ||
      !data.type
    ) {
      return "❌ Não foi possível registrar a transação. Dados incompletos.";
    }

    return (
      `✅ *Dados enviado ao aplicativo!*\n\n` +
      `▸ *Conta:* ${data.contaBancariaSelecionada.name}\n` +
      `▸ *Valor:* R$ ${data.value}\n` +
      `▸ *Categoria:* ${data.category}\n` +
      `▸ *Tipo:* ${data.type === "income" ? "📥 Entrada" : "📤 Saída"}`
    );
  }

  public listAllCategories(validCategories: Category[]): string {
    const expenses = validCategories.filter((c) => c.type === "expense");
    const incomes = validCategories.filter((c) => c.type === "income");

    const formatCategoryList = (categories: Category[]) =>
      categories
        .map((c) => `• ${c.title} ${c.type === "expense" ? "📉" : "📈"}`)
        .join("\n");

    let message = `📂 *Suas categorias:*\n\n`;

    message += `📉 *Despesas:*\n${formatCategoryList(expenses)}\n\n`;
    message += `📈 *Receitas:*\n${formatCategoryList(incomes)}\n\n`;
    message += `💡 Você pode usar qualquer uma dessas categorias para registrar seus gastos ou receitas.\n`;
    message += `Exemplo: "Gastei 50 reais em Transporte"`;

    return message;
  }
}

export default MessageView;
