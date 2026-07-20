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

const CRITICAL_KEYS = new Set([
  'data/preorder-dashboard.json',
  'data/order-documents.json',
  'data/contacts.json',
  'data/customers.json',
])

export async function blobWrite(key: string, data: unknown, options?: { force?: boolean }): Promise<void> {
  const isCritical = CRITICAL_KEYS.has(key)

  if (!options?.force && Array.isArray(data) && data.length === 0 && isCritical) {
    const cur = await db.query('SELECT value FROM json_store WHERE key = $1', [key])
    if (cur.rows.length > 0) {
      const existingArr = Array.isArray(cur.rows[0].value) ? cur.rows[0].value : []
      if (existingArr.length > 0) {
        throw new Error(
          `[blobWrite] SAFETY BLOCK: refusing to overwrite ${existingArr.length} items with [] for "${key}". Pass { force: true } to override.`
        )
      }
    }
  }

  if (!options?.force && Array.isArray(data) && isCritical) {
    const cur = await db.query('SELECT value FROM json_store WHERE key = $1', [key])
    if (cur.rows.length > 0) {
      const existingArr = Array.isArray(cur.rows[0].value) ? cur.rows[0].value : []
      if (existingArr.length >= 10 && data.length < existingArr.length * 0.2) {
        throw new Error(
          `[blobWrite] SAFETY BLOCK: new array has ${data.length} items vs current ${existingArr.length}. Pass { force: true } to override.`
        )
      }
    }
  }

  if (isCritical) {
    try {
      await db.query(
        `INSERT INTO json_store (key, value, updated_at)
         SELECT $2, value, NOW() FROM json_store WHERE key = $1
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, `backup/${key}`]
      )
    } catch (e: any) {
      console.warn(`[blobWrite] backup failed for "${key}":`, e?.message)
    }
  }

  await db.query(
    `INSERT INTO json_store (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(data)]
  )
}

export async function blobRestore(key: string): Promise<{ restored: boolean; itemCount: number }> {
  const backupKey = `backup/${key}`
  const backup = await db.query('SELECT value FROM json_store WHERE key = $1', [backupKey])
  if (!backup.rows.length) return { restored: false, itemCount: 0 }
  await db.query(
    `INSERT INTO json_store (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, JSON.stringify(backup.rows[0].value)]
  )
  const val = backup.rows[0].value
  return { restored: true, itemCount: Array.isArray(val) ? val.length : 1 }
}

export async function blobAppendArrayItem(key: string, item: unknown): Promise<void> {
  await db.query(
    `INSERT INTO json_store (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = COALESCE(json_store.value, '[]'::jsonb) || $2::jsonb,
           updated_at = NOW()`,
    [key, JSON.stringify([item])]
  )
}

export async function blobReplaceArrayItem(key: string, id: string, item: unknown): Promise<void> {
  await db.query(
    `UPDATE json_store
     SET value = (
       SELECT jsonb_agg(CASE WHEN elem->>'id' = $2 THEN $3::jsonb ELSE elem END)
       FROM jsonb_array_elements(value) elem
     ), updated_at = NOW()
     WHERE key = $1`,
    [key, id, JSON.stringify(item)]
  )
}

export async function blobRemoveArrayItem(key: string, id: string): Promise<void> {
  await db.query(
    `UPDATE json_store
     SET value = COALESCE((
       SELECT jsonb_agg(elem) FROM jsonb_array_elements(value) elem WHERE elem->>'id' != $2
     ), '[]'::jsonb), updated_at = NOW()
     WHERE key = $1`,
    [key, id]
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
