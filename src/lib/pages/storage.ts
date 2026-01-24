import fs from 'fs/promises'
import path from 'path'
import type { Page } from './schema'

const PAGES_DIR = path.join(process.cwd(), 'data', 'pages')

// Ensure pages directory exists
async function ensureDir() {
  try {
    await fs.access(PAGES_DIR)
  } catch {
    await fs.mkdir(PAGES_DIR, { recursive: true })
  }
}

export async function getAllPages(): Promise<Page[]> {
  await ensureDir()

  try {
    const files = await fs.readdir(PAGES_DIR)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))

    const pages = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(PAGES_DIR, file), 'utf-8')
        return JSON.parse(content) as Page
      })
    )

    return pages.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch {
    return []
  }
}

export async function getPageById(id: string): Promise<Page | null> {
  await ensureDir()

  try {
    const content = await fs.readFile(
      path.join(PAGES_DIR, `${id}.json`),
      'utf-8'
    )
    return JSON.parse(content)
  } catch {
    return null
  }
}

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const pages = await getAllPages()
  return pages.find((p) => p.slug === slug) || null
}

export async function createPage(data: Partial<Page>): Promise<Page> {
  await ensureDir()

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

  await fs.writeFile(
    path.join(PAGES_DIR, `${id}.json`),
    JSON.stringify(page, null, 2)
  )

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

  await fs.writeFile(
    path.join(PAGES_DIR, `${id}.json`),
    JSON.stringify(updated, null, 2)
  )

  return updated
}

export async function deletePage(id: string): Promise<boolean> {
  try {
    await fs.unlink(path.join(PAGES_DIR, `${id}.json`))
    return true
  } catch {
    return false
  }
}
