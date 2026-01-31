import { notFound } from 'next/navigation'
import { getPageBySlug } from '@/lib/pages/storage'
import { ComponentRenderer } from '@/components/page-renderer/component-renderer'

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
            position: 'absolute',
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
            if (component.positionMode === 'absolute' && component.position) {
              const rotation = component.position.rotation || 0
              return (
                <div
                  key={component.id}
                  style={{
                    position: 'absolute',
                    left: component.position.x,
                    top: component.position.y,
                    width: component.position.width,
                    height: component.position.height,
                    zIndex: component.position.zIndex || 10,
                    transform: rotation ? `rotate(${rotation}deg)` : undefined,
                  }}
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
