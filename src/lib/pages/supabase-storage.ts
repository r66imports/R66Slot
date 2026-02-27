import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { Page } from './schema'

// Convert DB row (snake_case) -> Page object (camelCase)
function rowToPage(row: any): Page {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    published: row.published,
    isWebsitePage: row.is_website_page ?? undefined,
    components: row.components ?? [],
    pageSettings: row.page_settings ?? undefined,
    seo: row.seo ?? { metaTitle: '', metaDescription: '', metaKeywords: '' },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Convert Page object -> DB row for insert/update
// JSONB fields must be JSON.stringified — node-postgres treats plain JS arrays
// as PostgreSQL arrays (not JSON), which fails for JSONB columns.
function pageToRow(page: Page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    published: page.published,
    is_website_page: page.isWebsitePage ?? false,
    components: JSON.stringify(page.components ?? []),
    page_settings: JSON.stringify(page.pageSettings ?? {}),
    seo: JSON.stringify(page.seo ?? {}),
    created_at: page.createdAt,
    updated_at: page.updatedAt,
  }
}

export async function supaGetAllPages(): Promise<Page[]> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('pages')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(rowToPage)
}

export async function supaGetPageById(id: string): Promise<Page | null> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('pages')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data ? rowToPage(data) : null
}

export async function supaGetPageBySlug(slug: string): Promise<Page | null> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data ? rowToPage(data) : null
}

export async function supaUpsertPage(page: Page): Promise<void> {
  const sb = getSupabaseAdmin()
  const { error } = await sb
    .from('pages')
    .upsert(pageToRow(page), { onConflict: 'id' })

  if (error) throw error
}

export async function supaDeletePage(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin()
  const { error, count } = await sb
    .from('pages')
    .delete({ count: 'exact' })
    .eq('id', id)

  if (error) throw error
  return (count ?? 0) > 0
}
