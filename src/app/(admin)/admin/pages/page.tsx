'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Page } from '@/lib/pages/schema'

const FRONTEND_PAGES = [
  { id: 'homepage',  title: 'Homepage',  slug: '',        icon: '🏠' },
  { id: 'products',  title: 'Products',  slug: 'products', icon: '🛍️' },
  { id: 'about',     title: 'About',     slug: 'about',    icon: 'ℹ️' },
  { id: 'contact',   title: 'Contact',   slug: 'contact',  icon: '📧' },
  { id: 'book-now',  title: 'Book Now',  slug: 'book',     icon: '📋' },
]

type PageGroup = 'isWebsitePage' | 'isRevoPage' | 'isPioneerPage' | 'isSidewaysPage' | 'isBrmPage'

const BRAND_SECTIONS: { key: PageGroup; label: string }[] = [
  { key: 'isWebsitePage',  label: 'NSR Pages'      },
  { key: 'isRevoPage',     label: 'Revo Pages'     },
  { key: 'isPioneerPage',  label: 'Pioneer Pages'  },
  { key: 'isSidewaysPage', label: 'Sideways Pages' },
  { key: 'isBrmPage',      label: 'BRM Pages'      },
]

// ─── Inline Editable Title ─────────────────────────────────────────────────
// Single click → navigate to editor  |  Double click → rename inline
function InlineEditableTitle({
  value, onSave, onSingleClick, className,
}: {
  value: string
  onSave: (v: string) => void
  onSingleClick?: () => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const inputRef   = useRef<HTMLInputElement>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (editing) { inputRef.current?.focus(); inputRef.current?.select() }
  }, [editing])

  // Cleanup timer on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const commit = () => {
    const t = draft.trim()
    if (t && t !== value) onSave(t)
    else setDraft(value)
    setEditing(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (timerRef.current) {
      // Second click within 300ms → double click → rename
      clearTimeout(timerRef.current)
      timerRef.current = null
      setEditing(true)
      return
    }
    // First click → wait to see if double click follows
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      onSingleClick?.()
    }, 280)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter')  commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className={`${className} border border-blue-400 rounded px-1 outline-none focus:ring-1 focus:ring-blue-500 bg-white w-full max-w-xs`}
        onClick={e => e.stopPropagation()}
      />
    )
  }

  return (
    <span
      onClick={handleClick}
      className={`${className} cursor-pointer hover:text-blue-600 select-none`}
      title="Click to edit • Double-click to rename"
    >
      {value}
    </span>
  )
}

// ─── Drag Handle Icon ──────────────────────────────────────────────────────
function DragHandle() {
  return (
    <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
      <circle cx="5" cy="4" r="1.2" />
      <circle cx="5" cy="8" r="1.2" />
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="11" cy="4" r="1.2" />
      <circle cx="11" cy="8" r="1.2" />
      <circle cx="11" cy="12" r="1.2" />
    </svg>
  )
}

// ─── Page Row ─────────────────────────────────────────────────────────────
interface PageRowProps {
  page: Page
  isDragging: boolean
  isDragOver: boolean
  onDragStart:       (e: React.DragEvent, id: string) => void
  onDragOver:        (e: React.DragEvent, id: string) => void
  onDrop:            (e: React.DragEvent, id: string) => void
  onDragEnd:         () => void
  onRename:          (id: string, title: string) => void
  onDuplicate:       (page: Page) => void
  onDelete:          (id: string) => void
  onToggleGroup:     (pageId: string, group: PageGroup) => void
  onTogglePublished: (id: string) => void
  togglingIds:       Set<string>
}

