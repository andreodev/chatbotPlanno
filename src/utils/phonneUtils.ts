export function extractPhoneNumber(fullPhone: string): string {
  const match = fullPhone.match(/^(\d+)@c\.us$/);
  return match ? match[1] : fullPhone;
}