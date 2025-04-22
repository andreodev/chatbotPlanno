import axios from "axios";
import stringSimilarity from 'string-similarity';
import { DEEPSEEK_CONFIG } from "../config/deepseek";
import AuthService from "./auth/AuthService";


export interface DeepSeekResponse {
  type: "form" | "message" | "error" | "invalid_category" | "similar_categories";
  data?: {
    value: string;
    category: string;
    description?: string;
  };
  content?: string;
  validCategories?: string[];
  suggestions?: string[];
  originalCategory?: string;
}

class DeepSeekService {
  private headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DEEPSEEK_CONFIG.API_KEY}`,
  };

  private authDataCache: {
    data: any;
    timestamp: number;
  } | null = null;

  private async getAuthData() {
    const CACHE_TIME = 5 * 60 * 1000; // 5 minutos de cache
    
    if (this.authDataCache && (Date.now() - this.authDataCache.timestamp) < CACHE_TIME) {
      return this.authDataCache.data;
    }

    const authService = new AuthService();
    const authData = await authService.login();
    this.authDataCache = {
      data: authData,
      timestamp: Date.now()
    };
    
    return authData;
  }

  private normalizeInput(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD") // separa acentos
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/[^\w\s]/gi, "") // remove emojis e caracteres especiais
      .trim();
  }
  

  private validateCategory(inputCategory: string, validCategories: any[]): {
    isValid: boolean;
    suggestions: string[];
    exactMatch: boolean;
  } {
    const normalizedInput = this.normalizeInput(inputCategory);
  
    const exactMatch = validCategories.some(
      c => this.normalizeInput(c.title) === normalizedInput
    );
  
    if (exactMatch) {
      return {
        isValid: true,
        suggestions: [],
        exactMatch: true
      };
    }
  
    const { matches } = this.findSimilarCategories(normalizedInput, validCategories);
  
    return {
      isValid: matches.length > 0,
      suggestions: matches,
      exactMatch: false
    };
  }
  

  
  private findSimilarCategories(input: string, categories: any[]): {
    matches: string[];
  } {
    const titles = categories.map(c => c.title);
    const normalizedTitles = titles.map(this.normalizeInput.bind(this));
  
    const similarities = stringSimilarity.findBestMatch(input, normalizedTitles);
  
    const threshold = 0.4;
  
    const matches = similarities.ratings
      .map((r, i) => ({ ...r, original: titles[i] })) // guarda título original
      .filter(r => r.rating >= threshold)
      .sort((a, b) => b.rating - a.rating)
      .map(r => r.original);
  
    return { matches };
  }
  
  

  async generateFormattedResponse(userMessage: string): Promise<DeepSeekResponse> {
    const authData = await this.getAuthData();
    const userCategories = authData.categories || [];

    const systemPrompt: string = `Você é o Plannito🤖, assistente financeiro especializado no app Planno (disponível em: https://play.google.com/store/apps/details?id=br.com.breaklabs.plano). Siga À RISCA:

    1. 🟢 SUA IDENTIDADE:
  - Só conhece o Planno (nunca mencione outros apps)
  - Use sempre emojis verdes (💚✅📗)
  - Seja extremamente organizado

    2. 📋 REGRAS DE CATEGORIAS:
  - USE APENAS ESTAS CATEGORIAS VÁLIDAS:
  ${userCategories.map((c: { title: string; type: string }) => `• ${c.title} ${c.type === 'income' ? '📈' : '📉'}`).join('\n')}

    3. PARA REGISTROS FINANCEIROS:
    - Extraia valor (ex: R$ 50,00 → "50.00")
    - Valide a categoria:
    → Se existir: type: "form"
    → Se similar: type: "similar_categories"
    → Se inválida: type: "invalid_category"

    4. 🚫 PROIBIDO:
- Inventar categorias
- Aceitar valores inválidos
- Sugerir outros apps

5. 🔄 FLUXO PARA CATEGORIAS INVÁLIDAS:
1. Informe "Esta categoria não existe"
2. Mostre a lista de categorias válidas
3. Pergunte: "Deseja criar a categoria X? (Sim/Não)"

     FORMATO DA RESPOSTA (JSON):
    {
    "type": "form"|"message"|"invalid_category"|"similar_categories",
    "data?": {"value": string, "category": string},
    "content?": string,
    "suggestions?": string[],
    "originalCategory?": string
    }`;

    try {
      const response = await axios.post(
        DEEPSEEK_CONFIG.API_URL,
        {
          model: DEEPSEEK_CONFIG.DEFAULT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        },
        { 
          headers: this.headers,
          timeout: 15000 // 15 segundos de timeout
        }
      );

      const parsedResponse = JSON.parse(response.data.choices[0].message.content);

      // Validação adicional no servidor
      if (parsedResponse.type === "form") {
        const validation = this.validateCategory(
          parsedResponse.data.category, 
          userCategories
        );

        if (!validation.exactMatch) {
          if (validation.suggestions.length > 0) {
            return {
              type: "similar_categories",
              content: `🔍 Categoria "${parsedResponse.data.category}" não encontrada.`,
              suggestions: validation.suggestions,
              originalCategory: parsedResponse.data.category,
              validCategories: userCategories.map((c: { title: string }) => c.title)
            };
          } else {
            return {
              type: "invalid_category",
              content: `⚠️ Categoria "${parsedResponse.data.category}" não existe.`,
              validCategories: userCategories.map((c: { title: string }) => c.title)
            };
          }
        }
      }

      return parsedResponse;
    } catch (error: any) {
      console.error("Erro no DeepSeek:", {
        message: error.message,
        response: error.response?.data,
        stack: error.stack
      });

      return {
        type: "error",
        content: "🔧 Estou com problemas técnicos. Por favor, tente novamente mais tarde."
      };
    }
  }
}

export default new DeepSeekService();