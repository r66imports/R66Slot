'use client'

import { createContext, useContext } from 'react'

export interface AdminAuthData {
  role: 'admin' | 'staff' | null
  permissions: string[]
  username: string | null
}

export const AdminAuthContext = createContext<AdminAuthData>({
  role: null,
  permissions: [],
  username: null,
})

export function useAdminAuth() {
  return useContext(AdminAuthContext)
}
