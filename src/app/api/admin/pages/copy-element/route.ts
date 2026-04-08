import { NextResponse } from 'next/server'
import { getPageById, updatePage } from '@/lib/pages/storage'
import type { PageComponent } from '@/lib/pages/schema'

// Deep-clone a component with fresh IDs for all nodes
function deepCloneWithNewIds(component: PageComponent): PageComponent {
  return {
    ...component,
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    children: component.children?.map(deepCloneWithNewIds),
  }
}

// POST /api/admin/pages/copy-element
// Body: { component: PageComponent, pageIds: string[] }
// Appends the component (with fresh IDs) to the end of each target page
export async function POST(request: Request) {
  try {
    const { component, pageIds } = await request.json()

    if (!component || !Array.isArray(pageIds) || pageIds.length === 0) {
      return NextResponse.json({ error: 'component and pageIds are required' }, { status: 400 })
    }

    const results: { pageId: string; pageTitle: string; success: boolean; error?: string }[] = []

    for (const pageId of pageIds) {
      try {
        const page = await getPageById(pageId)
        if (!page) {
          results.push({ pageId, pageTitle: pageId, success: false, error: 'Page not found' })
          continue
        }

        const cloned = deepCloneWithNewIds(component)
        const updatedComponents = [...(page.components || []), cloned]

        await updatePage(pageId, { components: updatedComponents })
        results.push({ pageId, pageTitle: page.title, success: true })
      } catch (err: any) {
        results.push({ pageId, pageTitle: pageId, success: false, error: err?.message || 'Unknown error' })
      }
    }

    return NextResponse.json({ results })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to copy element' }, { status: 500 })
  }
}
