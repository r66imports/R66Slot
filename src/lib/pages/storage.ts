import { blobRead, blobWrite, blobDelete, blobListWithUrls } from '@/lib/blob-storage'
import {
  supaGetAllPages,
  supaGetPageById,
  supaGetPageBySlug,
  supaUpsertPage,
  supaDeletePage,
} from './supabase-storage'
import type { Page } from './schema'

const PAGES_PREFIX = 'data/pages/'
const SLUG_INDEX_KEY = 'data/pages/_slug-index.json'

// Slug index maps slug -> page id for O(1) lookups
type SlugIndex = Record<string, string>

export async function getAllPages(): Promise<Page[]> {
  try {
    const urls = await blobListWithUrls(PAGES_PREFIX)
    const jsonEntries = urls.filter(
      (e) => e.pathname.endsWith('.json') && !e.pathname.endsWith('_slug-index.json')
    )

    const pages = await Promise.all(
      jsonEntries.map(async (entry) => {
        try {
          const response = await fetch(entry.url, { cache: 'no-store' })
          if (!response.ok) return null
          return (await response.json()) as Page
        } catch {
          return null
        }
      })
    )

    const result = pages
      .filter((p): p is Page => p !== null)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

    if (result.length > 0) return result
    // Blob returned empty (possibly blocked) — fall through to Supabase
  } catch {
    // Blob list failed entirely
  }

  // ---- Supabase fallback ----
  try {
    console.log('[storage] blob getAllPages failed/empty, falling back to Supabase')
    return await supaGetAllPages()
  } catch (err: any) {
    console.error('[storage] Supabase fallback getAllPages failed:', err?.message)
    return []
  }
}

export async function getPageById(id: string): Promise<Page | null> {
  try {
    const page = await blobRead<Page | null>(`${PAGES_PREFIX}${id}.json`, null)
    if (page) return page
  } catch {
    // blob read failed
  }

  // ---- Supabase fallback ----
  try {
    return await supaGetPageById(id)
  } catch (err: any) {
    console.error('[storage] Supabase fallback getPageById failed:', err?.message)
    return null
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  // Try slug index + blob first
  try {
    const index = await blobRead<SlugIndex>(SLUG_INDEX_KEY, {})
    if (index[slug]) {
      const page = await getPageById(index[slug])
      if (page && page.slug === slug) return page
    }
    // Fallback: scan all (which itself falls back to Supabase)
    const pages = await getAllPages()
    const found = pages.find((p) => p.slug === slug) || null

    // Rebuild slug index (best-effort)
    if (pages.length > 0) {
      const newIndex: SlugIndex = {}
      for (const p of pages) newIndex[p.slug] = p.id
      await blobWrite(SLUG_INDEX_KEY, newIndex).catch(() => {})
    }

    if (found) return found
  } catch {
    // blob path failed entirely
  }

  // ---- Direct Supabase slug lookup ----
  try {
    return await supaGetPageBySlug(slug)
  } catch (err: any) {
    console.error('[storage] Supabase fallback getPageBySlug failed:', err?.message)
    return null
  }
}

export async function createPage(data: Partial<Page>): Promise<Page> {
  const id = Date.now().toString()
  const now = new Date().toISOString()

  const page: Page = {
    id,
    title: data.title || 'Untitled Page',
    slug: data.slug || `page-${id}`,
    published: data.published || false,
    components: data.components || [],
    seo: data.seo || {
      metaTitle: data.title || 'Untitled Page',
      metaDescription: '',
      metaKeywords: '',
    },
    createdAt: now,
    updatedAt: now,
  }

  // Write to blob (best-effort)
  try {
    await blobWrite(`${PAGES_PREFIX}${id}.json`, page)
    const index = await blobRead<SlugIndex>(SLUG_INDEX_KEY, {})
    index[page.slug] = page.id
    await blobWrite(SLUG_INDEX_KEY, index).catch(() => {})
  } catch (err: any) {
    console.error('[storage] blob createPage failed:', err?.message)
  }

  // Dual-write to Supabase
  try {
    await supaUpsertPage(page)
  } catch (err: any) {
    console.error('[storage] Supabase createPage failed:', err?.message)
  }

  return page
}

export async function updatePage(
  id: string,
  data: Partial<Page>
): Promise<Page | null> {
  const existing = await getPageById(id)
  if (!existing) return null

  const updated: Page = {
    ...existing,
    ...data,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }

  // Write to blob (best-effort)
  try {
    await blobWrite(`${PAGES_PREFIX}${id}.json`, updated)
    const index = await blobRead<SlugIndex>(SLUG_INDEX_KEY, {})
    if (existing.slug !== updated.slug) delete index[existing.slug]
    index[updated.slug] = updated.id
    await blobWrite(SLUG_INDEX_KEY, index).catch(() => {})
  } catch (err: any) {
    console.error('[storage] blob updatePage failed:', err?.message)
  }

  // Dual-write to Supabase
  try {
    await supaUpsertPage(updated)
  } catch (err: any) {
    console.error('[storage] Supabase updatePage failed:', err?.message)
  }

  return updated
}

export async function deletePage(id: string): Promise<boolean> {
  let blobResult = false
  try {
    blobResult = await blobDelete(`${PAGES_PREFIX}${id}.json`)
  } catch {
    // blob delete failed
  }

  let supaResult = false
  try {
    supaResult = await supaDeletePage(id)
  } catch (err: any) {
    console.error('[storage] Supabase deletePage failed:', err?.message)
  }

  return blobResult || supaResult
}
