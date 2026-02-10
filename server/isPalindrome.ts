export function isPalindrome(input: string): boolean {
  // Remove non-alphanumeric characters and convert to lowercase
  const sanitized: string = input.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  // Compare the sanitized string to its reverse
  return sanitized === sanitized.split('').reverse().join('');
}