function PageRow({
  page, isDragging, isDragOver,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onRename, onDuplicate, onDelete, onToggleGroup, onTogglePublished, togglingIds,
}: PageRowProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [menuOpen])

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, page.id)}
      onDragOver={e => { e.preventDefault(); onDragOver(e, page.id) }}
      onDrop={e => onDrop(e, page.id)}
      onDragEnd={onDragEnd}
      className={[
        'group flex items-center gap-2 px-3 py-2 border-b border-gray-100 transition-colors',
        'hover:bg-blue-50',
        isDragging ? 'opacity-30 bg-blue-50' : '',
        isDragOver ? 'border-t-2 border-t-blue-500 bg-blue-50/50' : '',
      ].join(' ')}
    >
      <DragHandle />
      <span className="text-sm select-none flex-shrink-0">📄</span>
      <div className="flex-1 min-w-0">
        <InlineEditableTitle
          value={page.title}
          onSave={title => onRename(page.id, title)}
          onSingleClick={() => { window.location.href = `/admin/pages/editor/${page.id}` }}
          className="text-sm font-medium text-gray-800 block truncate"
        />
        <span className="text-xs text-gray-400 truncate block">/{page.slug}</span>
      </div>

      {/* Green/Red visibility dot — always visible, click to toggle */}
      <button
        onClick={() => onTogglePublished(page.id)}
        className={[
          'w-3 h-3 rounded-full flex-shrink-0 transition-colors ring-offset-1',
          'hover:ring-2',
          page.published
            ? 'bg-green-500 hover:bg-green-600 hover:ring-green-300'
            : 'bg-red-500 hover:bg-red-600 hover:ring-red-300',
        ].join(' ')}
        title={page.published ? 'Live — click to hide' : 'Hidden — click to show'}
      />

      {/* ··· menu */}
      <div className="relative flex-shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-700 select-none text-sm leading-none"
          title="Page options"
        >
          •••
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-7 z-50 bg-white border border-gray-200 rounded-lg shadow-xl py-1 min-w-[190px]">
            <Link
              href={`/admin/pages/editor/${page.id}`}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              ✏️ Edit Page
            </Link>
            {page.published && (
              <Link
                href={`/${page.slug}`}
                target="_blank"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                👁 View Live ↗
              </Link>
            )}
            <button
              onClick={() => { onTogglePublished(page.id); setMenuOpen(false) }}
              className={`flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${page.published ? 'text-orange-600' : 'text-green-600'}`}
            >
              {page.published ? '🙈 Hide Page' : '👁 Show Page'}
            </button>
            <button
              onClick={() => { onDuplicate(page); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              📋 Copy Page
            </button>

            <div className="border-t border-gray-100 mt-1">
              <p className="px-4 pt-2 pb-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">Sections</p>
            </div>
            {BRAND_SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => { onToggleGroup(page.id, s.key); setMenuOpen(false) }}
                disabled={togglingIds.has(page.id)}
                className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <span className={[
                  'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 text-xs',
                  page[s.key] ? 'bg-gray-800 border-gray-800 text-white' : 'border-gray-300',
                ].join(' ')}>
                  {page[s.key] ? '✓' : ''}
                </span>
                {s.label}
              </button>
            ))}

            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => { onDelete(page.id); setMenuOpen(false) }}
              className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              🗑 Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────
