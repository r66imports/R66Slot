import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-session'

/**
 * Blanket authentication gate for /api/admin/*.
 *
 * There are ~130 admin routes and gating them one file at a time is how they
 * ended up open — only customer-accounts and mail-settings had any check at all,
 * leaving contacts, products (including PUT) and the one-time
 * auth/reset-password backdoor reachable by anyone. So the default here is
 * closed, and the exceptions live in one place.
 *
 * Each exception is pinned to the method the storefront actually needs, so a
 * public GET on /api/admin/products does not also reopen PUT on it. Anything not
 * listed requires a valid admin-session cookie.
 */
type PublicRule = {
  path: string
  /** Also match nested paths, e.g. /api/admin/products/<id>. */
  prefix?: boolean
  methods: string[]
}

const PUBLIC_ROUTES: PublicRule[] = [
  // The login screen itself — these run before a session can exist.
  { path: '/api/admin/auth/login', methods: ['POST'] },
  { path: '/api/admin/auth/logout', methods: ['POST'] },
  { path: '/api/admin/auth/check', methods: ['GET'] },

  // Storefront reads. GET only.
  // products: catalogue grid, product detail, cart stock refresh, header search.
  { path: '/api/admin/products', prefix: true, methods: ['GET'] },
  // site-rules: the product grid reads the show-stock toggle.
  { path: '/api/admin/site-rules', methods: ['GET'] },

  // Sage OAuth redirect. Sage sends the browser here with ?code=, and a bare
  // code is worth nothing without the client secret held server-side.
  { path: '/api/admin/sage/callback', methods: ['GET'] },
]

function isPublic(pathname: string, method: string): boolean {
  return PUBLIC_ROUTES.some((rule) => {
    const pathMatches = rule.prefix
      ? pathname === rule.path || pathname.startsWith(`${rule.path}/`)
      : pathname === rule.path
    return pathMatches && rule.methods.includes(method)
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.method === 'OPTIONS') return NextResponse.next()
  if (isPublic(pathname, request.method)) return NextResponse.next()

  const session = verifyAdminSession(request.cookies.get('admin-session')?.value)
  if (session) return NextResponse.next()

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export const config = {
  matcher: '/api/admin/:path*',
}
