// src/utils/stringSimilarity.ts
export class StringSimilarity {
  /**
   * Calcula a similaridade entre duas strings (0 a 1)
   * usando o algoritmo de Levenshtein
   */
  static similarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    // Caso base
    if (longer.length === 0) return 1.0;

    // Normaliza removendo acentos e convertendo para minúsculas
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const longerNorm = normalize(longer);
    const shorterNorm = normalize(shorter);

    // Calcula a distância de Levenshtein
    const distance = this.levenshtein(longerNorm, shorterNorm);
    
    return 1 - (distance / longer.length);
  }

  private static levenshtein(s1: string, s2: string): number {
    const m: number[][] = [];
    
    for (let i = 0; i <= s1.length; i++) {
      m[i] = [i];
    }

    for (let j = 0; j <= s2.length; j++) {
      m[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1.charAt(i - 1) === s2.charAt(j - 1) ? 0 : 1;
        m[i][j] = Math.min(
          m[i - 1][j] + 1,     // Deleção
          m[i][j - 1] + 1,     // Inserção
          m[i - 1][j - 1] + cost // Substituição
        );
      }
    }

    return m[s1.length][s2.length];
  }
}