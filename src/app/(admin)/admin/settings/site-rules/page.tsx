'use client'

import { useState, useEffect, useRef } from 'react'
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

const PRESET_CATEGORIES = ['System', 'Inventory', 'Invoices', 'Online Store', 'POS', 'Shipping', 'Customers']

const CATEGORY_COLORS: Record<string, string> = {
  System:       'bg-purple-50 border-purple-200 text-purple-700',
  Inventory:    'bg-orange-50 border-orange-200 text-orange-700',
  Invoices:     'bg-blue-50 border-blue-200 text-blue-700',
  'Online Store': 'bg-green-50 border-green-200 text-green-700',
  POS:          'bg-yellow-50 border-yellow-200 text-yellow-700',
  Shipping:     'bg-cyan-50 border-cyan-200 text-cyan-700',
  Customers:    'bg-pink-50 border-pink-200 text-pink-700',
  Uncategorized:'bg-gray-50 border-gray-200 text-gray-500',
}

const CATEGORY_HEADER_COLORS: Record<string, string> = {
  System:       'bg-purple-600',
  Inventory:    'bg-orange-500',
  Invoices:     'bg-blue-600',
  'Online Store': 'bg-green-600',
  POS:          'bg-yellow-500',
  Shipping:     'bg-cyan-600',
  Customers:    'bg-pink-500',
  Uncategorized:'bg-gray-400',
}

function getCategoryColor(cat: string) {
  return CATEGORY_COLORS[cat] ?? 'bg-gray-50 border-gray-200 text-gray-500'
}

function getCategoryHeaderColor(cat: string) {
  return CATEGORY_HEADER_COLORS[cat] ?? 'bg-gray-400'
}

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${getCategoryColor(value)} hover:opacity-80`}
        title="Change category"
      >
        <span>{value}</span>
        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <span className={`w-2 h-2 rounded-full ${getCategoryHeaderColor(cat)}`} />
              {cat}
              {cat === value && <span className="ml-auto text-indigo-500">✓</span>}
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

export default function SiteRulesPage() {
  const [rules, setRules] = useState<SiteRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/site-rules')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setRules(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r))
  }

  const setValue = (id: string, value: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, value } : r))
  }

  const setCategory = (id: string, category: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, category } : r))
  }

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/site-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  // Build ordered category list: defined order first, then any custom ones
  const allCategories = Array.from(new Set(rules.map((r) => r.category || 'Uncategorized')))
  const orderedCategories = [
    ...PRESET_CATEGORIES.filter((c) => allCategories.includes(c)),
    ...allCategories.filter((c) => !PRESET_CATEGORIES.includes(c)),
  ]
  const grouped = orderedCategories.map((cat) => ({
    cat,
    rules: rules.filter((r) => (r.category || 'Uncategorized') === cat),
  }))

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700">&larr; Site Settings</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Site Rules</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure business rules that apply across the admin, POS, and online store.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            saved ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
          } disabled:opacity-50`}
        >
          {saved ? '✓ Saved' : saving ? 'Saving\u2026' : 'Save Rules'}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading\u2026</div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ cat, rules: catRules }) => (
            <div key={cat}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-3 h-3 rounded-full ${getCategoryHeaderColor(cat)}`} />
                <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{cat}</h2>
                <span className="text-xs text-gray-400 font-medium">{catRules.length} rule{catRules.length !== 1 ? 's' : ''}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="space-y-4">
                {catRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${rule.active ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Name + status + category picker */}
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <h3 className="text-base font-bold text-gray-900">{rule.name}</h3>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </span>
                          <CategoryPicker
                            value={rule.category || 'Uncategorized'}
                            onChange={(cat) => setCategory(rule.id, cat)}
                            allCategories={allCategories}
                          />
                        </div>

                        {/* Description with workflow rendering */}
                        {rule.description.includes('. Flow:') || rule.description.includes('. Use the') ? (
                          <div className="mb-4 space-y-2">
                            <p className="text-sm text-gray-500">
                              {rule.description.split(/\. (?=Flow:|Use the)/)[0]}.
                            </p>
                            {rule.description.includes('Flow:') && (
                              <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Workflow</p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {rule.description
                                    .split(/\. (?=Flow:)/)[1]
                                    ?.replace(/^Flow:\s*/, '')
                                    .split(/\.\s+(?=[A-Z])/)
                                    .map((step, i, arr) => (
                                      <span key={i} className="flex items-center gap-1.5">
                                        <span className="text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1">{step.replace(/\.$/, '')}</span>
                                        {i < arr.length - 1 && <span className="text-gray-300 text-xs font-bold">&rarr;</span>}
                                      </span>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mb-4">{rule.description}</p>
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
                                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
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

                        {/* Applies To badges */}
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Applies To</p>
                          <div className="flex flex-wrap gap-2">
                            {rule.appliesTo.map((area) => (
                              <span
                                key={area}
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                                  rule.active
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    : 'bg-gray-50 text-gray-400 border-gray-200'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${rule.active ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                                {area}
                                {rule.active && <span className="ml-0.5 text-[10px] text-indigo-500 font-bold">✓</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Toggle switch */}
                      <button
                        onClick={() => toggle(rule.id)}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1 ${
                          rule.active ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={rule.active}
                      >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${rule.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
