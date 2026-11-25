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

/**
 * The staff account a session belongs to — or null if that account no longer
 * grants access. Shared by the /api/admin gate in middleware.ts and
 * /api/admin/auth/check so the two can never disagree.
 *
 * The session cookie only proves who logged in and when; it stays valid for 7
 * days on its own. Deleting or deactivating a user must end their access at
 * once, so every request re-reads the account:
 *   - deleted  -> no match -> null
 *   - inactive -> null
 *   - deleted then re-created under the same username -> the new account's
 *     createdAt is after the old session was issued -> null, so a leftover
 *     cookie cannot inherit the new account.
 */
export async function findLiveStaffUser(username: string, issuedAt: number): Promise<AdminUser | null> {
  const users = await getAdminUsers()
  const user = users.find((u) => u.username?.toLowerCase() === username.toLowerCase())
  if (!user || !user.active) return null
  const createdAt = Date.parse(user.createdAt)
  if (Number.isFinite(createdAt) && createdAt > issuedAt) return null
  return user
}
