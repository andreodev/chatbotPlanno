export function parseMessage(message: string) {
  if (!message) return null;

  // Padrão melhorado para linguagem natural
  const regex = /(?:gastei|adicione|paguei|comprei|investi)\s*(\d+[,\d]*\.?\d*)\s*(?:reais|rs|r\$|contos)?\s*(?:em|na|no|para|em\s+o|em\s+a)?\s*([^\d,.]*)/i;
  const match = message.match(regex);

  if (!match) return null;

  return {
    value: match[1]?.replace(',', '.') || '', // Converte 87,90 para 87.90
    category: match[2]?.trim().toLowerCase() || 'outros',
    description: message.trim()
  };
}