import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { blobRead } from '@/lib/blob-storage'
import type { BidderProfile } from '@/types/auction'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-replace-in-production'

interface JWTPayload {
  id: string
  email: string
  username?: string
}

/**
 * Reads the customer_token JWT cookie, verifies it,
 * and returns or creates the matching bidder_profiles row in Supabase.
 */
export async function getBidderFromRequest(): Promise<BidderProfile | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value
    if (!token) return null

    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    const supabase = getSupabaseAdmin()

    // Look up existing bidder profile
    const { data: profile } = await supabase
      .from('bidder_profiles')
      .select('*')
      .eq('r66_customer_id', decoded.id)
      .single()

    if (profile) return profile as BidderProfile

    // Auto-create bidder profile from customer data
    const customers = await blobRead<any[]>('data/customers.json', [])
    const customer = customers.find((c: any) => c.id === decoded.id)

    const displayName = customer?.username || customer?.firstName || decoded.email.split('@')[0]

    const { data: newProfile } = await supabase
      .from('bidder_profiles')
      .insert({
        r66_customer_id: decoded.id,
        display_name: displayName,
        email: decoded.email,
        phone: customer?.phone || null,
      })
      .select()
      .single()

    return newProfile as BidderProfile | null
  } catch {
    return null
  }
}

/**
 * Checks if the request has a valid admin session.
 */
export async function isAdminRequest(): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('admin-session')?.value
    return !!session
  } catch {
    return false
  }
}
