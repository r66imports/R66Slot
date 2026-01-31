'use client'

import type { PageComponent } from '@/lib/pages/schema'

const TYPE_ICONS: Record<string, string> = {
  text: '📝',
  image: '🏞️',
  button: '🔘',
  section: '📐',
  hero: '🖼️',
  heading: '📰',
  spacer: '↕️',
  'two-column': '▤',
  'three-column': '▥',
  card: '🃏',
  video: '🎬',
  divider: '─',
  quote: '❝',
  'icon-text': '💬',
  gallery: '🖼️',
  'product-grid': '🛍️',
  'product-card': '🏷️',
  'product-carousel': '🎠',
  'featured-product': '⭐',
  'add-to-cart': '🛒',
  'price-display': '💲',
  'content-block': '📄',
  'ui-component': '🧩',
  slot: '🔲',
  widget: '⚙️',
  media: '🎨',
}

interface LayersPanelProps {
  components: PageComponent[]
  selectedComponentId: string | null
  onSelect: (id: string) => void
}

export function LayersPanel({ components, selectedComponentId, onSelect }: LayersPanelProps) {
  // Sort: absolute components by z-index descending, then flow components in order
  const sorted = [...components].sort((a, b) => {
    const aAbs = a.positionMode === 'absolute'
    const bAbs = b.positionMode === 'absolute'
    if (aAbs && bAbs) {
      return (b.position?.zIndex || 10) - (a.position?.zIndex || 10)
    }
    if (aAbs) return -1
    if (bAbs) return 1
    return 0
  })

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
      {sorted.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-xs font-play">No components yet</p>
        </div>
      ) : (
        sorted.map((comp) => {
          const isAbsolute = comp.positionMode === 'absolute'
          const icon = TYPE_ICONS[comp.type] || '📦'
          const label = comp.type.replace(/-/g, ' ')
          const zIndex = isAbsolute ? (comp.position?.zIndex || 10) : null

          return (
            <button
              key={comp.id}
              onClick={() => onSelect(comp.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                selectedComponentId === comp.id
                  ? 'bg-blue-50 ring-1 ring-blue-300'
                  : 'hover:bg-gray-50'
              }`}
            >
              <span className="text-base flex-shrink-0 w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-sm">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 font-play capitalize truncate">
                  {label}
                </p>
                <p className="text-[10px] text-gray-400 font-play">
                  {isAbsolute ? 'Freeform' : 'Flow'}
                  {zIndex !== null && ` · z:${zIndex}`}
                  {isAbsolute && comp.position?.rotation ? ` · ${comp.position.rotation}°` : ''}
                </p>
              </div>
              {isAbsolute && (
                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-400" title="Freeform" />
              )}
            </button>
          )
        })
      )}
    </div>
  )
}
