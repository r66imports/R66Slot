'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import HeroEditor from '@/components/page-editor/hero-editor'
import { PageEditorProvider, usePageEditor } from '@/contexts/PageEditorContext'
import { COMPONENT_LIBRARY } from '@/components/page-editor/component-library'
import { PAGE_TEMPLATES } from '@/components/page-editor/page-templates'
import { DraggableLibrary } from '@/components/page-editor/draggable-library-v2'
import { VisualCanvas } from '@/components/page-editor/visual-canvas-v2'
import { PropertiesPanel } from '@/components/page-editor/properties-panel'
import type { PageComponent } from '@/lib/pages/schema'

export default function PageEditorPageWrapper({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <PageEditorProvider componentLibrary={COMPONENT_LIBRARY}>
      <PageEditorPageContent params={params} />
    </PageEditorProvider>
  )
}

function PageEditorPageContent({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const {
    page,
    setPage,
    selectedComponent,
    canUndo,
    canRedo,
    isSaving,
    undo,
    redo,
    savePage,
    loadPage,
    addComponent,
  } = usePageEditor()

  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    const loadPageData = async () => {
      const resolvedParams = await params
      await loadPage(resolvedParams.id)
    }
    loadPageData()
  }, [params])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const handleSave = async (publish: boolean = false) => {
    const success = await savePage(publish)
    if (success) {
      alert(publish ? 'Page published successfully!' : 'Page saved successfully!')
    } else {
      alert('Failed to save page')
    }
  }

  const addTemplate = (templateId: string) => {
    if (!page) return

    const template = PAGE_TEMPLATES.find((t) => t.id === templateId)
    if (!template) return

    // Add all components from the template
    template.components.forEach((comp) => {
      const componentWithNewId: PageComponent = {
        ...comp,
        id: `comp-${Date.now()}-${Math.random()}`,
        children: comp.children?.map((child) => ({
          ...child,
          id: `comp-${Date.now()}-${Math.random()}`,
        })),
      }
      addComponent(comp.type)
    })

    setShowTemplates(false)
  }

  if (!page) {
    return (
      <div className="fixed inset-0 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-primary mb-4"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/pages')}
            className="hover:bg-gray-50"
          >
            ← Back to Pages
          </Button>
          <div className="border-l border-gray-300 h-8"></div>
          <div className="space-y-1">
            <Input
              value={page.title}
              onChange={(e) => setPage({ ...page, title: e.target.value })}
              className="font-bold text-lg border-0 px-2 py-1 focus:ring-2 focus:ring-primary rounded h-auto"
              placeholder="Page Title"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">URL:</span>
              <Input
                value={page.slug}
                onChange={(e) => setPage({ ...page, slug: e.target.value })}
                className="text-sm text-gray-600 border-0 px-2 py-0.5 focus:ring-2 focus:ring-primary rounded h-auto w-64"
                placeholder="page-slug"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="hover:bg-gray-50"
            >
              <span className="text-lg">↶</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="hover:bg-gray-50"
            >
              <span className="text-lg">↷</span>
            </Button>
          </div>

          <div className="border-l border-gray-300 h-8"></div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplates(true)}
            className="hover:bg-gray-50"
          >
            📋 Templates
          </Button>

          <div className="border-l border-gray-300 h-8"></div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="hover:bg-gray-50"
            >
              {isSaving ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                <>💾 Save Draft</>
              )}
            </Button>
            <HeroEditor />
            <Button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              size="lg"
              className="bg-primary text-black hover:bg-primary/90 font-bold px-6"
            >
              {page.published ? '✓ Update & Publish' : '🚀 Publish Page'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Component Library */}
        <DraggableLibrary />

        {/* Center - Visual Canvas */}
        <VisualCanvas components={page.components} />

        {/* Right Sidebar - Properties Panel */}
        {selectedComponent && <PropertiesPanel />}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-6">
          <span>
            {page.components.length} component{page.components.length !== 1 ? 's' : ''}
          </span>
          <span>•</span>
          <span>
            {page.published ? (
              <span className="flex items-center gap-1.5 text-green-600 font-medium">
                <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                Published
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-orange-600 font-medium">
                <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                Draft
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span>Last saved: {new Date(page.updatedAt).toLocaleTimeString()}</span>
          <span>•</span>
          <span className="font-medium">r66slot Page Editor v2.0</span>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowTemplates(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-5xl w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Page Templates</h2>
                <p className="text-gray-600 mt-1">Choose a pre-built section template to add to your page</p>
              </div>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-gray-500 hover:text-black text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Hero Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <span>Hero Sections</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'hero').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-5 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-3">{template.icon}</div>
                    <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Feature Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <span>Features</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'features').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-5 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-3">{template.icon}</div>
                    <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Content Templates */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <span>Content Sections</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'content').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-5 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-3">{template.icon}</div>
                    <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA Templates */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <span>Call to Action</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PAGE_TEMPLATES.filter((t) => t.category === 'cta').map((template) => (
                  <button
                    key={template.id}
                    onClick={() => addTemplate(template.id)}
                    className="text-left p-5 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 hover:shadow-lg transition-all group"
                  >
                    <div className="text-4xl mb-3">{template.icon}</div>
                    <h4 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                      {template.name}
                    </h4>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
