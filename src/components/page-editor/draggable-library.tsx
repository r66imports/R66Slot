'use client'

import { useState } from 'react'
import type { PageComponent } from '@/lib/pages/schema'
import { COMPONENT_LIBRARY } from './component-library'

interface DraggableLibraryProps {
  onAddComponent: (type: PageComponent['type']) => void
}

export function DraggableLibrary({ onAddComponent }: DraggableLibraryProps) {
  const [draggedType, setDraggedType] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, componentType: PageComponent['type']) => {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('componentType', componentType)
    setDraggedType(componentType)
  }

  const handleDragEnd = () => {
    setDraggedType(null)
  }

  const handleClick = (componentType: PageComponent['type']) => {
    onAddComponent(componentType)
  }

  const basicElements = COMPONENT_LIBRARY.filter(c =>
    ['heading', 'text', 'button', 'image', 'spacer', 'divider'].includes(c.type)
  )

  const layoutElements = COMPONENT_LIBRARY.filter(c =>
    ['section', 'strip', 'box', 'columns', 'card', 'hero', 'banner'].includes(c.type)
  )

  const contentElements = COMPONENT_LIBRARY.filter(c =>
    ['quote', 'icon-text', 'video', 'gallery'].includes(c.type)
  )

  const storeElements = COMPONENT_LIBRARY.filter(c =>
    ['product-grid', 'product-card', 'product-carousel', 'featured-product', 'add-to-cart', 'price-display'].includes(c.type)
  )

  return (
    <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto p-4">
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-lg flex items-center gap-2">
          <span>🎨</span>
          Add Elements
        </h3>
        <p className="text-xs text-gray-500">
          Drag & drop or click to add
        </p>
      </div>

      {/* Basic Elements */}
      <ComponentSection
        title="Basic"
        icon="📝"
        components={basicElements}
        draggedType={draggedType}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      />

      {/* Layout Elements */}
      <ComponentSection
        title="Layout"
        icon="📐"
        components={layoutElements}
        draggedType={draggedType}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      />

      {/* Content Elements */}
      <ComponentSection
        title="Content"
        icon="🎬"
        components={contentElements}
        draggedType={draggedType}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      />

      {/* Store Elements */}
      <ComponentSection
        title="Store"
        icon="🛍️"
        components={storeElements}
        draggedType={draggedType}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
      />

      {/* Help Text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-sm mb-2">💡 Quick Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Drag elements to canvas</li>
          <li>• Double-click to edit text</li>
          <li>• Click to select & style</li>
          <li>• Drag to reorder elements</li>
        </ul>
      </div>
    </div>
  )
}

function ComponentSection({
  title,
  icon,
  components,
  draggedType,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  title: string
  icon: string
  components: typeof COMPONENT_LIBRARY
  draggedType: string | null
  onDragStart: (e: React.DragEvent, type: PageComponent['type']) => void
  onDragEnd: () => void
  onClick: (type: PageComponent['type']) => void
}) {
  return (
    <div className="mb-6">
      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h4>
      <div className="space-y-2">
        {components.map((component) => (
          <div
            key={component.type}
            draggable
            onDragStart={(e) => onDragStart(e, component.type)}
            onDragEnd={onDragEnd}
            onClick={() => onClick(component.type)}
            className={`
              group relative w-full p-3 text-left border border-gray-200 rounded-lg
              transition-all cursor-grab active:cursor-grabbing
              hover:bg-primary hover:text-black hover:border-primary hover:shadow-md
              ${draggedType === component.type ? 'opacity-50 scale-95' : 'opacity-100'}
            `}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded group-hover:bg-black/10 transition-colors">
                <span className="text-lg">{component.icon}</span>
              </div>
              <div>
                <span className="font-medium text-sm block">{component.label}</span>
                <span className="text-xs text-gray-500 group-hover:text-black/60">
                  {getComponentDescription(component.type)}
                </span>
              </div>
            </div>

            {/* Drag indicator */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-gray-400">
                <circle cx="4" cy="4" r="1"/>
                <circle cx="12" cy="4" r="1"/>
                <circle cx="4" cy="8" r="1"/>
                <circle cx="12" cy="8" r="1"/>
                <circle cx="4" cy="12" r="1"/>
                <circle cx="12" cy="12" r="1"/>
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getComponentDescription(type: PageComponent['type']): string {
  const descriptions: Record<string, string> = {
    heading: 'Large title text',
    text: 'Paragraph text',
    button: 'Clickable button',
    image: 'Image element',
    spacer: 'Vertical space',
    divider: 'Horizontal line',
    section: 'Container block',
    strip: 'Full-width strip',
    box: 'Image container',
    banner: 'Promotional banner',
    columns: '1-4 column layout',
    card: 'Content card',
    hero: 'Hero banner',
    quote: 'Blockquote',
    'icon-text': 'Icon with text',
    video: 'Video embed',
    gallery: 'Image grid',
    'product-grid': 'Product listing',
    'product-card': 'Product card',
    'product-carousel': 'Product slider',
    'featured-product': 'Featured product',
    'add-to-cart': 'Cart button',
    'price-display': 'Price tag',
  }
  return descriptions[type] || 'Element'
}
