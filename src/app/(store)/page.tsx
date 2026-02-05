import { ComponentRenderer } from '@/components/page-renderer/component-renderer'
import { getPageById } from '@/lib/pages/storage'
import type { PageSettings } from '@/lib/pages/schema'
import { getPositionStyles } from '@/lib/editor/position-migration'

// Force dynamic rendering so edits from the admin editor appear immediately
export const dynamic = 'force-dynamic'

// Editor design canvas dimensions - freeform positions are relative to these
const DESIGN_CANVAS = { width: 1200, height: 800 }

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

    // Check if we have a hero as the first component
    const hasHero = flowComponents.length > 0 && flowComponents[0].type === 'hero'

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
              backgroundImage: `url("${ps.backgroundImage}")`,
              backgroundSize: ps.fullWidth ? 'cover' : (ps.backgroundSize || 'cover'),
              backgroundPosition: ps.backgroundPosition || 'center',
              backgroundRepeat: 'no-repeat',
              opacity: typeof ps.backgroundOpacity === 'number' ? ps.backgroundOpacity : 1,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        {/* Content with freeform overlay container */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* If we have a hero, render it in a container with freeform elements */}
          {hasHero && absoluteComponents.length > 0 ? (
            <>
              {/* Hero section with freeform overlay */}
              <div style={{ position: 'relative' }}>
                {/* Hero component */}
                <ComponentRenderer key={flowComponents[0].id} component={flowComponents[0]} />

                {/* Freeform elements positioned over the hero */}
                {/* Using aspect-ratio container to match editor canvas proportions */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: 'none',
                  }}
                >
                  {absoluteComponents.map((component: any) => {
                    const positionStyles = getPositionStyles(component, 'desktop')
                    return (
                      <div
                        key={component.id}
                        style={{
                          ...positionStyles,
                          pointerEvents: 'auto',
                        }}
                      >
                        <ComponentRenderer component={component} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Remaining flow components */}
              {flowComponents.slice(1).map((component: any) => (
                <ComponentRenderer key={component.id} component={component} />
              ))}
            </>
          ) : (
            <>
              {/* No hero or no freeform elements - render normally */}
              {flowComponents.map((component: any) => (
                <ComponentRenderer key={component.id} component={component} />
              ))}

              {/* Freeform elements at page level */}
              {absoluteComponents.map((component: any) => {
                const positionStyles = getPositionStyles(component, 'desktop')
                return (
                  <div
                    key={component.id}
                    style={positionStyles}
                  >
                    <ComponentRenderer component={component} />
                  </div>
                )
              })}
            </>
          )}
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
