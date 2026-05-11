'use client'

import { useState } from 'react'

export default function MigratePage() {
  const [preview, setPreview] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function loadPreview() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/migrate/revo-sku-fix')
      const data = await r.json()
      setPreview(data.preview || [])
    } finally {
      setLoading(false)
    }
  }

  async function runMigration() {
    if (!confirm(`This will rename ${preview.length} SKUs in the database and all related data. This cannot be undone. Continue?`)) return
    setLoading(true)
    try {
      const r = await fetch('/api/admin/migrate/revo-sku-fix', { method: 'POST' })
      const data = await r.json()
      setResult(data)
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Revo SKU Fix</h1>
        <p className="text-sm text-gray-500 mt-1">Removes the hyphen from all RS-XXX SKUs → RSXXX in products, pricelists, worksheets and related data.</p>
      </div>

      {!done && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>Warning:</strong> This is a one-way migration. Run the preview first to see what will change.
        </div>
      )}

      {done && result?.ok && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-green-800 font-semibold">✅ Migration complete — {result.totalChanged} changes applied</p>
          {result.errors?.length > 0 && (
            <p className="text-red-600 mt-1 text-sm">⚠ {result.errors.length} errors: {result.errors.join(', ')}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={loadPreview}
          disabled={loading || done}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
        >
          {loading && preview.length === 0 ? 'Loading…' : 'Preview Changes'}
        </button>
        {preview.length > 0 && !done && (
          <button
            onClick={runMigration}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40"
          >
            {loading ? 'Running…' : `Run Migration (${preview.length} SKUs)`}
          </button>
        )}
      </div>

      {preview.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">{preview.length} SKUs will be renamed</p>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 space-y-1">
            {preview.map((line, i) => (
              <p key={i} className="text-sm font-mono text-gray-700">{line}</p>
            ))}
          </div>
        </div>
      )}

      {result?.changes?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Changes applied ({result.totalChanged})</p>
          </div>
          <div className="max-h-96 overflow-y-auto p-4 space-y-1">
            {result.changes.map((line: string, i: number) => (
              <p key={i} className="text-xs font-mono text-gray-600">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
