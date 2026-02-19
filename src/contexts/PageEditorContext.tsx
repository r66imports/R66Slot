'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import type { Page, PageComponent, PageSettings } from '@/lib/pages/schema'

interface PageEditorContextType {
  // State
  page: Page | null
  selectedComponentId: string | null
  history: Page[]
  historyIndex: number
  isSaving: boolean
  loadError: string | null
  hasUnsavedChanges: boolean

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
  dismissRecovery: () => void

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

const AUTOSAVE_DELAY = 30_000 // 30 seconds
const BACKUP_KEY_PREFIX = 'r66editor-backup-'

function getBackupKey(pageId: string) {
  return `${BACKUP_KEY_PREFIX}${pageId}`
}

export function PageEditorProvider({ children, componentLibrary }: PageEditorProviderProps) {
  const [page, setPage] = useState<Page | null>(null)
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null)
  const [history, setHistory] = useState<Page[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedJsonRef = useRef<string>('')

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

  // ─── localStorage backup on every page change ───
  useEffect(() => {
    if (!page) return
    try {
      const json = JSON.stringify(page)
      localStorage.setItem(getBackupKey(page.id), json)
      localStorage.setItem(`${getBackupKey(page.id)}-ts`, Date.now().toString())
    } catch {
      // localStorage may be full or unavailable
    }
  }, [page])

  // ─── Track unsaved changes ───
  useEffect(() => {
    if (!page) return
    const currentJson = JSON.stringify(page)
    if (lastSavedJsonRef.current && currentJson !== lastSavedJsonRef.current) {
      setHasUnsavedChanges(true)
    }
  }, [page])

  // ─── Auto-save after inactivity ───
  useEffect(() => {
    if (!hasUnsavedChanges || !page) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      if (!page) return
      console.log('[r66editor] auto-saving...')
      const success = await savePageInternal(false)
      if (success) console.log('[r66editor] auto-save complete')
    }, AUTOSAVE_DELAY)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [hasUnsavedChanges, page])

  // ─── Warn before closing with unsaved changes ───
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Dismiss recovery backup
  const dismissRecovery = useCallback(() => {
    if (page) {
      try { localStorage.removeItem(getBackupKey(page.id)) } catch {}
      try { localStorage.removeItem(`${getBackupKey(page.id)}-ts`) } catch {}
    }
  }, [page])

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
      // preserve positionMode/position from template if provided
      positionMode: (template.defaultProps as any).positionMode || 'flow',
      position: (template.defaultProps as any).position,
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

  // Internal save (used by auto-save, doesn't show alerts)
  const savePageInternal = useCallback(async (publish: boolean = false) => {
    if (!page) return false

    setIsSaving(true)
    try {
      const payload = {
        ...page,
        published: publish ? true : page.published,
      }

      const jsonBody = JSON.stringify(payload)

      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
      })

      if (response.ok) {
        const updated = await response.json()
        setPage(updated)
        lastSavedJsonRef.current = JSON.stringify(updated)
        setHasUnsavedChanges(false)
        // Clear localStorage backup on successful save
        try { localStorage.removeItem(getBackupKey(page.id)) } catch {}
        try { localStorage.removeItem(`${getBackupKey(page.id)}-ts`) } catch {}
        return true
      } else {
        let errorMsg = `Save failed (${response.status})`
        try {
          const err = await response.json()
          errorMsg = err.error || err.details || errorMsg
        } catch {}
        console.error('Failed to save page:', errorMsg)
        return false
      }
    } catch (error: any) {
      console.error('Error saving page:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [page])

  // Save page (user-facing, shows alerts)
  const savePage = useCallback(async (publish: boolean = false) => {
    if (!page) return false

    setIsSaving(true)
    try {
      const payload = {
        ...page,
        published: publish ? true : page.published,
      }

      const jsonBody = JSON.stringify(payload)

      const response = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
      })

      if (response.ok) {
        const updated = await response.json()
        setPage(updated)
        lastSavedJsonRef.current = JSON.stringify(updated)
        setHasUnsavedChanges(false)
        // Clear localStorage backup on successful save
        try { localStorage.removeItem(getBackupKey(page.id)) } catch {}
        try { localStorage.removeItem(`${getBackupKey(page.id)}-ts`) } catch {}
        return true
      } else {
        let errorMsg = `Save failed (${response.status})`
        try {
          const err = await response.json()
          errorMsg = err.error || err.details || errorMsg
        } catch {}
        console.error('Failed to save page:', errorMsg)
        alert(`Save failed: ${errorMsg}`)
        return false
      }
    } catch (error: any) {
      console.error('Error saving page:', error)
      alert(`Save error: ${error?.message || 'Network error — check your connection'}`)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [page])

  // Load page with retry + localStorage crash recovery
  const loadPage = useCallback(async (pageId: string) => {
    setLoadError(null)
    const MAX_RETRIES = 3

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(`/api/admin/pages/${pageId}`, { cache: 'no-store' })
        if (response.ok) {
          const data = await response.json()

          // Check for localStorage backup that's newer
          let useBackup = false
          try {
            const backupJson = localStorage.getItem(getBackupKey(pageId))
            const backupTs = localStorage.getItem(`${getBackupKey(pageId)}-ts`)
            if (backupJson && backupTs) {
              const backup = JSON.parse(backupJson) as Page
              const backupTime = parseInt(backupTs)
              const serverTime = new Date(data.updatedAt).getTime()
              // If backup is newer than server data by more than 5 seconds AND has components
              if (backupTime > serverTime + 5000 && backup.components?.length > 0) {
                const backupDate = new Date(backupTime).toLocaleString()
                if (window.confirm(
                  `Unsaved changes from ${backupDate} were found.\n\nRestore them? (Cancel to discard and use the saved version)`
                )) {
                  setPage(backup)
                  setHasUnsavedChanges(true)
                  useBackup = true
                } else {
                  // User chose to discard - clear backup
                  localStorage.removeItem(getBackupKey(pageId))
                  localStorage.removeItem(`${getBackupKey(pageId)}-ts`)
                }
              } else {
                // Backup is stale, clean up
                localStorage.removeItem(getBackupKey(pageId))
                localStorage.removeItem(`${getBackupKey(pageId)}-ts`)
              }
            }
          } catch {
            // Ignore localStorage errors
          }

          if (!useBackup) {
            setPage(data)
            setHasUnsavedChanges(false)
          }
          lastSavedJsonRef.current = JSON.stringify(data)
          setHistory([])
          setHistoryIndex(-1)
          return
        }
        // On last attempt, show the error
        if (attempt === MAX_RETRIES) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }))
          setLoadError(err.error || `Failed to load page (${response.status})`)
          return
        }
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          console.error('Error loading page:', error)
          setLoadError('Network error — could not reach the server')
          return
        }
      }
      // Wait before retrying (500ms, 1000ms)
      await new Promise(r => setTimeout(r, attempt * 500))
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
    loadError,
    hasUnsavedChanges,

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
    dismissRecovery,

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
