'use client'

import { useState, useEffect, useCallback } from 'react'

interface ChecklistItem {
  id: string
  sku: string
  description: string
  qty: number
  checked: boolean
  notes?: string
}

interface Checklist {
  id: string
  name: string
  supplier: string
  date: string
  createdAt: string
  items: ChecklistItem[]
  archived: boolean
  worksheetId?: string
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ChecklistsPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/checklists')
    if (res.ok) setChecklists(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleItem = async (cl: Checklist, itemId: string) => {
    const item = cl.items.find(it => it.id === itemId)
    const newChecked = !item?.checked
    const newItems = cl.items.map(it => it.id === itemId ? { ...it, checked: newChecked } : it)
    setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, items: newItems } : c))
    await fetch('/api/admin/checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cl.id, items: newItems }),
    })
    // Sync to linked worksheet
    if (cl.worksheetId && item?.sku) {
      fetch('/api/admin/worksheets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worksheetId: cl.worksheetId, sku: item.sku, sentToInventory: newChecked }),
      }).catch(() => {})
    }
  }

  const updateItemNotes = async (cl: Checklist, itemId: string, notes: string) => {
    const newItems = cl.items.map(it => it.id === itemId ? { ...it, notes } : it)
    setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, items: newItems } : c))
    setSaving(s => ({ ...s, [cl.id]: true }))
    await fetch('/api/admin/checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cl.id, items: newItems }),
    })
    setSaving(s => ({ ...s, [cl.id]: false }))
  }

  const uncheckAll = async (cl: Checklist) => {
    const newItems = cl.items.map(it => ({ ...it, checked: false }))
    setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, items: newItems } : c))
    await fetch('/api/admin/checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cl.id, items: newItems }),
    })
    // Sync all items to unchecked in linked worksheet
    if (cl.worksheetId) {
      cl.items.filter(it => it.sku && it.checked).forEach(it => {
        fetch('/api/admin/worksheets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worksheetId: cl.worksheetId, sku: it.sku, sentToInventory: false }),
        }).catch(() => {})
      })
    }
  }

  const toggleArchive = async (cl: Checklist) => {
    const archived = !cl.archived
    setChecklists(prev => prev.map(c => c.id === cl.id ? { ...c, archived } : c))
    await fetch('/api/admin/checklists', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cl.id, archived }),
    })
  }

  const deleteChecklist = async (id: string) => {
    await fetch(`/api/admin/checklists?id=${id}`, { method: 'DELETE' })
    setChecklists(prev => prev.filter(c => c.id !== id))
    setDeleteConfirm(null)
    if (openId === id) setOpenId(null)
  }

  const visible = checklists.filter(c => showArchived ? c.archived : !c.archived)
  const active = checklists.filter(c => !c.archived)
  const archived = checklists.filter(c => c.archived)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm animate-pulse">Loading checklists…</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tick off items as they arrive from your supplier</p>
        </div>
        <div className="flex items-center gap-3">
          {archived.length > 0 && (
            <button
              onClick={() => setShowArchived(s => !s)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showArchived ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {showArchived ? '← Active' : `Archived (${archived.length})`}
            </button>
          )}
          <span className="text-xs text-gray-400">{active.length} active</span>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-base font-medium text-gray-500">No checklists yet</p>
          <p className="text-sm mt-1">Press &ldquo;Send to Checklist&rdquo; on the Worksheet page to create one</p>
        </div>
      )}

      <div className="space-y-3">
        {visible.map(cl => {
          const checkedCount = cl.items.filter(it => it.checked).length
          const total = cl.items.length
          const pct = total > 0 ? Math.round(checkedCount / total * 100) : 0
          const isOpen = openId === cl.id
          const allDone = checkedCount === total && total > 0

          return (
            <div key={cl.id} className={`bg-white rounded-xl border shadow-sm ${allDone ? 'border-green-200' : 'border-gray-200'}`}>
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
                onClick={() => setOpenId(isOpen ? null : cl.id)}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-xl">{allDone ? '✅' : '📋'}</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">{cl.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                      {cl.supplier && <span className="text-blue-600 font-medium">{cl.supplier}</span>}
                      <span>{fmtDate(cl.date)}</span>
                      <span>· {total} items</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className={`text-sm font-bold ${allDone ? 'text-green-600' : 'text-gray-700'}`}>{checkedCount}/{total}</div>
                    <div className="text-xs text-gray-400">{pct}%</div>
                  </div>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                    <div className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100">
                  {/* Actions bar */}
                  <div className="flex items-center justify-between px-5 py-2 bg-gray-50 text-xs gap-2 flex-wrap">
                    <div>
                      {saving[cl.id] && <span className="text-gray-400 italic">Saving…</span>}
                      {allDone && <span className="text-green-600 font-semibold">✓ All items received!</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {checkedCount > 0 && (
                        <button onClick={() => uncheckAll(cl)} className="px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-white">
                          Uncheck All
                        </button>
                      )}
                      <button onClick={() => toggleArchive(cl)} className="px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-white">
                        {cl.archived ? 'Unarchive' : 'Archive'}
                      </button>
                      {deleteConfirm === cl.id ? (
                        <>
                          <span className="text-red-600 font-medium">Delete?</span>
                          <button onClick={() => deleteChecklist(cl.id)} className="px-2.5 py-1 bg-red-600 text-white rounded-lg">Yes</button>
                          <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 border border-gray-200 rounded-lg text-gray-500">No</button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirm(cl.id)} className="px-2.5 py-1 border border-red-100 rounded-lg text-red-400 hover:bg-red-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Item rows */}
                  <div className="divide-y divide-gray-50">
                    {cl.items.map((it, idx) => (
                      <div
                        key={it.id}
                        className={`flex items-start gap-4 px-5 py-3 ${it.checked ? 'bg-green-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        <input
                          type="checkbox"
                          checked={it.checked}
                          onChange={() => toggleItem(cl, it.id)}
                          className="mt-0.5 w-5 h-5 rounded accent-green-600 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {it.sku && (
                              <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${it.checked ? 'text-green-700 bg-green-100' : 'text-indigo-700 bg-indigo-50'}`}>
                                {it.sku}
                              </span>
                            )}
                            <span className={`text-sm ${it.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                              {it.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-400">Qty: <strong className="text-gray-600">{it.qty}</strong></span>
                            <input
                              type="text"
                              placeholder="Add note…"
                              value={it.notes || ''}
                              onChange={e => updateItemNotes(cl, it.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-600 w-48 focus:outline-none focus:ring-1 focus:ring-blue-300"
                            />
                          </div>
                        </div>
                        <div className={`text-xs font-bold flex-shrink-0 mt-0.5 ${it.checked ? 'text-green-600' : 'text-gray-300'}`}>
                          {it.checked ? '✓' : `#${idx + 1}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
