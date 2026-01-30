import { ComponentRenderer } from '@/components/page-renderer/component-renderer'
import { getPageById } from '@/lib/pages/storage'
import type { PageSettings } from '@/lib/pages/schema'

// Force dynamic rendering so edits from the admin editor appear immediately
export const dynamic = 'force-dynamic'

async function getHomepageData() {
  return await getPageById('frontend-homepage')
}

export default async function HomePage() {
  const homepageData = await getHomepageData()

  // If we have stored homepage data, render it dynamically
  if (homepageData && homepageData.components) {
    const ps: PageSettings = homepageData.pageSettings || {}
    const flowComponents = homepageData.components.filter((c: any) => c.positionMode !== 'absolute')
    const absoluteComponents = homepageData.components.filter((c: any) => c.positionMode === 'absolute')

    return (
      <div
        style={{
          backgroundColor: ps.backgroundColor || '#ffffff',
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        {/* Page background image */}
        {ps.backgroundImage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundImage: `url(${ps.backgroundImage})`,
              backgroundSize: ps.fullWidth ? 'cover' : (ps.backgroundSize || 'cover'),
              backgroundPosition: ps.backgroundPosition || 'center',
              backgroundRepeat: 'no-repeat',
              opacity: typeof ps.backgroundOpacity === 'number' ? ps.backgroundOpacity : 1,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Flow components */}
          {flowComponents.map((component: any) => (
            <ComponentRenderer key={component.id} component={component} />
          ))}

          {/* Absolute/freeform components */}
          {absoluteComponents.map((component: any) => {
            const pos = component.position || { x: 0, y: 0, zIndex: 10 }
            return (
              <div
                key={component.id}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  zIndex: pos.zIndex || 10,
                }}
              >
                <ComponentRenderer component={component} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Fallback to default homepage (shouldn't happen after setup)
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to R66SLOT</h1>
        <p className="text-gray-600">Homepage is being configured...</p>
      </div>
    </div>
  )
}
