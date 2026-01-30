import { blobRead, blobWrite, blobDelete, blobList } from '@/lib/blob-storage'
import type { Page } from './schema'

const PAGES_PREFIX = 'data/pages/'

export async function getAllPages(): Promise<Page[]> {
  try {
    const files = await blobList(PAGES_PREFIX)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const pages = await Promise.all(
      jsonFiles.map(async (file) => {
        return await blobRead<Page>(file, null as unknown as Page)
      })
    )

    return pages
      .filter(Boolean)
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
  const pages = await getAllPages()
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
  return updated
}

export async function deletePage(id: string): Promise<boolean> {
  return await blobDelete(`${PAGES_PREFIX}${id}.json`)
}
