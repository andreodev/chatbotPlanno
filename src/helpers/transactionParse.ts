// utils/transactionParser.ts

import type { TransactionData } from "../interfaces/ITransactionData";
import type { DeepSeekResponse } from "../services/DeepSeekService";

export function parseDeepSeekToTransactionData(
  response: DeepSeekResponse,
  accountName: string
): TransactionData | null {
  if (response.type !== "form" || !response.data?.value || !response.data?.category) {
    return null;
  }

  const rawValue = response.data.value.replace(",", ".").replace(/[^\d.]/g, "");
  const amount = parseFloat(rawValue);

  if (isNaN(amount)) return null;

  return {
    amount,
    category: response.data.category,
    accountName,
    description: response.data.description || "",
    date: new Date().toISOString()
  };
}
