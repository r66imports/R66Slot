'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SiteRule {
  id: string
  name: string
  description: string
  active: boolean
  appliesTo: string[]
  value?: string
  options?: Array<{ label: string; value: string }>
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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700">← Site Settings</Link>
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
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Rules'}
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className={`bg-white rounded-2xl border shadow-sm p-6 transition-all ${rule.active ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-base font-bold text-gray-900">{rule.name}</h2>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {/* Description — split on ". Flow:" to separate summary from workflow steps */}
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
                                  {i < arr.length - 1 && <span className="text-gray-300 text-xs font-bold">→</span>}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mb-4">{rule.description}</p>
                  )}

                  {/* Options selector (for rules with choices) */}
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
                          {rule.active && (
                            <span className="ml-0.5 text-[10px] text-indigo-500 font-bold">✓</span>
                          )}
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
      )}
    </div>
  )
}
