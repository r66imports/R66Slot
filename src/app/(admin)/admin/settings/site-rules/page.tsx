'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

interface SiteRule {
  id: string
  name: string
  description: string
  active: boolean
  appliesTo: string[]
  value?: string
  options?: Array<{ label: string; value: string }>
  category?: string
}

const PRESET_CATEGORIES = ['System', 'Inventory', 'Invoices', 'Online Store', 'POS', 'Shipping', 'Customers', 'Elements']

const CATEGORY_COLORS: Record<string, { header: string; dot: string; border: string }> = {
  System:         { header: 'bg-purple-50',  dot: 'bg-purple-500',  border: 'border-purple-200' },
  Inventory:      { header: 'bg-orange-50',  dot: 'bg-orange-500',  border: 'border-orange-200' },
  Invoices:       { header: 'bg-blue-50',    dot: 'bg-blue-500',    border: 'border-blue-200'   },
  'Online Store': { header: 'bg-green-50',   dot: 'bg-green-500',   border: 'border-green-200'  },
  POS:            { header: 'bg-yellow-50',  dot: 'bg-yellow-500',  border: 'border-yellow-200' },
  Shipping:       { header: 'bg-cyan-50',    dot: 'bg-cyan-500',    border: 'border-cyan-200'   },
  Customers:      { header: 'bg-pink-50',    dot: 'bg-pink-500',    border: 'border-pink-200'   },
  Elements:       { header: 'bg-indigo-50',  dot: 'bg-indigo-500',  border: 'border-indigo-200' },
  Uncategorized:  { header: 'bg-gray-50',    dot: 'bg-gray-400',    border: 'border-gray-200'   },
}

function getCatStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Uncategorized
}

const ENFORCED_RULES = new Set([
  'site_font',
  'enforce_stock_limit',
  'auto_create_product',
  'invoice_stock_deduction',
  'document_shipping',
  'invoice_price_type',
  'preorder_checkout_separation',
  'inventory_count_sync',
  'button_alignment',
  'product_grid_show_stock',
  'worksheet_wholesale_sync',
  'event_sku_drill_down',
])

