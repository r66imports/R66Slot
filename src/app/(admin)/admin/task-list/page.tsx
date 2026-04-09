'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Task {
  id: string
  sku: string
  productId: string
  productTitle: string
  brand: string
  imageUrl: string
  note: string
  createdAt: string
  completedAt: string | null
}

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24))
}

function daysUntilGone(completedAt: string) {
  const elapsed = Date.now() - new Date(completedAt).getTime()
  return Math.max(0, Math.ceil(5 - elapsed / (1000 * 60 * 60 * 24)))
}

export default function TaskListPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/task-list')
      .then((r) => r.json())
      .then(setTasks)
      .finally(() => setLoading(false))
  }, [])

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
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, completedAt: newCompletedAt } : t))
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  async function saveNote(taskId: string, note: string) {
    await fetch(`/api/admin/task-list/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    })
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, note } : t)))
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Remove this task from the list?')) return
    await fetch(`/api/admin/task-list/${taskId}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase()
    return !q || t.sku?.toLowerCase().includes(q) || t.productTitle?.toLowerCase().includes(q) || t.brand?.toLowerCase().includes(q) || t.note?.toLowerCase().includes(q)
  })

  const pending = filtered.filter((t) => !t.completedAt)
  const completed = filtered.filter((t) => !!t.completedAt)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task List</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Products flagged for attention. Completed tasks disappear after 5 days.
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${pending.length > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {pending.length} pending
        </span>
      </div>

      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by SKU, title, brand or note…"
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading tasks…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-lg font-semibold text-gray-700">
            {search ? 'No matches found' : 'All clear — no tasks pending'}
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Use the "📋 Task List" button on any product to flag it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pending ({pending.length})
              </div>
              {pending.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  toggling={togglingId === task.id}
                  onToggle={() => toggleComplete(task)}
                  onSaveNote={(note) => saveNote(task.id, note)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </div>
          )}
          {completed.length > 0 && (
            <div className="bg-white border border-green-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-green-50 border-b border-green-100 text-xs font-semibold text-green-700 uppercase tracking-wide">
                Completed — auto-removes after 5 days ({completed.length})
              </div>
              {completed.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  toggling={togglingId === task.id}
                  onToggle={() => toggleComplete(task)}
                  onSaveNote={(note) => saveNote(task.id, note)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  toggling,
  onToggle,
  onSaveNote,
  onDelete,
}: {
  task: Task
  toggling: boolean
  onToggle: () => void
  onSaveNote: (note: string) => void
  onDelete: () => void
}) {
  const isComplete = !!task.completedAt
  const daysOld = daysSince(task.createdAt)
  const disappearsIn = isComplete ? daysUntilGone(task.completedAt!) : null

  const [editingNote, setEditingNote] = useState(false)
  const [noteValue, setNoteValue] = useState(task.note || '')
  const [savingNote, setSavingNote] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setNoteValue(task.note || '')
  }, [task.note])

  async function handleSaveNote() {
    setSavingNote(true)
    await onSaveNote(noteValue.trim())
    setSavingNote(false)
    setEditingNote(false)
  }

  function handleCancelNote() {
    setNoteValue(task.note || '')
    setEditingNote(false)
  }

  return (
    <div
      className={`px-4 py-3 border-b border-gray-50 last:border-0 transition-colors ${
        isComplete ? 'bg-green-50' : daysOld >= 7 ? 'bg-amber-50' : 'bg-white'
      }`}
    >
      {/* Top row */}
      <div className="flex items-center gap-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
            isComplete ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'
          }`}
        >
          {isComplete && (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Image */}
        {task.imageUrl ? (
          <img src={task.imageUrl} alt={task.productTitle} className="w-12 h-12 object-contain rounded border border-gray-100 flex-shrink-0" />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300 text-xl">📦</div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-indigo-600">{task.sku}</span>
            {task.brand && <span className="text-xs text-gray-400">{task.brand}</span>}
          </div>
          <p className={`text-sm font-medium mt-0.5 truncate ${isComplete ? 'line-through text-gray-400' : 'text-gray-800'}`}>
            {task.productTitle || '—'}
          </p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-xs text-gray-400">
              Added {daysOld === 0 ? 'today' : `${daysOld}d ago`} · {new Date(task.createdAt).toLocaleDateString('en-ZA')}
            </span>
            {isComplete && disappearsIn !== null && (
              <span className="text-xs text-green-600 font-medium">Disappears in {disappearsIn}d</span>
            )}
            {!isComplete && daysOld >= 7 && (
              <span className="text-xs text-amber-600 font-medium">⚠ {daysOld} days old</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link
            href={`/admin/products/${task.productId}`}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit Product
          </Link>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
            title="Remove from list"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Note row */}
      <div className="ml-[88px] mt-2">
        {editingNote ? (
          <div className="space-y-1.5">
            <textarea
              ref={textareaRef}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add a note about what needs to be done…"
              rows={2}
              autoFocus
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-gray-700"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {savingNote ? 'Saving…' : 'Save Note'}
              </button>
              <button
                onClick={handleCancelNote}
                className="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : noteValue ? (
          <button
            onClick={() => setEditingNote(true)}
            className="group text-left w-full"
          >
            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-colors">
              {noteValue}
              <span className="ml-2 text-[10px] text-gray-400 group-hover:text-indigo-400">edit</span>
            </p>
          </button>
        ) : (
          <button
            onClick={() => setEditingNote(true)}
            className="text-xs text-gray-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add note
          </button>
        )}
      </div>
    </div>
  )
}
