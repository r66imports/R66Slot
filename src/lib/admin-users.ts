import { blobRead, blobWrite } from '@/lib/blob-storage'
import bcrypt from 'bcryptjs'
export { ALL_PERMISSIONS, DEFAULT_PERMISSIONS, ALWAYS_ALLOWED } from '@/lib/admin-permissions'

export const ADMIN_USERS_KEY = 'data/admin-users.json'

export interface AdminUser {
  id: string
  username: string
  password: string // bcrypt hash
  firstName: string
  lastName: string
  email?: string
  role: 'staff'
  permissions: string[]
  active: boolean
  createdAt: string
  updatedAt?: string
}

export type AdminUserPublic = Omit<AdminUser, 'password'>

export async function getAdminUsers(): Promise<AdminUser[]> {
  return await blobRead<AdminUser[]>(ADMIN_USERS_KEY, [])
}

export async function saveAdminUsers(users: AdminUser[]): Promise<void> {
  await blobWrite(ADMIN_USERS_KEY, users)
}

export function stripPassword(user: AdminUser): AdminUserPublic {
  const { password: _pw, ...rest } = user
  return rest
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
