import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/pages/storage'
import { ComponentRenderer } from '@/components/page-renderer/component-renderer'
import { getPositionStyles } from '@/lib/editor/position-migration'

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  // Try loading from editor pages (frontend-about, frontend-contact, etc.)
  const page =
    (await getPageBySlug(slug)) ??
    (await (async () => {
      // Also try the frontend-prefixed page IDs
      const { getPageById } = await import('@/lib/pages/storage')
      return await getPageById(`frontend-${slug}`)
    })())

  if (!page) {
    notFound()
  }

  const ps = page.pageSettings || {}

  return (
    <div
      style={{
        backgroundColor: ps.backgroundColor || '#ffffff',
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      {ps.backgroundImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundImage: `url("${ps.backgroundImage}")`,
            backgroundSize: ps.backgroundSize || 'cover',
            backgroundPosition: ps.backgroundPosition || 'center',
            backgroundRepeat: 'no-repeat',
            opacity: typeof ps.backgroundOpacity === 'number' ? ps.backgroundOpacity : 1,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {page.components.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-gray-400">
            <p className="text-lg">This page is empty</p>
          </div>
        ) : (
          page.components.map((component) => {
            if (component.positionMode === 'absolute') {
              // Use getPositionStyles to properly handle both normalized (percentage)
              // and legacy (pixel) position formats
              const positionStyles = getPositionStyles(component, 'desktop')
              return (
                <div
                  key={component.id}
                  style={positionStyles}
                >
                  <ComponentRenderer component={component} />
                </div>
              )
            }
            return <ComponentRenderer key={component.id} component={component} />
          })
        )}
      </div>
    </div>
  )
}
