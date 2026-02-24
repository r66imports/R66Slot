import { blobWrite, blobDelete } from '@/lib/blob-storage'
import {
  supaGetAllPages,
  supaGetPageById,
  supaGetPageBySlug,
  supaUpsertPage,
  supaDeletePage,
} from './supabase-storage'
import type { Page } from './schema'

const PAGES_PREFIX = 'data/pages/'

// All reads go directly to the pages table (Railway PostgreSQL via compat wrapper).
// Writes go to both json_store (blob) and the pages table for consistency.

export async function getAllPages(): Promise<Page[]> {
  try {
    return await supaGetAllPages()
  } catch (err: any) {
    console.error('[storage] getAllPages failed:', err?.message)
    return []
  }
}

export async function getPageById(id: string): Promise<Page | null> {
  try {
    return await supaGetPageById(id)
  } catch (err: any) {
    console.error('[storage] getPageById failed:', err?.message)
    return null
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  try {
    return await supaGetPageBySlug(slug)
  } catch (err: any) {
    console.error('[storage] getPageBySlug failed:', err?.message)
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

  // Write to json_store (best-effort backup)
  try {
    await blobWrite(`${PAGES_PREFIX}${id}.json`, page)
  } catch (err: any) {
    console.error('[storage] blob createPage failed:', err?.message)
  }

  // Write to pages table (primary)
  await supaUpsertPage(page)

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

  // Write to json_store (best-effort backup)
  try {
    await blobWrite(`${PAGES_PREFIX}${id}.json`, updated)
  } catch (err: any) {
    console.error('[storage] blob updatePage failed:', err?.message)
  }

  // Write to pages table (primary)
  await supaUpsertPage(updated)

  return updated
}

export async function deletePage(id: string): Promise<boolean> {
  // Delete from json_store (best-effort)
  try {
    await blobDelete(`${PAGES_PREFIX}${id}.json`)
  } catch {
    // ignore
  }

  return await supaDeletePage(id)
}
