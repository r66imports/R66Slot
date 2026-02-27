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
  onToggleHidden?: (id: string) => void
}

export function LayersPanel({ components, selectedComponentId, onSelect, onToggleHidden }: LayersPanelProps) {
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
            <div
              key={comp.id}
              className={`flex items-center gap-1 rounded-lg transition-colors ${
                selectedComponentId === comp.id
                  ? 'bg-blue-50 ring-1 ring-blue-300'
                  : 'hover:bg-gray-50'
              } ${comp.hidden ? 'opacity-50' : ''}`}
            >
              <button
                onClick={() => onSelect(comp.id)}
                className="flex-1 flex items-center gap-2.5 px-3 py-2 text-left min-w-0"
              >
                <span className="text-base flex-shrink-0 w-7 h-7 bg-gray-100 rounded flex items-center justify-center text-sm">
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium font-play capitalize truncate ${comp.hidden ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {label}
                  </p>
                  <p className="text-[10px] text-gray-400 font-play">
                    {isAbsolute ? 'Freeform' : 'Flow'}
                    {zIndex !== null && ` · z:${zIndex}`}
                    {comp.hidden ? ' · hidden' : ''}
                  </p>
                </div>
                {isAbsolute && (
                  <span className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-400" title="Freeform" />
                )}
              </button>
              {/* Eye toggle */}
              {onToggleHidden && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleHidden(comp.id) }}
                  title={comp.hidden ? 'Show' : 'Hide'}
                  className="flex-shrink-0 mr-2 p-1 rounded hover:bg-gray-200 transition-colors"
                >
                  {comp.hidden ? (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
