'use client'

import { useState, useEffect, useRef } from 'react'

interface SupplierContact {
  id: string
  name: string
  code: string
  country: string
  googleSheetsUrl?: string
}

interface StockSheet {
  id: string
  supplierId: string
  supplierName: string
  filename: string
  url: string
  fileType: string
  fileSize: number
  uploadedAt: string
  notes?: string
}

function fileIcon(type: string) {
  if (type === 'pdf') return '📄'
  if (type === 'csv') return '📊'
  return '📗'
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SupplierStockSheetsPage() {
  const [suppliers, setSuppliers] = useState<SupplierContact[]>([])
  const [sheets, setSheets] = useState<StockSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSupplier, setSelectedSupplier] = useState<string>('')
  const [filterSupplier, setFilterSupplier] = useState<string>('all')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    const [sc, ss] = await Promise.all([
      fetch('/api/admin/supplier-contacts').then(r => r.json()).catch(() => []),
      fetch('/api/admin/supplier-stock-sheets').then(r => r.json()).catch(() => []),
    ])
    setSuppliers(Array.isArray(sc) ? sc : [])
    setSheets(Array.isArray(ss) ? ss : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleUpload(file: File) {
    if (!selectedSupplier) { setUploadError('Select a supplier first.'); return }
    const sup = suppliers.find(s => s.id === selectedSupplier)
    if (!sup) return
    setUploading(true)
    setUploadError('')
    setUploadSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('supplierCode', sup.code || sup.name)
      const upRes = await fetch('/api/admin/supplier-stock-sheets/upload', { method: 'POST', body: fd })
      const upData = await upRes.json()
      if (!upRes.ok) { setUploadError(upData.error || 'Upload failed'); return }

      const metaRes = await fetch('/api/admin/supplier-stock-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: sup.id,
          supplierName: sup.name,
          filename: file.name,
          r2Key: upData.r2Key,
          url: upData.url,
          fileType: upData.fileType,
          fileSize: upData.fileSize,
          notes,
        }),
      })
      if (!metaRes.ok) { setUploadError('Saved file but failed to record metadata'); return }
      setUploadSuccess(`✓ ${file.name} uploaded`)
      setNotes('')
      if (fileRef.current) fileRef.current.value = ''
      await load()
    } catch (e: any) {
      setUploadError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"?`)) return
    await fetch(`/api/admin/supplier-stock-sheets?id=${id}`, { method: 'DELETE' })
    await load()
  }

  const filtered = filterSupplier === 'all' ? sheets : sheets.filter(s => s.supplierId === filterSupplier)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stock Sheets</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload supplier stock lists in PDF or Excel format</p>
      </div>

      {/* Upload panel */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Upload New Sheet</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <select
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">— Select supplier —</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}{s.country ? ` (${s.country})` : ''}</option>
                ))}
              </select>
              {(() => {
                const sup = suppliers.find(s => s.id === selectedSupplier)
                return sup?.googleSheetsUrl ? (
                  <a
                    href={sup.googleSheetsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 whitespace-nowrap shrink-0"
                    title="Open Google Sheet"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm-7 14H7v-2h5v2zm5-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                    Open Sheet
                  </a>
                ) : null
              })()}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Q3 2026 price list"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleUpload(f)
          }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xls,.xlsx,.ods,.csv,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
          />
          {uploading ? (
            <div className="space-y-2">
              <div className="text-2xl">⏳</div>
              <p className="text-sm text-indigo-600 font-medium">Uploading…</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl">📁</div>
              <p className="text-sm font-medium text-gray-700">Drop file here or <span className="text-indigo-600">browse</span></p>
              <p className="text-xs text-gray-400">PDF, Excel (.xlsx / .xls), ODS, or CSV · max 50 MB</p>
            </div>
          )}
        </div>

        {uploadError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{uploadError}</p>}
        {uploadSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{uploadSuccess}</p>}
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
            {filtered.length} sheet{filtered.length !== 1 ? 's' : ''}
          </span>
          <select
            value={filterSupplier}
            onChange={e => setFilterSupplier(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-700"
          >
            <option value="all">All suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            {filterSupplier === 'all' ? 'No stock sheets uploaded yet.' : 'No sheets for this supplier.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">File</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Supplier</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Size</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Uploaded</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(sheet => (
                <tr key={sheet.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a href={sheet.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-indigo-600 hover:underline font-medium min-w-0">
                      <span className="text-base shrink-0">{fileIcon(sheet.fileType)}</span>
                      <span className="truncate max-w-xs">{sheet.filename}</span>
                      <span className="text-[10px] uppercase font-mono bg-gray-100 text-gray-500 px-1 rounded shrink-0">{sheet.fileType}</span>
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-medium">{sheet.supplierName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{sheet.notes || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">{fmtSize(sheet.fileSize)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(sheet.uploadedAt).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(() => {
                        const sup = suppliers.find(s => s.id === sheet.supplierId)
                        return sup?.googleSheetsUrl ? (
                          <a href={sup.googleSheetsUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100 font-medium">
                            Sheet ↗
                          </a>
                        ) : null
                      })()}
                      <a href={sheet.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded hover:bg-indigo-100 font-medium">
                        Download
                      </a>
                      <button
                        onClick={() => handleDelete(sheet.id, sheet.filename)}
                        className="text-xs px-2 py-1 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
