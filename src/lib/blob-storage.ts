import { db } from '@/lib/db'

/**
 * JSON storage using Railway PostgreSQL (json_store table).
 * Drop-in replacement for the old Vercel Blob implementation.
 */

export async function blobRead<T = unknown>(key: string, fallback: T): Promise<T> {
  try {
    const result = await db.query('SELECT value FROM json_store WHERE key = $1', [key])
    if (result.rows.length === 0) return fallback
    return result.rows[0].value as T
  } catch (err: any) {
    console.error(`[blobRead] error reading "${key}":`, err?.message || err)
    return fallback
  }
}

export async function blobWrite(key: string, data: unknown): Promise<void> {
  await db.query(
    `INSERT INTO json_store (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(data)]
  )
}

export async function blobDelete(key: string): Promise<boolean> {
  try {
    const result = await db.query('DELETE FROM json_store WHERE key = $1', [key])
    return (result.rowCount ?? 0) > 0
  } catch {
    return false
  }
}

export async function blobList(prefix: string): Promise<string[]> {
  try {
    const result = await db.query(
      'SELECT key FROM json_store WHERE key LIKE $1 ORDER BY key',
      [prefix + '%']
    )
    return result.rows.map((r: any) => r.key)
  } catch {
    return []
  }
}

export async function blobListWithUrls(prefix: string): Promise<{ pathname: string; url: string }[]> {
  try {
    const result = await db.query(
      'SELECT key FROM json_store WHERE key LIKE $1 ORDER BY key',
      [prefix + '%']
    )
    return result.rows.map((r: any) => ({ pathname: r.key, url: r.key }))
  } catch (err: any) {
    console.error(`[blobListWithUrls] error listing "${prefix}":`, err?.message || err)
    return []
  }
}

export async function blobExists(key: string): Promise<boolean> {
  try {
    const result = await db.query('SELECT 1 FROM json_store WHERE key = $1', [key])
    return result.rows.length > 0
  } catch {
    return false
  }
}

// Media uploads now go through R2 — this is kept for compatibility but not used
export async function blobUploadFile(
  _key: string,
  _data: Buffer | ArrayBuffer | Uint8Array,
  _contentType: string
): Promise<string> {
  throw new Error('blobUploadFile is deprecated — use r2Upload from @/lib/r2-storage instead')
}
