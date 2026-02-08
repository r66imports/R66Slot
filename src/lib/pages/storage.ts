import { blobRead, blobWrite, blobDelete, blobListWithUrls } from '@/lib/blob-storage'
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

    return pages
      .filter((p): p is Page => p !== null)
      .sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
  } catch {
    return []
  }
}

export async function getPageById(id: string): Promise<Page | null> {
  try {
    return await blobRead<Page | null>(`${PAGES_PREFIX}${id}.json`, null)
  } catch {
    return null
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  // Try slug index first for O(1) lookup
  const index = await blobRead<SlugIndex>(SLUG_INDEX_KEY, {})
  if (index[slug]) {
    const page = await getPageById(index[slug])
    if (page && page.slug === slug) return page
  }
  // Fallback: scan all pages (and rebuild index)
  const pages = await getAllPages()
  const newIndex: SlugIndex = {}
  for (const p of pages) {
    newIndex[p.slug] = p.id
  }
  await blobWrite(SLUG_INDEX_KEY, newIndex).catch(() => {})
  return pages.find((p) => p.slug === slug) || null
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

  await blobWrite(`${PAGES_PREFIX}${id}.json`, page)
  // Update slug index
  const index = await blobRead<SlugIndex>(SLUG_INDEX_KEY, {})
  index[page.slug] = page.id
  await blobWrite(SLUG_INDEX_KEY, index).catch(() => {})
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

  await blobWrite(`${PAGES_PREFIX}${id}.json`, updated)
  // Update slug index (handle slug changes)
  const index = await blobRead<SlugIndex>(SLUG_INDEX_KEY, {})
  if (existing.slug !== updated.slug) {
    delete index[existing.slug]
  }
  index[updated.slug] = updated.id
  await blobWrite(SLUG_INDEX_KEY, index).catch(() => {})
  return updated
}

export async function deletePage(id: string): Promise<boolean> {
  return await blobDelete(`${PAGES_PREFIX}${id}.json`)
}
