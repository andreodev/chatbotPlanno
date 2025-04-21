class User {
  public async findByPhone(phoneNumber: string): Promise<{ name: string } | null> {
    // Replace with actual implementation to fetch user by phone number
    return { name: 'John Doe' }; // Example return value
  }
  public async saveExpense(phoneNumber: string, formData: any): Promise<void> {
    // Implement the logic to save the expense in the database
    console.log(`Saving expense for ${phoneNumber}:`, formData);
    // Example: Database logic here
    }
}

// Função mockada - manter sua implementação real aqui
async function checkIfPhoneExists(phone: string) {
  // Sua implementação real do banco de dados
}


export default User;