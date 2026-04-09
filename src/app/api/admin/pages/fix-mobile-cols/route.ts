import { NextResponse } from 'next/server'
import { getAllPages, updatePage } from '@/lib/pages/storage'
import type { PageComponent } from '@/lib/pages/schema'

// Recursively walk a component tree and set gridColumnsMobile on all product-grid components
function applyMobileCols(component: PageComponent, cols: number): { component: PageComponent; changed: boolean } {
  let changed = false
  let updated = component

  if (component.type === 'product-grid') {
    if ((component.settings?.gridColumnsMobile as number) !== cols) {
      updated = { ...component, settings: { ...component.settings, gridColumnsMobile: cols } }
      changed = true
    }
  }

  if (updated.children && updated.children.length > 0) {
    const newChildren: PageComponent[] = []
    for (const child of updated.children) {
      const result = applyMobileCols(child, cols)
      newChildren.push(result.component)
      if (result.changed) changed = true
    }
    if (changed) updated = { ...updated, children: newChildren }
  }

  return { component: updated, changed }
}

// POST /api/admin/pages/fix-mobile-cols
// Body: { cols?: number } — defaults to 1
// Sets gridColumnsMobile on every product-grid component on every page
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const cols: number = typeof body.cols === 'number' ? body.cols : 1

    const pages = await getAllPages()
    let pagesUpdated = 0
    let gridsUpdated = 0

    for (const page of pages) {
      if (!page.components || page.components.length === 0) continue

      const newComponents: PageComponent[] = []
      let pageChanged = false

      for (const comp of page.components) {
        const result = applyMobileCols(comp, cols)
        newComponents.push(result.component)
        if (result.changed) {
          pageChanged = true
          // Count top-level product-grids (nested ones counted inside recursion)
          gridsUpdated++
        }
      }

      if (pageChanged) {
        await updatePage(page.id, { components: newComponents })
        pagesUpdated++
      }
    }

    return NextResponse.json({ ok: true, pagesUpdated, gridsUpdated })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to update pages' }, { status: 500 })
  }
}
