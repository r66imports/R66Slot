// Simple admin authentication
// In production, use NextAuth or a proper auth solution

export const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123', // Simple password for development
}

export function isAuthenticated(req: Request): boolean {
  // Check if admin session exists
  // This is a simple implementation - enhance with proper session management
  return true // For development, always return true
}

export async function verifyPassword(
  password: string,
  storedPassword: string
): Promise<boolean> {
  // Simple password comparison for development
  return password === storedPassword
}

export async function hashPassword(password: string): Promise<string> {
  // Not used in development mode
  return password
}
