'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Page, PageComponent, PageSettings } from '@/lib/pages/schema'

interface PageEditorContextType {
  // State
  page: Page | null
  selectedComponentId: string | null
  history: Page[]
  historyIndex: number
  isSaving: boolean

  // Actions
  setPage: (page: Page | null) => void
  setSelectedComponentId: (id: string | null) => void
  addComponent: (type: PageComponent['type'], index?: number) => void
  updateComponent: (id: string, updates: Partial<PageComponent>) => void
  deleteComponent: (id: string) => void
  duplicateComponent: (id: string) => void
  moveComponent: (id: string, direction: 'up' | 'down') => void
  reorderComponents: (fromIndex: number, toIndex: number) => void
  updatePageSettings: (settings: Partial<PageSettings>) => void
  undo: () => void
  redo: () => void
  savePage: (publish?: boolean) => Promise<boolean>
  loadPage: (pageId: string) => Promise<void>

  // Computed
  selectedComponent: PageComponent | null
  canUndo: boolean
  canRedo: boolean
}

const PageEditorContext = createContext<PageEditorContextType | undefined>(undefined)

export function usePageEditor() {
  const context = useContext(PageEditorContext)
  if (!context) {
    throw new Error('usePageEditor must be used within PageEditorProvider')
  }
  return context
}

interface PageEditorProviderProps {
  children: React.ReactNode
  componentLibrary: Array<{
    type: PageComponent['type']
    defaultProps: Partial<PageComponent>
  }>
}

export function PageEditorProvider({ children, componentLibrary }: PageEditorProviderProps) {
  const [page, setPage] = useState<Page | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [history, setHistory] = useState<Page[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSaving, setIsSaving] = useState(false)

  // Save to history
  const saveToHistory = useCallback((newPage: Page) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(JSON.parse(JSON.stringify(newPage)))

      // Keep only last 50 states
      if (newHistory.length > 50) {
        newHistory.shift()
      }

      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [historyIndex])

  // Initialize history when page loads
  useEffect(() => {
    if (page && history.length === 0) {
      saveToHistory(page)
    }
  }, [page?.id])

  // Add component
  const addComponent = useCallback((type: PageComponent['type'], index?: number) => {
    if (!page) return

    const template = componentLibrary.find(c => c.type === type)
    if (!template) return

    const newComponent: PageComponent = {
      id: `comp-${Date.now()}`,
      type,
      content: template.defaultProps.content || '',
      styles: template.defaultProps.styles || {},
      settings: template.defaultProps.settings || {},
      children: template.defaultProps.children || [],
    }

    const newComponents = [...page.components]
    if (index !== undefined) {
      newComponents.splice(index, 0, newComponent)
    } else {
      newComponents.push(newComponent)
    }

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
  }, [page, componentLibrary, saveToHistory])

  // Update component
  const updateComponent = useCallback((id: string, updates: Partial<PageComponent>) => {
    if (!page) return

    const newPage = {
      ...page,
      components: page.components.map(comp =>
        comp.id === id ? { ...comp, ...updates } : comp
      ),
    }

    setPage(newPage)
    saveToHistory(newPage)
  }, [page, saveToHistory])

  // Delete component
  const deleteComponent = useCallback((id: string) => {
    if (!page) return

    const newPage = {
      ...page,
      components: page.components.filter(comp => comp.id !== id),
    }

    setPage(newPage)
    saveToHistory(newPage)
    setSelectedComponentId(null)
  }, [page, saveToHistory])

  // Duplicate component
  const duplicateComponent = useCallback((id: string) => {
    if (!page) return

    const component = page.components.find(c => c.id === id)
    if (!component) return

    const duplicated: PageComponent = {
      ...component,
      id: `comp-${Date.now()}`,
      children: component.children?.map(child => ({
        ...child,
        id: `comp-${Date.now()}-${Math.random()}`,
      })),
    }

    const index = page.components.findIndex(c => c.id === id)
    const newComponents = [...page.components]
    newComponents.splice(index + 1, 0, duplicated)

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
    setSelectedComponentId(duplicated.id)
  }, [page, saveToHistory])

  // Move component
  const moveComponent = useCallback((id: string, direction: 'up' | 'down') => {
    if (!page) return

    const index = page.components.findIndex(c => c.id === id)
    if (index === -1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= page.components.length) return

    const newComponents = [...page.components]
    ;[newComponents[index], newComponents[targetIndex]] = [
      newComponents[targetIndex],
      newComponents[index],
    ]

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
  }, [page, saveToHistory])

  // Reorder components (for drag and drop)
  const reorderComponents = useCallback((fromIndex: number, toIndex: number) => {
    if (!page || fromIndex === toIndex) return

    const newComponents = [...page.components]
    const [removed] = newComponents.splice(fromIndex, 1)
    newComponents.splice(toIndex, 0, removed)

    const newPage = { ...page, components: newComponents }
    setPage(newPage)
    saveToHistory(newPage)
  }, [page, saveToHistory])

  // Update page-level settings
  const updatePageSettings = useCallback((settings: Partial<PageSettings>) => {
    if (!page) return

    const newPage = {
      ...page,
      pageSettings: { ...(page.pageSettings || {}), ...settings },
    }

    setPage(newPage)
    saveToHistory(newPage)
  }, [page, saveToHistory])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setPage(JSON.parse(JSON.stringify(history[historyIndex - 1])))
    }
  }, [history, historyIndex])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setPage(JSON.parse(JSON.stringify(history[historyIndex + 1])))
    }
  }, [history, historyIndex])

  // Save page
  const savePage = useCallback(async (publish: boolean = false) => {
    if (!page) return false

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...page,
          published: publish,
        }),
      })

      if (response.ok) {
        if (publish) {
          const updated = await response.json()
          setPage(updated)
        }
        return true
      } else {
        console.error('Failed to save page')
        return false
      }
    } catch (error) {
      console.error('Error saving page:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [page])

  // Load page
  const loadPage = useCallback(async (pageId: string) => {
    try {
      const response = await fetch(`/api/admin/pages/${pageId}`)
      if (response.ok) {
        const data = await response.json()
        setPage(data)
        setHistory([])
        setHistoryIndex(-1)
      }
    } catch (error) {
      console.error('Error loading page:', error)
    }
  }, [])

  // Computed values
  const selectedComponent = page?.components.find(c => c.id === selectedComponentId) || null
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const value: PageEditorContextType = {
    // State
    page,
    selectedComponentId,
    history,
    historyIndex,
    isSaving,

    // Actions
    setPage,
    setSelectedComponentId,
    addComponent,
    updateComponent,
    deleteComponent,
    duplicateComponent,
    moveComponent,
    reorderComponents,
    updatePageSettings,
    undo,
    redo,
    savePage,
    loadPage,

    // Computed
    selectedComponent,
    canUndo,
    canRedo,
  }

  return (
    <PageEditorContext.Provider value={value}>
      {children}
    </PageEditorContext.Provider>
  )
}