function CategoryPicker({
  value,
  onChange,
  allCategories,
}: {
  value: string
  onChange: (cat: string) => void
  allCategories: string[]
}) {
  const [open, setOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allOptions = Array.from(new Set([...PRESET_CATEGORIES, ...allCategories]))
  const style = getCatStyle(value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border transition-colors ${style.header} ${style.border} text-gray-600 hover:opacity-80`}
        title="Change category"
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {value}
        <svg className="w-2.5 h-2.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-xl border border-gray-200 shadow-lg w-44 py-1 text-sm">
          {allOptions.map((cat) => (
            <button
              key={cat}
              onClick={() => { onChange(cat); setOpen(false) }}
              className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-2 ${cat === value ? 'font-semibold' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full ${getCatStyle(cat).dot}`} />
              {cat}
              {cat === value && <span className="ml-auto text-indigo-500">&#10003;</span>}
            </button>
          ))}
          <div className="border-t border-gray-100 mt-1 pt-1 px-2 pb-1">
            <input
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400"
              placeholder="New category…"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCat.trim()) {
                  onChange(newCat.trim())
                  setNewCat('')
                  setOpen(false)
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SiteRulesPage() {
  const [rules, setRules] = useState<SiteRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/admin/site-rules')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        setRules(Array.isArray(data) ? data : [])
        initialized.current = true
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const doSave = useCallback(async (latestRules: SiteRule[]) => {
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/admin/site-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latestRules),
      })
      setSaveStatus(res.ok ? 'saved' : 'error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
  }, [])

  const scheduleAutoSave = useCallback((latestRules: SiteRule[]) => {
    if (!initialized.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('saving')
    debounceRef.current = setTimeout(() => doSave(latestRules), 600)
  }, [doSave])

  const toggle = (id: string) => {
    setRules((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, active: !r.active } : r)
      scheduleAutoSave(next)
      return next
    })
  }

  const setValue = (id: string, value: string) => {
    setRules((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, value } : r)
      scheduleAutoSave(next)
      return next
    })
  }

  const setCategory = (id: string, category: string) => {
    setRules((prev) => {
      const next = prev.map((r) => r.id === id ? { ...r, category } : r)
      scheduleAutoSave(next)
      return next
    })
  }

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allCategories = Array.from(new Set(rules.map((r) => r.category || 'Uncategorized')))
  const orderedCategories = [
    ...PRESET_CATEGORIES.filter((c) => allCategories.includes(c)),
    ...allCategories.filter((c) => !PRESET_CATEGORIES.includes(c)),
  ]
  const grouped = orderedCategories.map((cat) => ({
    cat,
    rules: rules.filter((r) => (r.category || 'Uncategorized') === cat),
  }))

  const statusLabel = {
    idle:   null,
    saving: <span className="text-xs text-gray-400 animate-pulse">Saving…</span>,
    saved:  <span className="text-xs text-green-600 font-semibold">✓ Auto-saved</span>,
    error:  <span className="text-xs text-red-500 font-semibold">Save failed</span>,
  }[saveStatus]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 block mb-1">&larr; Site Settings</Link>
          <h1 className="text-2xl font-bold text-gray-900">Site Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure business rules across admin, POS, and online store. Changes save automatically.</p>
        </div>
        <div className="flex items-center gap-3">{statusLabel}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-5 px-1 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Code Enforced
          </span>
          Toggle controls live behavior in the API
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 bg-gray-100 border border-gray-200 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Documentation
          </span>
          Describes behavior always running in code
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cat, rules: catRules }) => {
            const style = getCatStyle(cat)
            return (
              <div key={cat} className={`bg-white rounded-2xl border ${style.border} shadow-sm overflow-hidden`}>
                {/* Category header */}
                <div className={`${style.header} px-5 py-2.5 border-b ${style.border} flex items-center gap-2`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-gray-600">{cat}</h2>
                  <span className="text-xs text-gray-400 font-medium ml-1">{catRules.length} rule{catRules.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Rules list */}
                <div className="divide-y divide-gray-100">
                  {catRules.map((rule) => {
                    const enforced = ENFORCED_RULES.has(rule.id)
                    const isExpanded = expanded.has(rule.id)
                    return (
                      <div key={rule.id}>
                        {/* Compact row */}
                        <div className={`flex items-center gap-3 px-5 py-3 ${isExpanded ? 'bg-gray-50/60' : 'hover:bg-gray-50/40'}`}>
                          {/* Toggle */}
                          <button
                            onClick={() => toggle(rule.id)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${rule.active ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            role="switch"
                            aria-checked={rule.active}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${rule.active ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>

                          {/* Name + badges */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm font-semibold ${rule.active ? 'text-gray-900' : 'text-gray-400'}`}>{rule.name}</span>
                              {enforced ? (
                                <span className="inline-flex items-center gap-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                  Enforced
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 bg-gray-100 border border-gray-200 text-gray-400 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                  Docs
                                </span>
                              )}
                              {!rule.active && (
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-semibold">Inactive</span>
                              )}
                            </div>
                            {/* Applies-to chips — always visible */}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {rule.appliesTo.map((area) => (
                                <span key={area} className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${rule.active ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                                  {area}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Expand chevron */}
                          <button
                            onClick={() => toggleExpand(rule.id)}
                            className="text-gray-300 hover:text-gray-500 p-1 rounded transition-colors flex-shrink-0"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-3 bg-gray-50/60 border-t border-gray-100">
                            {/* Description */}
                            {rule.description.includes('. Flow:') ? (
                              <div className="space-y-2 mb-4">
                                <p className="text-sm text-gray-600">
                                  {rule.description.split(/\. (?=Flow:)/)[0]}.
                                </p>
                                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Workflow</p>
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {rule.description
                                      .split(/\. (?=Flow:)/)[1]
                                      ?.replace(/^Flow:\s*/, '')
                                      .split(/\.\s+(?=[A-Z])/)
                                      .map((step, i, arr) => (
                                        <span key={i} className="flex items-center gap-1.5">
                                          <span className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">{step.replace(/\.$/, '')}</span>
                                          {i < arr.length - 1 && <span className="text-gray-300 text-xs font-bold">&rarr;</span>}
                                        </span>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 mb-4">{rule.description}</p>
                            )}

                            {/* Options selector */}
                            {rule.options && rule.options.length > 0 && (
                              <div className="mb-4">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Default Selection</p>
                                <div className="flex gap-2 flex-wrap">
                                  {rule.options.map((opt) => (
                                    <button
                                      key={opt.value}
                                      onClick={() => setValue(rule.id, opt.value)}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                                        rule.value === opt.value
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400 hover:text-indigo-600'
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Category picker */}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-medium">Category:</span>
                              <CategoryPicker
                                value={rule.category || 'Uncategorized'}
                                onChange={(c) => setCategory(rule.id, c)}
                                allCategories={allCategories}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
