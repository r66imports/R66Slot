'use client'

import type { PageComponent } from '@/lib/pages/schema'
import { PAGE_TEMPLATES, FULL_PAGE_TEMPLATES, type PageTemplate, type FullPageTemplate } from './page-templates'

interface TemplateChooserProps {
  open: boolean
  onClose: () => void
  onSelect: (components: PageComponent[]) => void
}

function regenerateIds(components: PageComponent[]): PageComponent[] {
  return components.map((comp, idx) => ({
    ...comp,
    id: `comp-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    children: comp.children?.map((child, cidx) => ({
      ...child,
      id: `child-${Date.now()}-${idx}-${cidx}-${Math.random().toString(36).slice(2, 6)}`,
      children: child.children?.map((gc, gcidx) => ({
        ...gc,
        id: `gc-${Date.now()}-${idx}-${cidx}-${gcidx}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    })),
  }))
}

export function TemplateChooser({ open, onClose, onSelect }: TemplateChooserProps) {
  if (!open) return null

  const handleSelectSection = (template: PageTemplate) => {
    const components = regenerateIds(template.components)
    onSelect(components)
    onClose()
  }

  const handleSelectFullPage = (template: FullPageTemplate) => {
    const components = regenerateIds(template.components)
    onSelect(components)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 font-play">Choose a Template</h2>
            <p className="text-sm text-gray-500 font-play mt-0.5">Start with a pre-built layout or section</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Full Page Templates */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 font-play">Full Page Templates</h3>
            <div className="grid grid-cols-3 gap-4">
              {FULL_PAGE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectFullPage(template)}
                  className="group text-left bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-xl p-4 transition-all"
                >
                  <div className="text-3xl mb-2">{template.icon}</div>
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 font-play">
                    {template.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 font-play">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {template.sections.map((section) => (
                      <span key={section} className="text-[10px] bg-gray-200 group-hover:bg-blue-100 text-gray-600 px-1.5 py-0.5 rounded font-play">
                        {section}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section Templates */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 font-play">Section Templates</h3>
            <div className="grid grid-cols-4 gap-3">
              {PAGE_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectSection(template)}
                  className="group text-left bg-gray-50 hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-400 rounded-lg p-3 transition-all"
                >
                  <div className="text-2xl mb-1.5">{template.icon}</div>
                  <h4 className="text-xs font-semibold text-gray-900 group-hover:text-blue-700 font-play">
                    {template.name}
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-play">{template.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