function SectionHeader({
  label, count, collapsed, onToggle, onAdd,
}: {
  label: string
  count: number
  collapsed: boolean
  onToggle: () => void
  onAdd?: () => void
}) {
  return (
    <div className="bg-gray-50 border-b border-gray-200 flex items-center">
      <button
        onClick={onToggle}
        className="flex-1 flex items-center justify-between px-3 py-2.5 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label} <span className="font-normal text-gray-400">({count})</span>
        </span>
        <span className={[
          'w-5 h-5 rounded border flex items-center justify-center text-sm font-bold flex-shrink-0',
          collapsed ? 'border-gray-400 text-gray-600' : 'border-gray-300 text-gray-500',
        ].join(' ')}>
          {collapsed ? '+' : '−'}
        </span>
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          className="px-3 py-2.5 text-xs text-blue-600 hover:text-blue-700 font-medium border-l border-gray-200 hover:bg-blue-50 transition-colors"
        >
          + Add
        </button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function PagesManagementPage() {
  const [customPages,   setCustomPages]   = useState<Page[]>([])
  const [isLoading,     setIsLoading]     = useState(true)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [togglingIds,   setTogglingIds]   = useState<Set<string>>(new Set())

  // Collapsible sections — key → collapsed boolean, persisted in localStorage
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Per-section page order — key → array of page IDs, persisted in localStorage
  const [sectionOrders, setSectionOrders] = useState<Record<string, string[]>>({})

  // Drag state
  const [draggedId,  setDraggedId]  = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomPages()
    try {
      const c = localStorage.getItem('admin_pages_collapsed_v2')
      if (c) setCollapsed(JSON.parse(c))
      const o = localStorage.getItem('admin_pages_section_orders_v2')
      if (o) setSectionOrders(JSON.parse(o))
    } catch {}
  }, [])

  const fetchCustomPages = async () => {
    try {
      const res = await fetch('/api/admin/pages', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCustomPages(Array.isArray(data) ? data : [])
      }
    } catch {}
    finally { setIsLoading(false) }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  const toggleSection = (key: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem('admin_pages_collapsed_v2', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const getSortedPages = (pages: Page[], sectionKey: string): Page[] => {
    const order = sectionOrders[sectionKey] ?? []
    return [...pages].sort((a, b) => {
      const ai = order.indexOf(a.id)
      const bi = order.indexOf(b.id)
      if (ai === -1 && bi === -1) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (ai === -1) return 1
      if (bi === -1) return -1
      return ai - bi
    })
  }

  const saveSectionOrder = (sectionKey: string, ids: string[]) => {
    setSectionOrders(prev => {
      const next = { ...prev, [sectionKey]: ids }
      try { localStorage.setItem('admin_pages_section_orders_v2', JSON.stringify(next)) } catch {}
      return next
    })
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== dragOverId) setDragOverId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string, sectionPages: Page[], sectionKey: string) => {
    e.preventDefault()
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return }

    const ids = sectionPages.map(p => p.id)
    const from = ids.indexOf(draggedId)
    const to   = ids.indexOf(targetId)
    if (from === -1 || to === -1) { setDraggedId(null); setDragOverId(null); return }

    const newIds = [...ids]
    newIds.splice(from, 1)
    newIds.splice(to, 0, draggedId)
    saveSectionOrder(sectionKey, newIds)

    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null) }

  // ── Page Actions ─────────────────────────────────────────────────────────

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const newSlug = newTitle.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
        .replace(/-+/g, '-').replace(/^-|-$/g, '')
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle, slug: newSlug }),
      })
      if (res.ok) {
        const updated = await res.json()
        setCustomPages(prev => prev.map(p => p.id === id ? { ...p, title: updated.title, slug: updated.slug } : p))
      }
    } catch {}
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this page?')) return
    try {
      const res = await fetch(`/api/admin/pages/${id}`, { method: 'DELETE' })
      if (res.ok) setCustomPages(prev => prev.filter(p => p.id !== id))
    } catch {}
  }

  const handleDuplicatePage = async (page: Page) => {
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${page.title} (Copy)`,
          slug: `${page.slug}-copy-${Date.now()}`,
          published: false,
          components: page.components,
          pageSettings: page.pageSettings,
          seo: {
            metaTitle:       `${page.seo?.metaTitle || page.title} (Copy)`,
            metaDescription: page.seo?.metaDescription || '',
            metaKeywords:    page.seo?.metaKeywords || '',
          },
        }),
      })
      if (res.ok) {
        const newPage = await res.json()
        setCustomPages(prev => [...prev, newPage])
      }
    } catch {}
  }

  const handleCreatePage = async () => {
    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Page', slug: `page-${Date.now()}`, published: false, components: [] }),
      })
      if (res.ok) {
        const newPage = await res.json()
        window.location.href = `/admin/pages/editor/${newPage.id}`
      }
    } catch {}
  }

  const handleTogglePublished = async (id: string) => {
    const page = customPages.find(p => p.id === id)
    if (!page) return
    const newValue = !page.published
    setCustomPages(prev => prev.map(p => p.id === id ? { ...p, published: newValue } : p))
    try {
      const res = await fetch(`/api/admin/pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: newValue }),
      })
      if (!res.ok) setCustomPages(prev => prev.map(p => p.id === id ? { ...p, published: !newValue } : p))
    } catch {
      setCustomPages(prev => prev.map(p => p.id === id ? { ...p, published: !newValue } : p))
    }
  }

  const handleToggleGroup = async (pageId: string, group: PageGroup) => {
    const page = customPages.find(p => p.id === pageId)
    if (!page || togglingIds.has(pageId)) return
    const newValue = !page[group]
    setCustomPages(prev => prev.map(p => p.id === pageId ? { ...p, [group]: newValue } : p))
    setTogglingIds(prev => new Set(prev).add(pageId))
    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [group]: newValue }),
      })
      if (!res.ok) setCustomPages(prev => prev.map(p => p.id === pageId ? { ...p, [group]: !newValue } : p))
    } catch {
      setCustomPages(prev => prev.map(p => p.id === pageId ? { ...p, [group]: !newValue } : p))
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(pageId); return n })
    }
  }

  // ── Search ───────────────────────────────────────────────────────────────

  const normalizeSearch = (q: string) => {
    let s = q.trim().toLowerCase()
    try { s = new URL(s).pathname.replace(/^\//, '').replace(/\/$/, '') }
    catch { s = s.replace(/^\/+/, '').replace(/\/$/, '') }
    return s
  }

  const allSearchable = [
    ...FRONTEND_PAGES.map(p => ({ id: p.id, title: p.title, slug: p.slug, icon: p.icon, type: 'frontend' as const })),
    ...customPages.map(p => ({ id: p.id, title: p.title, slug: p.slug, icon: '📄', type: 'custom' as const })),
  ]

  const normalizedQuery  = normalizeSearch(searchQuery)
  const searchResults    = searchQuery.trim()
    ? allSearchable.filter(p =>
        p.slug.toLowerCase().includes(normalizedQuery) ||
        p.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : []

  const unassigned = getSortedPages(
    customPages.filter(p => !BRAND_SECTIONS.some(s => p[s.key])),
    'custom'
  )

  // ── Common row props factory ──────────────────────────────────────────────

  const rowProps = (page: Page, sectionPages: Page[], sectionKey: string) => ({
    page,
    isDragging:    draggedId === page.id,
    isDragOver:    dragOverId === page.id && draggedId !== page.id,
    onDragStart:   handleDragStart,
    onDragOver:    handleDragOver,
    onDrop:        (e: React.DragEvent, targetId: string) => handleDrop(e, targetId, sectionPages, sectionKey),
    onDragEnd:     handleDragEnd,
    onRename:          handleRename,
    onDuplicate:       handleDuplicatePage,
    onDelete:          handleDelete,
    onToggleGroup:     handleToggleGroup,
    onTogglePublished: handleTogglePublished,
    togglingIds,
  })

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400 text-sm">Loading pages…</div>
  }

  return (
    <div className="max-w-2xl">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Pages</h1>
          <p className="text-gray-400 text-xs mt-0.5">Drag ⠿ to reorder • Double-click a title to rename</p>
        </div>
        <button
          onClick={handleCreatePage}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Page
        </button>
      </div>


      {/* Search */}
      <div className="mb-5 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search pages by name or URL…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Search results overlay */}
      {searchQuery.trim() && (
        <div className="mb-6 border border-gray-200 rounded-lg shadow-lg overflow-hidden bg-white">
          <div className="px-3 py-2 bg-gray-50 border-b text-xs text-gray-500">
            {searchResults.length} page{searchResults.length !== 1 ? 's' : ''} found
          </div>
          {searchResults.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">No pages found for "{searchQuery}"</div>
          ) : (
            searchResults.map(p => (
              <div key={`${p.type}-${p.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span>{p.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.title}</p>
                    <p className="text-xs text-gray-400">/{p.slug || 'home'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={p.slug ? `/${p.slug}` : '/'} target="_blank" className="px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">View</Link>
                  <Link
                    href={p.type === 'frontend' ? `/admin/pages/editor/frontend-${p.id}` : `/admin/pages/editor/${p.id}`}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pages List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">

        {/* ── Site Menu (static frontend pages) ── */}
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-2.5">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Site Menu</span>
        </div>
        {FRONTEND_PAGES.map(p => (
          <div key={p.id} className="group flex items-center gap-2 px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 transition-colors">
            <span className="w-4 flex-shrink-0" /> {/* spacer for drag handle column */}
            <span className="text-sm select-none flex-shrink-0">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-800 truncate block">{p.title}</span>
              <span className="text-xs text-gray-400 block">/{p.slug || 'home'}</span>
            </div>
            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" title="Always live" />
            <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href={p.slug ? `/${p.slug}` : '/'} target="_blank" className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors">↗</Link>
              <Link href={`/admin/pages/editor/frontend-${p.id}`} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors">Edit</Link>
            </div>
          </div>
        ))}

        {/* ── Brand Sections ── */}
        {BRAND_SECTIONS.map(section => {
          const sectionPages = getSortedPages(customPages.filter(p => p[section.key]), section.key)
          const isCollapsed  = collapsed[section.key] ?? false
          return (
            <div key={section.key}>
              <SectionHeader
                label={section.label}
                count={sectionPages.length}
                collapsed={isCollapsed}
                onToggle={() => toggleSection(section.key)}
              />
              {!isCollapsed && (
                <>
                  {sectionPages.length === 0 ? (
                    <div className="px-8 py-3 border-b border-gray-100 text-xs text-gray-400 italic">
                      No pages in {section.label} — use ••• on any custom page to assign it here.
                    </div>
                  ) : (
                    sectionPages.map(page => (
                      <PageRow key={page.id} {...rowProps(page, sectionPages, section.key)} />
                    ))
                  )}
                </>
              )}
            </div>
          )
        })}

        {/* ── Custom / Unassigned Pages ── */}
        <div>
          <SectionHeader
            label="Custom Pages"
            count={unassigned.length}
            collapsed={collapsed['custom'] ?? false}
            onToggle={() => toggleSection('custom')}
            onAdd={handleCreatePage}
          />
          {!(collapsed['custom'] ?? false) && (
            <>
              {unassigned.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-400">No custom pages yet.</p>
                  <button onClick={handleCreatePage} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    Create your first custom page →
                  </button>
                </div>
              ) : (
                unassigned.map(page => (
                  <PageRow key={page.id} {...rowProps(page, unassigned, 'custom')} />
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Help tip */}
      <p className="mt-4 text-xs text-gray-400 text-center">
        🟢 Live &nbsp;•&nbsp; 🔴 Hidden &nbsp;•&nbsp; Click dot to toggle &nbsp;•&nbsp; Click title to edit &nbsp;•&nbsp; Double-click title to rename
      </p>
    </div>
  )
}
