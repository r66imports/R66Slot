/**
 * Admin session verification — shared by the /api/admin gate in middleware.ts.
 *
 * /api/admin/auth/login mints
 *     base64("<username>:<issuedAt ms>:<SESSION_SECRET>")
 * so verifying a session means decoding it and confirming the secret half is
 * this deployment's. Note what that is and is not: it is a shared secret, not a
 * signature. Anyone who learns SESSION_SECRET can mint an Admin session, so
 * rotating that variable is equivalent to revoking every admin login. It is
 * still a real check — the previous guards only asked whether the cookie
 * existed, which any value at all satisfied.
 */

// Same window the login route sets on the cookie.
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export type AdminSession = { username: string; issuedAt: number }

export function verifyAdminSession(token: string | undefined | null): AdminSession | null {
  if (!token) return null

  let raw: string
  try {
    // atob, not Buffer — this has to run in the Edge runtime as well as Node.
    raw = atob(token)
  } catch {
    return null
  }

  const firstColon = raw.indexOf(':')
  const secondColon = raw.indexOf(':', firstColon + 1)
  if (firstColon < 1 || secondColon < 0) return null

  const username = raw.slice(0, firstColon)
  const issuedAt = Number(raw.slice(firstColon + 1, secondColon))
  // Everything after the second colon is the secret — it may contain colons itself.
  const secret = raw.slice(secondColon + 1)

  if (!username || !Number.isFinite(issuedAt)) return null
  if (secret !== (process.env.SESSION_SECRET || 'dev-secret')) return null
  if (Date.now() - issuedAt > SESSION_MAX_AGE_MS) return null

  return { username, issuedAt }
}
