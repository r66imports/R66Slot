/**
 * Sage Accounting API Client (South Africa)
 * API v3.1 — https://developer.sage.com/accounting/reference/
 *
 * OAuth 2.0 flow:
 *   1. User clicks "Connect Sage" in admin → redirected to Sage login
 *   2. Sage redirects back to /api/admin/sage/callback with ?code=
 *   3. We exchange code for access_token + refresh_token
 *   4. Tokens stored in json_store (key: 'sage/tokens')
 *   5. Sync runs using access_token, auto-refreshes when expired
 */

import { blobRead, blobWrite } from '@/lib/blob-storage'

const SAGE_API_BASE = 'https://api.accounting.sage.com/v3.1'
const SAGE_TOKEN_URL = 'https://oauth.accounting.sage.com/token'
const SAGE_AUTH_URL = 'https://www.sageone.com/oauth2/auth/central?filter=apiv3.1'
const TOKENS_KEY = 'sage/tokens'

interface SageTokens {
  access_token: string
  refresh_token: string
  expires_at: number // Unix ms timestamp
}

export interface SageProduct {
  id: string
  displayed_as: string        // Product name
  description: string | null
  item_code: string | null    // SKU / item code
  barcode: string | null
  sales_prices: { price: number }[]
  purchase_prices: { price: number }[]
  stock_on_hand: number | null
  active: boolean
  product_group?: { displayed_as: string } | null
}

// ── Token storage ────────────────────────────────────────────────────────────

async function getTokens(): Promise<SageTokens | null> {
  return await blobRead<SageTokens | null>(TOKENS_KEY, null)
}

export async function saveTokens(tokens: SageTokens): Promise<void> {
  await blobWrite(TOKENS_KEY, tokens)
}

export async function clearTokens(): Promise<void> {
  await blobWrite(TOKENS_KEY, null)
}

// ── OAuth helpers ────────────────────────────────────────────────────────────

export function getAuthUrl(): string {
  const clientId = process.env.SAGE_CLIENT_ID
  const redirectUri = process.env.SAGE_REDIRECT_URI
  if (!clientId || !redirectUri) throw new Error('SAGE_CLIENT_ID and SAGE_REDIRECT_URI must be set')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'full_access',
  })
  return `${SAGE_AUTH_URL}&${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<SageTokens> {
  const clientId = process.env.SAGE_CLIENT_ID!
  const clientSecret = process.env.SAGE_CLIENT_SECRET!
  const redirectUri = process.env.SAGE_REDIRECT_URI!

  const res = await fetch(SAGE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sage token exchange failed: ${err}`)
  }

  const data = await res.json()
  const tokens: SageTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }
  await saveTokens(tokens)
  return tokens
}

async function refreshAccessToken(tokens: SageTokens): Promise<SageTokens> {
  const res = await fetch(SAGE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
      client_id: process.env.SAGE_CLIENT_ID!,
      client_secret: process.env.SAGE_CLIENT_SECRET!,
    }),
  })

  if (!res.ok) {
    await clearTokens()
    throw new Error('Sage refresh token expired — please reconnect Sage in admin')
  }

  const data = await res.json()
  const refreshed: SageTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  }
  await saveTokens(refreshed)
  return refreshed
}

async function getValidAccessToken(): Promise<string> {
  let tokens = await getTokens()
  if (!tokens) throw new Error('Sage not connected — please connect in admin settings')

  if (Date.now() >= tokens.expires_at) {
    tokens = await refreshAccessToken(tokens)
  }
  return tokens.access_token
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchSageProducts(): Promise<SageProduct[]> {
  const token = await getValidAccessToken()
  const all: SageProduct[] = []
  let nextUrl: string | null = `${SAGE_API_BASE}/products?items_per_page=200&attributes=all`

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Sage products fetch failed: ${res.status} ${await res.text()}`)

    const data = await res.json()
    all.push(...(data.$items || []))
    nextUrl = data.$next || null
  }

  return all.filter(p => p.active !== false)
}

export async function getSageConnectionStatus(): Promise<{ connected: boolean; expiresAt?: number }> {
  const tokens = await getTokens()
  if (!tokens) return { connected: false }
  return { connected: true, expiresAt: tokens.expires_at }
}
