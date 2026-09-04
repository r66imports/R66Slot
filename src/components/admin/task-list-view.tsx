'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'

type TaskPriority = 'high' | 'medium' | 'low'
export type TaskListName = 'tasks' | 'sku-photo'

interface Task {
  id: string
  list: TaskListName
  title: string
  date: string // YYYY-MM-DD — the task line this item belongs to
  priority: TaskPriority
  sku: string
  productId: string
  productTitle: string
  brand: string
  supplier: string
  imageUrl: string
  note: string
  source: 'manual' | 'auto-no-image'
  createdAt: string
  completedAt: string | null
}

interface Supplier {
  id: string
  name: string
}

/** Lean product record from /api/admin/products?inventory=1 — used to match typed item codes */
interface ProductLite {
  id: string
  sku: string
  title: string
  imageUrl: string
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  high: 'bg-red-100 border-red-300',
  medium: 'bg-amber-100 border-amber-300',
  low: 'bg-gray-100 border-gray-300',
}

function toDateKey(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return todayKey()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateLabel(key: string) {
  if (key === todayKey()) return 'Today'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === toDateKey(yesterday.toISOString())) return 'Yesterday'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (key === toDateKey(tomorrow.toISOString())) return 'Tomorrow'
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  if (isNaN(dt.getTime())) return key
  return dt.toLocaleDateString('en-ZA', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function daysUntilGone(completedAt: string) {
  const elapsed = Date.now() - new Date(completedAt).getTime()
  return Math.max(0, Math.ceil(5 - elapsed / (1000 * 60 * 60 * 24)))
}

// Backfill fields added after the original task-list shipped
function normalize(t: any): Task {
  const priority: TaskPriority =
    t?.priority === 'high' || t?.priority === 'low' || t?.priority === 'medium' ? t.priority : 'medium'
  return {
    ...t,
    list: t?.list === 'sku-photo' || t?.list === 'tasks'
      ? t.list
      : t?.source === 'auto-no-image' ? 'sku-photo' : 'tasks',
    title: t?.title || t?.productTitle || '',
    date: t?.date || toDateKey(t?.createdAt),
    priority,
  }
}

// A typed task title can BE an item code ("LCD64037-CH") or contain one
// ("LCD64037-CH check qty") — match the whole title first, then each token.
function findProductForText(text: string, index: Map<string, ProductLite>) {
  if (index.size === 0) return null
  const raw = (text || '').trim()
  if (!raw) return null
  const direct = index.get(raw.toUpperCase())
  if (direct) return direct
  for (const token of raw.split(/[ ,;|]+/)) {
    const key = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').toUpperCase()
    if (key.length < 3 || !/[0-9]/.test(key)) continue
    const hit = index.get(key)
    if (hit) return hit
  }
  return null
}

function sortTasks(list: Task[]) {
  return [...list].sort((a, b) => {
    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1
    const w = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
    if (w !== 0) return w
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export default function TaskListView({
  list,
  title,
  subtitle,
  emptyHint,
  autoSyncNoImage = false,
  createLabel = 'Create Task',
}: {
  list: TaskListName
  title: string
  subtitle: string
  emptyHint: string
  /** Scan active products for missing images and add them to this list */
  autoSyncNoImage?: boolean
  createLabel?: string
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncCount, setSyncCount] = useState(0)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [productIndex, setProductIndex] = useState<Map<string, ProductLite>>(new Map())
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<'' | TaskPriority>('')

  // Whole task list is a drop down
  const [listOpen, setListOpen] = useState(true)
  const [closedDates, setClosedDates] = useState<Set<string>>(new Set())

  // Create task form (top of page)
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(todayKey())
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [creating, setCreating] = useState(false)

  // Inline "add line item" under a specific date task line
  const [addingForDate, setAddingForDate] = useState<string | null>(null)
  const [lineTitle, setLineTitle] = useState('')
  const [linePriority, setLinePriority] = useState<TaskPriority>('medium')

  // Load tasks + suppliers in parallel, then auto-sync no-image products
  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/task-list?list=${list}`).then(r => r.json()).catch(() => []),
      fetch('/api/admin/supplier-contacts').then(r => r.json()).catch(() => []),
      fetch('/api/admin/products?inventory=1').then(r => r.json()).catch(() => []),
    ]).then(([taskData, supplierData, productData]) => {
      const loaded = Array.isArray(taskData) ? taskData.map(normalize) : []
      setTasks(loaded)
      setSuppliers(Array.isArray(supplierData) ? supplierData : [])
      if (Array.isArray(productData)) {
        const index = new Map<string, ProductLite>()
        for (const p of productData as any[]) {
          const sku = (p?.sku || '').trim().toUpperCase()
          if (!sku || index.has(sku)) continue
          index.set(sku, { id: p.id, sku: p.sku || '', title: p.title || '', imageUrl: p.imageUrl || '' })
        }
        setProductIndex(index)
      }
      setLoading(false)
      if (autoSyncNoImage) autoSyncNoImageProducts(loaded)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, autoSyncNoImage])

  async function autoSyncNoImageProducts(existingTasks: Task[]) {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/products')
      if (!res.ok) return
      const products: any[] = await res.json()

      // Only active products with no image
      const noImage = products.filter((p: any) => {
        if (p.status !== 'active') return false
        const hasImage = (p.imageUrl && p.imageUrl.trim()) ||
          (Array.isArray(p.images) && p.images.length > 0)
        return !hasImage
      })

      // Find ones not already pending in this list
      const existingProductIds = new Set(
        existingTasks.filter(t => !t.completedAt).map(t => t.productId)
      )
      const toAdd = noImage.filter((p: any) => !existingProductIds.has(p.id))

      if (toAdd.length === 0) { setSyncing(false); return }

      // Add them in parallel (best-effort)
      const results = await Promise.all(
        toAdd.map((p: any) =>
          fetch('/api/admin/task-list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              list: 'sku-photo',
              title: p.title || '',
              date: todayKey(),
              priority: 'medium',
              sku: p.sku || '',
              productId: p.id,
              productTitle: p.title || '',
              brand: p.brand || '',
              supplier: p.supplier || '',
              imageUrl: '',
              note: 'Missing product image',
              source: 'auto-no-image',
            }),
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      )

      const added = results.filter(r => r?.task && !r.alreadyExists).map(r => normalize(r.task))
      if (added.length > 0) {
        setTasks(prev => [...added, ...prev])
        setSyncCount(added.length)
      }
    } finally {
      setSyncing(false)
    }
  }

  async function createTask(taskTitle: string, date: string, priority: TaskPriority) {
    const clean = taskTitle.trim()
    if (!clean) return false
    setCreating(true)
    try {
      const res = await fetch('/api/admin/task-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list,
          title: clean,
          date: date || todayKey(),
          priority,
          sku: '',
          productId: '',
          productTitle: '',
          brand: '',
          supplier: '',
          imageUrl: '',
          note: '',
          source: 'manual',
        }),
      })
      if (!res.ok) return false
      const data = await res.json()
      if (!data?.task) return false
      const task = normalize(data.task)
      setTasks(prev => [task, ...prev])
      // Make sure the task line it landed on is visible
      setListOpen(true)
      setClosedDates(prev => {
        const next = new Set(prev)
        next.delete(task.date)
        return next
      })
      return true
    } finally {
      setCreating(false)
    }
  }

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/task-list/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  async function toggleComplete(task: Task) {
    setTogglingId(task.id)
    const newCompletedAt = task.completedAt ? null : new Date().toISOString()
    try {
      const res = await fetch(`/api/admin/task-list/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt: newCompletedAt }),
      })
      if (res.ok) {
        setTasks(prev =>
          prev.map(t => t.id === task.id ? { ...t, completedAt: newCompletedAt } : t)
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function setPriority(taskId: string, priority: TaskPriority) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority } : t))
    await patchTask(taskId, { priority })
  }

  async function saveTitle(taskId: string, newValue: string) {
    await patchTask(taskId, { title: newValue })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, title: newValue } : t))
  }

  async function saveNote(taskId: string, note: string) {
    await patchTask(taskId, { note })
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, note } : t))
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Remove this task from the list?')) return
    await fetch(`/api/admin/task-list/${taskId}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      t.title?.toLowerCase().includes(q) ||
      t.sku?.toLowerCase().includes(q) ||
      t.productTitle?.toLowerCase().includes(q) ||
      t.brand?.toLowerCase().includes(q) ||
      t.note?.toLowerCase().includes(q)
    const matchSupplier = !selectedSupplier ||
      (t.supplier || '').toLowerCase() === selectedSupplier.toLowerCase()
    const matchPriority = !priorityFilter || t.priority === priorityFilter
    return matchSearch && matchSupplier && matchPriority
  })

  // Each date is a task line; its tasks are the line items
  const dateLines = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of filtered) {
      const key = t.date || toDateKey(t.createdAt)
      const bucket = map.get(key)
      if (bucket) bucket.push(t)
      else map.set(key, [t])
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({ date, items: sortTasks(items) }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, search, selectedSupplier, priorityFilter])

  const pending = filtered.filter(t => !t.completedAt)

  function toggleDate(date: string) {
    setClosedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  async function submitCreator(e: React.FormEvent) {
    e.preventDefault()
    const ok = await createTask(newTitle, newDate, newPriority)
    if (ok) {
      setNewTitle('')
      setNewPriority('medium')
    }
  }

  async function submitLineItem(e: React.FormEvent, date: string) {
    e.preventDefault()
    const ok = await createTask(lineTitle, date, linePriority)
    if (ok) {
      setLineTitle('')
      setLinePriority('medium')
    }
  }

  return (
    <div className="text-black">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-black">{title}</h1>
          <p className="text-sm text-black mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {syncing && (
            <span className="text-xs text-black font-medium animate-pulse">
              Scanning for missing images…
            </span>
          )}
          {!syncing && syncCount > 0 && (
            <span className="text-xs text-black font-medium bg-amber-100 px-2 py-1 rounded-full">
              +{syncCount} auto-added (no image)
            </span>
          )}
          <span className={`px-3 py-1 rounded-full text-sm font-medium text-black ${pending.length > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
            {pending.length} pending
          </span>
          <button
            onClick={() => setCreatorOpen(v => !v)}
            className="px-3 py-1.5 text-sm font-semibold text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {creatorOpen ? 'Close' : `+ ${createLabel}`}
          </button>
        </div>
      </div>

      {/* Create task */}
      {creatorOpen && (
        <form
          onSubmit={submitCreator}
          className="mb-5 bg-white border border-gray-300 rounded-xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-black mb-1">Task</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="What needs doing?"
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black mb-1">Date</label>
            <input
              type="date"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-black mb-1">Priority</label>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as TaskPriority)}
              className={`px-3 py-2 border rounded-lg text-sm font-medium text-black focus:outline-none focus:ring-2 focus:ring-gray-900 ${PRIORITY_STYLE[newPriority]}`}
            >
              {PRIORITY_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-40 transition-colors"
          >
            {creating ? 'Adding…' : 'Add Task'}
          </button>
        </form>
      )}

      {/* Filters row */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks, SKU, brand or note…"
          className="flex-1 min-w-[200px] max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
        <select
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value as '' | TaskPriority)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
        {suppliers.length > 0 && (
          <select
            value={selectedSupplier}
            onChange={e => setSelectedSupplier(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-black">Loading tasks…</div>
      ) : (
        <div className="bg-white border border-gray-300 rounded-xl overflow-hidden">
          {/* Whole task list drop down */}
          <button
            onClick={() => setListOpen(v => !v)}
            className="w-full px-4 py-3 bg-gray-100 border-b border-gray-200 flex items-center justify-between gap-3 text-left hover:bg-gray-200 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-black uppercase tracking-wide">
              <Chevron open={listOpen} />
              {title}
            </span>
            <span className="text-xs font-semibold text-black">
              {dateLines.length} date{dateLines.length === 1 ? '' : 's'} · {filtered.length} task{filtered.length === 1 ? '' : 's'} · {pending.length} outstanding
            </span>
          </button>

          {listOpen && (
            dateLines.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-lg font-semibold text-black">
                  {search || selectedSupplier || priorityFilter ? 'No matches found' : 'All clear — no tasks pending'}
                </h3>
                <p className="text-sm text-black mt-1">
                  {!search && !selectedSupplier && !priorityFilter ? emptyHint : 'Try clearing the filters.'}
                </p>
              </div>
            ) : (
              dateLines.map(line => {
                const open = !closedDates.has(line.date)
                const done = line.items.filter(t => !!t.completedAt).length
                const allDone = done === line.items.length
                return (
                  <div key={line.date} className="border-b border-gray-200 last:border-0">
                    {/* Date task line */}
                    <div className={`flex items-center gap-2 px-3 py-2 ${allDone ? 'bg-green-100' : 'bg-gray-50'}`}>
                      <button
                        onClick={() => toggleDate(line.date)}
                        className="flex-1 min-w-0 flex items-center gap-2 text-left"
                      >
                        <Chevron open={open} />
                        <span className="text-sm font-bold text-black">{formatDateLabel(line.date)}</span>
                        <span className="text-xs text-black">{line.date}</span>
                        <span className={`text-xs font-semibold text-black px-2 py-0.5 rounded-full ${allDone ? 'bg-green-200' : 'bg-white border border-gray-300'}`}>
                          {done}/{line.items.length} done
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setAddingForDate(addingForDate === line.date ? null : line.date)
                          setLineTitle('')
                          setLinePriority('medium')
                          if (!open) toggleDate(line.date)
                        }}
                        className="px-2.5 py-1 text-xs font-semibold text-black bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                      >
                        {addingForDate === line.date ? 'Cancel' : '+ Line Item'}
                      </button>
                    </div>

                    {open && (
                      <>
                        {addingForDate === line.date && (
                          <form
                            onSubmit={e => submitLineItem(e, line.date)}
                            className="flex flex-wrap items-center gap-2 px-4 py-2 bg-white border-b border-gray-100"
                          >
                            <input
                              type="text"
                              value={lineTitle}
                              onChange={e => setLineTitle(e.target.value)}
                              placeholder={`Add a line item for ${formatDateLabel(line.date)}…`}
                              autoFocus
                              className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            />
                            <select
                              value={linePriority}
                              onChange={e => setLinePriority(e.target.value as TaskPriority)}
                              className={`px-2 py-1.5 border rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-gray-900 ${PRIORITY_STYLE[linePriority]}`}
                            >
                              {PRIORITY_OPTIONS.map(p => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={creating || !lineTitle.trim()}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-40 transition-colors"
                            >
                              {creating ? 'Adding…' : 'Add'}
                            </button>
                          </form>
                        )}
                        {line.items.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            productIndex={productIndex}
                            toggling={togglingId === task.id}
                            onToggle={() => toggleComplete(task)}
                            onSetPriority={p => setPriority(task.id, p)}
                            onSaveTitle={value => saveTitle(task.id, value)}
                            onSaveNote={note => saveNote(task.id, note)}
                            onDelete={() => handleDelete(task.id)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                )
              })
            )
          )}
        </div>
      )}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 text-black transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function TaskRow({
  task,
  productIndex,
  toggling,
  onToggle,
  onSetPriority,
  onSaveTitle,
  onSaveNote,
  onDelete,
}: {
  task: Task
  productIndex: Map<string, ProductLite>
  toggling: boolean
  onToggle: () => void
  onSetPriority: (priority: TaskPriority) => void
  onSaveTitle: (title: string) => void
  onSaveNote: (note: string) => void
  onDelete: () => void
}) {
  const isComplete = !!task.completedAt
  const daysOld = daysSince(task.createdAt)
  const disappearsIn = isComplete ? daysUntilGone(task.completedAt!) : null
  const isAutoNoImage = task.source === 'auto-no-image'
  const isProductTask = !!task.productId

  const [titleValue, setTitleValue] = useState(task.title || task.productTitle || '')
  const [noteValue, setNoteValue] = useState(task.note || '')
  const [savedIndicator, setSavedIndicator] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setNoteValue(task.note || '')
  }, [task.note])

  useEffect(() => {
    setTitleValue(task.title || task.productTitle || '')
  }, [task.title, task.productTitle])

  function flashSaved() {
    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 1500)
  }

  function handleNoteChange(val: string) {
    setNoteValue(val)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(async () => {
      await onSaveNote(val.trim())
      flashSaved()
    }, 800)
  }

  // A manually typed item code links the row to that product
  const matchedProduct = useMemo(
    () => (isProductTask ? null : findProductForText(titleValue, productIndex)),
    [isProductTask, titleValue, productIndex]
  )
  // Product tasks fall back to the live catalogue image when the task copy is stale/empty
  const rowImage =
    task.imageUrl ||
    matchedProduct?.imageUrl ||
    (isProductTask ? findProductForText(task.sku, productIndex)?.imageUrl || '' : '')
  const imageHref = task.productId || matchedProduct?.id || ''
  const imageNode = rowImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={rowImage}
      alt={matchedProduct?.title || titleValue}
      className="w-12 h-12 object-contain rounded border border-gray-200 flex-shrink-0 bg-white"
    />
  ) : (
    <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center text-xl">📦</div>
  )

  function handleTitleChange(val: string) {
    setTitleValue(val)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(async () => {
      const clean = val.trim()
      if (!clean) return
      await onSaveTitle(clean)
      flashSaved()
    }, 800)
  }

  return (
    <div
      className={`px-4 py-3 border-b border-gray-100 last:border-0 transition-colors text-black ${
        isComplete ? 'bg-green-100' : daysOld >= 7 ? 'bg-amber-50' : 'bg-white'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Complete checkbox — completed rows highlight green */}
        <button
          onClick={onToggle}
          disabled={toggling}
          title={isComplete ? 'Mark as outstanding' : 'Mark complete'}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
            isComplete ? 'bg-green-500 border-green-600 text-white' : 'border-gray-400 hover:border-green-500'
          }`}
        >
          {isComplete && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Priority */}
        <select
          value={task.priority}
          onChange={e => onSetPriority(e.target.value as TaskPriority)}
          title="Priority"
          className={`flex-shrink-0 px-2 py-1 border rounded-md text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-gray-900 ${PRIORITY_STYLE[task.priority]}`}
        >
          {PRIORITY_OPTIONS.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>

        {/* Image — product-linked tasks, or a typed title that matches an item code */}
        {(isProductTask || matchedProduct) && (
          imageHref ? (
            <Link
              href={`/admin/products/${imageHref}`}
              title={matchedProduct?.title || task.productTitle || 'Edit product'}
              className="flex-shrink-0"
            >
              {imageNode}
            </Link>
          ) : imageNode
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          {(task.sku || task.brand || task.supplier || isAutoNoImage) && (
            <div className="flex items-center gap-2 flex-wrap">
              {task.sku && <span className="font-mono text-xs font-bold text-black">{task.sku}</span>}
              {task.brand && <span className="text-xs text-black">{task.brand}</span>}
              {task.supplier && (
                <span className="text-xs text-black bg-blue-100 px-1.5 py-0.5 rounded font-medium">{task.supplier}</span>
              )}
              {isAutoNoImage && (
                <span className="text-[10px] text-black bg-amber-100 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                  Auto • No Image
                </span>
              )}
            </div>
          )}

          {isProductTask ? (
            <p className={`text-sm font-semibold mt-0.5 truncate text-black ${isComplete ? 'line-through' : ''}`}>
              {titleValue || '—'}
            </p>
          ) : (
            <input
              type="text"
              value={titleValue}
              onChange={e => handleTitleChange(e.target.value)}
              placeholder="Task…"
              className={`w-full text-sm font-semibold mt-0.5 px-2 py-1 border border-transparent rounded-md bg-transparent text-black placeholder-gray-500 hover:border-gray-300 focus:outline-none focus:border-gray-900 focus:bg-white transition-colors ${isComplete ? 'line-through' : ''}`}
            />
          )}

          <div className="flex items-center gap-3 mt-1">
            <input
              type="text"
              value={noteValue}
              onChange={e => handleNoteChange(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 min-w-0 text-xs px-2 py-1 border border-gray-300 rounded-md bg-white text-black placeholder-gray-500 focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 transition-colors"
            />
            {savedIndicator && (
              <span className="text-[10px] text-black font-semibold flex-shrink-0">Saved ✓</span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-black">
              Added {daysOld === 0 ? 'today' : `${daysOld}d ago`} · {new Date(task.createdAt).toLocaleDateString('en-ZA')}
            </span>
            {isComplete && disappearsIn !== null && (
              <span className="text-xs text-black font-semibold">Disappears in {disappearsIn}d</span>
            )}
            {!isComplete && daysOld >= 7 && (
              <span className="text-xs text-black font-semibold">⚠ {daysOld} days old</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {isProductTask && (
            <Link
              href={`/admin/products/${task.productId}`}
              className="px-3 py-1.5 text-xs font-semibold text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Edit Product
            </Link>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 text-black hover:text-red-600 transition-colors"
            title="Remove from list"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
