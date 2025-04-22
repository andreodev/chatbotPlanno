export class GreetingHandler {
  static greetings = [
    "oi", "olá", "ola", "eae", "e aí", "hello", "hi",
    "bom dia", "boa tarde", "boa noite",
  ];

  static isGreeting(message: string): boolean {
    return this.greetings.includes(message?.toLowerCase().trim());
  }
}
