import { put, list, del, head } from '@vercel/blob'

/**
 * Cloud storage utility using Vercel Blob.
 * Replaces all local filesystem (fs) read/write operations.
 * Works in both development and production on Vercel.
 */

// Read a JSON file from blob storage
export async function blobRead<T = unknown>(key: string, fallback: T): Promise<T> {
  try {
    const blob = await head(key)
    if (!blob) return fallback

    const response = await fetch(blob.url, { next: { revalidate: 5 } })
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
    const blob = await head(key)
    if (!blob) return false
    await del(blob.url)
    return true
  } catch {
    return false
  }
}

// List all files with a given prefix (pathnames only)
export async function blobList(prefix: string): Promise<string[]> {
  try {
    const { blobs } = await list({ prefix, limit: 1000 })
    return blobs.map(b => b.pathname)
  } catch {
    return []
  }
}

// List all files with a given prefix (pathnames + URLs for direct fetch)
export async function blobListWithUrls(prefix: string): Promise<{ pathname: string; url: string }[]> {
  try {
    const { blobs } = await list({ prefix, limit: 1000 })
    return blobs.map(b => ({ pathname: b.pathname, url: b.url }))
  } catch {
    return []
  }
}

// Check if a blob exists
export async function blobExists(key: string): Promise<boolean> {
  try {
    await head(key)
    return true
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
