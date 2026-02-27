import { NextResponse } from 'next/server'
import { getAllPages, updatePage } from '@/lib/pages/storage'
import type { PageComponent } from '@/lib/pages/schema'

function stripHeaders(components: PageComponent[]): PageComponent[] {
  return components
    .filter((c) => c.type !== 'header')
    .map((c) => ({
      ...c,
      children: c.children ? stripHeaders(c.children) : c.children,
    }))
}

// POST /api/admin/pages/strip-headers
// One-time migration: removes embedded 'header' components from all pages
// (layout now provides the real DynamicHeader)
export async function POST() {
  try {
    const pages = await getAllPages()
    let updated = 0

    for (const page of pages) {
      const hasHeader = page.components.some((c) => c.type === 'header')
      if (!hasHeader) continue

      const cleaned = stripHeaders(page.components)
      await updatePage(page.id, { components: cleaned })
      updated++
    }

    return NextResponse.json({ success: true, pagesUpdated: updated })
  } catch (error: any) {
    console.error('strip-headers error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
