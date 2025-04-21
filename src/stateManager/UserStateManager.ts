type State =
  | null
  | {
      action: "creating-transaction";
      value: string;
      category: string;
      type: "expense" | "income";
      userName?: string;
      description?: string;
    };

const userStates = new Map<string, State>();

export const UserStateManager = {
  setState: (userId: string, state: State) => {
    userStates.set(userId, state);
  },

  getState: (userId: string): State => {
    return userStates.get(userId) || null;
  },

  clearState: (userId: string) => {
    userStates.delete(userId);
  },
};
