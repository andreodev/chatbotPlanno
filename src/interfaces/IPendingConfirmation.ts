export interface PendingConfirmation {
  type: "category" | "transaction";
  data: any;
  timestamp: number;
  suggestedCategory?: string;
  needsBankAccount?: boolean;
}
