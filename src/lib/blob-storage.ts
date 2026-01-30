import { put, list, del, head } from '@vercel/blob'

/**
 * Cloud storage utility using Vercel Blob.
 * Replaces all local filesystem (fs) read/write operations.
 * Works in both development and production on Vercel.
 */

// Read a JSON file from blob storage
export async function blobRead<T = unknown>(key: string, fallback: T): Promise<T> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    const match = blobs.find(b => b.pathname === key)
    if (!match) return fallback

    const response = await fetch(match.url, { cache: 'no-store' })
    if (!response.ok) return fallback

    const text = await response.text()
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

// Write a JSON file to blob storage
export async function blobWrite(key: string, data: unknown): Promise<void> {
  await put(key, JSON.stringify(data, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

// Delete a file from blob storage
export async function blobDelete(key: string): Promise<boolean> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    const match = blobs.find(b => b.pathname === key)
    if (!match) return false
    await del(match.url)
    return true
  } catch {
    return false
  }
}

// List all files with a given prefix
export async function blobList(prefix: string): Promise<string[]> {
  try {
    const { blobs } = await list({ prefix, limit: 1000 })
    return blobs.map(b => b.pathname)
  } catch {
    return []
  }
}

// Check if a blob exists
export async function blobExists(key: string): Promise<boolean> {
  try {
    const { blobs } = await list({ prefix: key, limit: 1 })
    return blobs.some(b => b.pathname === key)
  } catch {
    return false
  }
}

// Upload a binary file (for media uploads)
export async function blobUploadFile(
  key: string,
  data: Buffer | ArrayBuffer,
  contentType: string
): Promise<string> {
  const blob = await put(key, data, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
  })
  return blob.url
}
