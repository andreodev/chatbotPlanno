import { CATEGORY_LIST_KEYWORDS, CATEGORY_ADD_KEYWORDS, SUBCATEGORY_MAP } from "../constants/messageKeywords";
import { Category } from "../models/Category";

export function isGreeting(message: string, greetings: string[]): boolean {
  if (!message) return false;
  return greetings.includes(message.toLowerCase().trim());
}

export function isCategoryListRequest(messageBody: string): boolean {
  return CATEGORY_LIST_KEYWORDS.some(keyword => messageBody.includes(keyword));
}

export function isAddCategoryRequest(messageBody: string): boolean {
  return CATEGORY_ADD_KEYWORDS.some(keyword => messageBody.includes(keyword));
}

export async function findBestCategoryMatch(categoryName: string, categories: Category[]): Promise<Category | null> {
  const lowerInput = categoryName.toLowerCase();

  const exactMatch = categories.find(c => c.title.toLowerCase() === lowerInput);
  if (exactMatch) return exactMatch;

  const partialMatch = categories.find(
    c => c.title.toLowerCase().includes(lowerInput) || lowerInput.includes(c.title.toLowerCase())
  );
  if (partialMatch) return partialMatch;

  for (const [keyword, mappedCategory] of Object.entries(SUBCATEGORY_MAP)) {
    if (lowerInput.includes(keyword)) {
      return categories.find(c => c.title === mappedCategory) || null;
    }
  }

  return null;
}
