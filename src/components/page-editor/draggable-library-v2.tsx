'use client'

import { useDraggable } from '@dnd-kit/core'
import type { PageComponent } from '@/lib/pages/schema'
import { COMPONENT_LIBRARY } from './component-library'
import { usePageEditor } from '@/contexts/PageEditorContext'

export function DraggableLibrary() {
  const { addComponent } = usePageEditor()

  const basicComponents = COMPONENT_LIBRARY.filter(c =>
    ['heading', 'text', 'button', 'image', 'spacer', 'divider'].includes(c.type)
  )

  const layoutComponents = COMPONENT_LIBRARY.filter(c =>
    ['section', 'two-column', 'three-column', 'card', 'hero'].includes(c.type)
  )

  const contentComponents = COMPONENT_LIBRARY.filter(c =>
    ['quote', 'icon-text', 'video', 'gallery'].includes(c.type)
  )

  return (
    <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-primary/5 to-primary/10">
        <h3 className="font-bold mb-1 text-lg flex items-center gap-2">
          <span className="text-2xl">🎨</span>
          <span>Components</span>
        </h3>
        <p className="text-xs text-gray-600">
          Click to add or drag to position
        </p>
      </div>

      <div className="p-4">
        {/* Basic Components */}
        <ComponentSection
          title="Basic"
          icon="📝"
          description="Essential building blocks"
          components={basicComponents}
          onAdd={addComponent}
        />

        {/* Layout Components */}
        <ComponentSection
          title="Layout"
          icon="📐"
          description="Structure your page"
          components={layoutComponents}
          onAdd={addComponent}
        />

        {/* Content Components */}
        <ComponentSection
          title="Content"
          icon="🎬"
          description="Rich media elements"
          components={contentComponents}
          onAdd={addComponent}
        />
      </div>

      {/* Help Section */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <span>💡</span>
          <span>Quick Tips</span>
        </h4>
        <ul className="text-xs text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Click</strong> to add at the bottom</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Drag</strong> for precise positioning</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Double-click</strong> to edit text</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Select</strong> to customize styles</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">•</span>
            <span><strong>Ctrl+Z</strong> to undo changes</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

interface ComponentSectionProps {
  title: string
  icon: string
  description: string
  components: typeof COMPONENT_LIBRARY
  onAdd: (type: PageComponent['type']) => void
}

function ComponentSection({
  title,
  icon,
  description,
  components,
  onAdd,
}: ComponentSectionProps) {
  return (
    <div className="mb-6">
      <div className="mb-3">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 mb-1">
          <span className="text-base">{icon}</span>
          {title}
        </h4>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="space-y-2">
        {components.map((component) => (
          <DraggableComponentItem
            key={component.type}
            component={component}
            onClick={() => onAdd(component.type)}
          />
        ))}
      </div>
    </div>
  )
}

interface DraggableComponentItemProps {
  component: typeof COMPONENT_LIBRARY[0]
  onClick: () => void
}

function DraggableComponentItem({ component, onClick }: DraggableComponentItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `new-${component.type}`,
    data: {
      type: component.type,
      isNew: true,
    },
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group relative w-full p-3 text-left border-2 border-gray-200 rounded-lg
        transition-all cursor-pointer select-none
        hover:bg-primary/5 hover:border-primary hover:shadow-md
        active:scale-95
        ${isDragging ? 'opacity-50 scale-95 z-50' : ''}
      `}
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg group-hover:from-primary/20 group-hover:to-primary/30 transition-colors">
          <span className="text-xl">{component.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 group-hover:text-black">
            {component.label}
          </div>
          <div className="text-xs text-gray-500 group-hover:text-gray-700 truncate">
            {getComponentDescription(component.type)}
          </div>
        </div>
        <div className="text-gray-400 group-hover:text-primary transition-colors">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <circle cx="5" cy="5" r="1.5"/>
            <circle cx="15" cy="5" r="1.5"/>
            <circle cx="5" cy="10" r="1.5"/>
            <circle cx="15" cy="10" r="1.5"/>
            <circle cx="5" cy="15" r="1.5"/>
            <circle cx="15" cy="15" r="1.5"/>
          </svg>
        </div>
      </div>

      {/* Ripple effect on hover */}
      <div className="absolute inset-0 rounded-lg bg-primary opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"></div>
    </div>
  )
}

function getComponentDescription(type: PageComponent['type']): string {
  const descriptions: Record<string, string> = {
    heading: 'Large title or heading',
    text: 'Paragraph or body text',
    button: 'Call-to-action button',
    image: 'Image or photo',
    spacer: 'Vertical spacing',
    divider: 'Horizontal separator',
    section: 'Container section',
    'two-column': '2-column grid layout',
    'three-column': '3-column grid layout',
    card: 'Card with content',
    hero: 'Hero banner section',
    quote: 'Blockquote or testimonial',
    'icon-text': 'Icon with description',
    video: 'Embedded video',
    gallery: 'Image gallery grid',
  }
  return descriptions[type] || 'Custom component'
}
