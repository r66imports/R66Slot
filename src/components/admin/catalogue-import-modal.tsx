'use client'

import { useMemo, useState } from 'react'
import {
  detectColumns,
  extractPdfRows,
  googleSheetCsvUrl,
  parseDelimited,
  parsePdfCatalogue,
  rowsToParsed,
  type ColumnMap,
  type ParsedRow,
} from '@/lib/catalogue-import'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ZAR', 'CHF', 'JPY', 'AUD', 'CAD', 'HKD', 'CNY']

interface Props {
  supplierId: string
  supplierName: string
  /** The supplier's own currency — the default, overridable below. */
  supplierCurrency: string
  brands: string[]
  onClose: () => void
  onImported: (added: number, updated: number) => void
}

type Stage = 'pick' | 'map' | 'preview'

interface EditableRow extends ParsedRow {
  key: string
  include: boolean
}

export default function CatalogueImportModal({
  supplierId,
  supplierName,
  supplierCurrency,
  brands,
  onClose,
  onImported,
}: Props) {
  const [stage, setStage] = useState<Stage>('pick')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sheetUrl, setSheetUrl] = useState('')

  // Grid sources (Excel / CSV / Sheets) go through column mapping; PDF does not.
  const [grid, setGrid] = useState<string[][]>([])
  const [map, setMap] = useState<ColumnMap>({ sku: -1, description: -1, wholesalePrice: -1, headerRow: -1 })
  const [rows, setRows] = useState<EditableRow[]>([])

  const [brand, setBrand] = useState(brands[0] || '')
  const [currency, setCurrency] = useState((supplierCurrency || 'EUR').toUpperCase())

  const toRows = (parsed: ParsedRow[]): EditableRow[] =>
    parsed.map((r, i) => ({
      ...r,
      key: `r${i}_${r.sku}`,
      // Rows with nothing usable are unticked rather than hidden, so the count
      // in the file still reconciles with what is about to be imported.
      include: !!r.sku,
    }))

  const loadGrid = (g: string[][], label: string) => {
    if (g.length === 0) {
      setError('That file had no readable rows.')
      return
    }
    setGrid(g)
    setSourceName(label)
    const detected = detectColumns(g)
    setMap(detected)
    setRows(toRows(rowsToParsed(g, detected)))
    setStage(detected.sku >= 0 && detected.wholesalePrice >= 0 ? 'preview' : 'map')
  }

  const onFile = async (file: File) => {
    setBusy(true)
    setError('')
    try {
      const name = file.name.toLowerCase()
      if (name.endsWith('.pdf')) {
        const pdfRows = await extractPdfRows(file)
        const parsed = parsePdfCatalogue(pdfRows)
        if (parsed.length === 0) {
          setError(
            'No product lines found in that PDF. It may be a scanned image rather than text — those cannot be read.'
          )
          return
        }
        setSourceName(file.name)
        setRows(toRows(parsed))
        setGrid([])
        setStage('preview')
        return
      }

      if (name.endsWith('.csv') || name.endsWith('.txt') || name.endsWith('.tsv')) {
        loadGrid(parseDelimited(await file.text()), file.name)
        return
      }

      const XLSX = await import('xlsx')
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const g: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false })
      loadGrid(
        g.map((r) => (r || []).map((c) => String(c ?? ''))),
        `${file.name} — ${wb.SheetNames[0]}`
      )
    } catch (e: any) {
      setError(e?.message || 'Could not read that file')
    } finally {
      setBusy(false)
    }
  }

  const onSheet = async () => {
    const csv = googleSheetCsvUrl(sheetUrl)
    if (!csv) {
      setError('That does not look like a Google Sheets link.')
      return
    }
    setBusy(true)
    setError('')
    try {
      // Fetched server-side: the browser cannot read docs.google.com directly.
      const res = await fetch('/api/admin/supplier-catalogue/import-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not fetch that sheet')
      loadGrid(parseDelimited(data.csv), 'Google Sheet')
    } catch (e: any) {
      setError(e?.message || 'Could not fetch that sheet')
    } finally {
      setBusy(false)
    }
  }

  const applyMap = (next: ColumnMap) => {
    setMap(next)
    if (grid.length > 0) setRows(toRows(rowsToParsed(grid, next)))
  }

  const included = rows.filter((r) => r.include && r.sku.trim())
  const priced = included.filter((r) => r.wholesalePrice > 0)
  const unpriced = included.length - priced.length
  const duplicates = useMemo(() => {
    const seen = new Set<string>()
    const dupes = new Set<string>()
    for (const r of included) {
      const k = r.sku.trim().toUpperCase()
      if (seen.has(k)) dupes.add(k)
      seen.add(k)
    }
    return dupes
  }, [included])

  const commit = async () => {
    if (!brand.trim()) {
      setError('Pick a brand — items without one can never be found on the client sheet.')
      return
    }
    if (included.length === 0) {
      setError('Nothing ticked to import.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/supplier-catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: included.map((r) => ({
            supplierId,
            supplierName,
            brand: brand.trim(),
            sku: r.sku.trim(),
            description: r.description.trim(),
            wholesalePrice: r.wholesalePrice,
            currency,
            source: 'import',
            active: true,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Import failed')
      onImported(data.added || 0, data.updated || 0)
    } catch (e: any) {
      setError(e?.message || 'Import failed')
      setBusy(false)
    }
  }

  const columnOptions = useMemo(() => {
    const width = grid.reduce((m, r) => Math.max(m, r.length), 0)
    const header = map.headerRow >= 0 ? grid[map.headerRow] || [] : []
    return Array.from({ length: width }, (_, i) => ({
      value: i,
      label: header[i]?.trim() ? `${i + 1} · ${header[i].trim()}` : `Column ${i + 1}`,
    }))
  }, [grid, map.headerRow])

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl rounded-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Import price list — {supplierName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Reads SKU, description and wholesale price only. Currency comes from the supplier
              unless you change it below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="text-sm bg-red-50 text-red-700 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {stage === 'pick' && (
            <>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  id="cat-import-file"
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onFile(f)
                  }}
                />
                <label
                  htmlFor="cat-import-file"
                  className="inline-block px-5 py-3 rounded-md bg-gray-900 text-white font-medium cursor-pointer hover:bg-gray-800"
                >
                  {busy ? 'Reading…' : 'Choose a file'}
                </label>
                <p className="text-xs text-gray-500 mt-3">Excel (.xlsx/.xls), CSV or PDF</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Google Sheet link
                </label>
                <div className="flex gap-2">
                  <input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/…"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    type="button"
                    onClick={onSheet}
                    disabled={busy || !sheetUrl.trim()}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white disabled:opacity-40"
                  >
                    Fetch
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  The sheet must be shared as “anyone with the link can view”, or Google will refuse
                  it.
                </p>
              </div>
            </>
          )}

          {stage === 'map' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                Couldn’t work out the columns in <strong>{sourceName}</strong>. Point them out:
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {(
                  [
                    ['sku', 'SKU column'],
                    ['description', 'Description column'],
                    ['wholesalePrice', 'Wholesale price column'],
                  ] as const
                ).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="block text-xs text-gray-500 mb-1">{label}</span>
                    <select
                      value={map[field]}
                      onChange={(e) => applyMap({ ...map, [field]: Number(e.target.value) })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value={-1}>— none —</option>
                      {columnOptions.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <label className="block max-w-xs">
                <span className="block text-xs text-gray-500 mb-1">
                  First row of data (skip headers)
                </span>
                <input
                  type="number"
                  min={0}
                  value={map.headerRow + 1}
                  onChange={(e) => applyMap({ ...map, headerRow: Number(e.target.value) - 1 })}
                  className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                />
              </label>

              <div className="border border-gray-200 rounded overflow-x-auto max-h-48">
                <table className="min-w-full text-xs">
                  <tbody>
                    {grid.slice(0, 8).map((r, i) => (
                      <tr key={i} className={i === map.headerRow ? 'bg-amber-50 font-medium' : ''}>
                        {r.map((c, j) => (
                          <td key={j} className="border border-gray-100 px-2 py-1 whitespace-nowrap">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                onClick={() => setStage('preview')}
                disabled={map.sku < 0}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-900 text-white disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          )}

          {stage === 'preview' && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Brand</label>
                  <input
                    list="import-brands"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Required"
                    className={`px-3 py-2 border rounded-md text-sm w-48 ${
                      brand.trim() ? 'border-gray-300' : 'border-red-300 bg-red-50'
                    }`}
                  />
                  <datalist id="import-brands">
                    {brands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {grid.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStage('map')}
                    className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Change columns
                  </button>
                )}
                <div className="text-sm text-gray-600 pb-2 ml-auto">
                  <strong>{included.length}</strong> of {rows.length} ticked
                  {unpriced > 0 && (
                    <span className="text-amber-700"> · {unpriced} with no price</span>
                  )}
                  {duplicates.size > 0 && (
                    <span className="text-amber-700"> · {duplicates.size} duplicate SKU</span>
                  )}
                </div>
              </div>

              {unpriced > 0 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                  Items with no price still import — they show “On request” to clients until you
                  price them.
                </p>
              )}

              <div className="border border-gray-200 rounded overflow-x-auto max-h-[45vh]">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 w-8"></th>
                      <th className="px-2 py-2">SKU</th>
                      <th className="px-2 py-2">Description</th>
                      <th className="px-2 py-2 text-right">Wholesale ({currency})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r) => {
                      const dupe = duplicates.has(r.sku.trim().toUpperCase())
                      return (
                        <tr key={r.key} className={r.include ? undefined : 'opacity-40'}>
                          <td className="px-2 py-1">
                            <input
                              type="checkbox"
                              checked={r.include}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.key === r.key ? { ...x, include: e.target.checked } : x
                                  )
                                )
                              }
                              className="w-4 h-4"
                              aria-label={`Include ${r.sku}`}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={r.sku}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.key === r.key ? { ...x, sku: e.target.value } : x
                                  )
                                )
                              }
                              className={`w-32 px-1 py-0.5 border rounded font-mono text-xs ${
                                dupe ? 'border-amber-400 bg-amber-50' : 'border-transparent hover:border-gray-300'
                              }`}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              value={r.description}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.key === r.key ? { ...x, description: e.target.value } : x
                                  )
                                )
                              }
                              className="w-full px-1 py-0.5 border border-transparent hover:border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-2 py-1 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={r.wholesalePrice || ''}
                              onChange={(e) =>
                                setRows((prev) =>
                                  prev.map((x) =>
                                    x.key === r.key
                                      ? { ...x, wholesalePrice: Number(e.target.value) || 0 }
                                      : x
                                  )
                                )
                              }
                              className={`w-24 px-1 py-0.5 border rounded text-sm text-right ${
                                r.warning
                                  ? 'border-amber-400 bg-amber-50'
                                  : 'border-transparent hover:border-gray-300'
                              }`}
                              title={r.warning || ''}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            {stage === 'preview'
              ? 'Existing SKUs for this supplier are updated, not duplicated.'
              : 'Nothing is imported until you confirm the preview.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700"
            >
              Cancel
            </button>
            {stage === 'preview' && (
              <button
                type="button"
                onClick={commit}
                disabled={busy || included.length === 0 || !brand.trim()}
                className="px-5 py-2 text-sm font-semibold rounded-md bg-primary text-black disabled:opacity-40"
              >
                {busy ? 'Importing…' : `Import ${included.length}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
