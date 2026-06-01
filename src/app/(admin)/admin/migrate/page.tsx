'use client'

import { useState } from 'react'

function MigrationCard({
  title,
  description,
  endpoint,
  confirmMsg,
  previewKeys,
}: {
  title: string
  description: string
  endpoint: string
  confirmMsg: (count: number) => string
  previewKeys: string[]
}) {
  const [previewData, setPreviewData] = useState<Record<string, string[]>>({})
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const totalPreview = previewKeys.reduce((s, k) => s + (previewData[k]?.length || 0), 0)

  async function loadPreview() {
    setLoading(true)
    try {
      const r = await fetch(endpoint)
      const data = await r.json()
      const mapped: Record<string, string[]> = {}
      for (const k of previewKeys) mapped[k] = data[k] || []
      setPreviewData(mapped)
    } finally {
      setLoading(false)
    }
  }

  async function runMigration() {
    if (!confirm(confirmMsg(totalPreview))) return
    setLoading(true)
    try {
      const r = await fetch(endpoint, { method: 'POST' })
      const data = await r.json()
      setResult(data)
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>

      {!done && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <strong>Warning:</strong> One-way migration. Preview first.
        </div>
      )}

      {done && result?.ok && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-green-800 font-semibold text-sm">✅ Complete — {result.totalChanged} changes applied</p>
          {result.errors?.length > 0 && (
            <p className="text-red-600 mt-1 text-xs">⚠ {result.errors.length} errors: {result.errors.join(', ')}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={loadPreview} disabled={loading || done}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40">
          {loading && totalPreview === 0 ? 'Loading…' : 'Preview Changes'}
        </button>
        {totalPreview > 0 && !done && (
          <button onClick={runMigration} disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40">
            {loading ? 'Running…' : `Run Migration (${totalPreview} items)`}
          </button>
        )}
      </div>

      {totalPreview > 0 && !done && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">{totalPreview} changes queued</p>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-1">
            {previewKeys.flatMap(k => (previewData[k] || []).map((line, i) => (
              <p key={`${k}-${i}`} className={`text-xs font-mono ${line.startsWith('DELETE') ? 'text-red-600' : 'text-gray-700'}`}>{line}</p>
            )))}
          </div>
        </div>
      )}

      {result?.changes?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-700">Changes applied ({result.totalChanged})</p>
          </div>
          <div className="max-h-72 overflow-y-auto p-4 space-y-1">
            {result.changes.map((line: string, i: number) => (
              <p key={i} className={`text-xs font-mono ${line.includes('DELETE') ? 'text-red-600' : 'text-gray-600'}`}>{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MigratePage() {
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Migrations</h1>
        <p className="text-sm text-gray-500 mt-1">One-time data fixes. Always preview before running.</p>
      </div>

      <MigrationCard
        title="NSR SKU Normalise"
        description="Renames all lowercase nsr-XXXX SKUs to NSR-XXXX. Where an uppercase duplicate already exists, the lowercase entry is deleted."
        endpoint="/api/admin/migrate/nsr-sku-fix"
        confirmMsg={(n) => `This will rename/delete ${n} NSR SKU entries across products and all related data. This cannot be undone. Continue?`}
        previewKeys={['renames', 'deletes']}
      />

      <MigrationCard
        title="Revo SKU Fix"
        description="Removes the hyphen from all RS-XXX SKUs → RSXXX in products, pricelists, worksheets and related data."
        endpoint="/api/admin/migrate/revo-sku-fix"
        confirmMsg={(n) => `This will rename ${n} SKUs in the database and all related data. This cannot be undone. Continue?`}
        previewKeys={['preview']}
      />
    </div>
  )
}
