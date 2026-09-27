'use client'

import { Fragment, useMemo, useState } from 'react'
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
import {
  calcEstRetailZAR,
  calcLandedZAR,
  formatZAR,
  isLocalSupplierCurrency,
} from '@/lib/preorder-pricing'
import type { CostingAccount } from '@/types/supplier-preorder'

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ZAR', 'CHF', 'JPY', 'AUD', 'CAD', 'HKD', 'CNY']

interface Props {
  supplierId: string
  supplierName: string
  /** The supplier's own currency — the default, overridable below. */
  supplierCurrency: string
  brands: string[]
  /** Live rates by currency code, so the estimate follows a currency override. */
  rates: Record<string, number>
  /** The supplier's costing account — the Spare Parts calculator's percentages. */
  account: CostingAccount
  onClose: () => void
  onImported: (added: number, updated: number) => void
}

type Stage = 'pick' | 'map' | 'preview'

/** One line of the costing breakdown: what was applied, and the running figure. */
function Step({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <span className="text-gray-500">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

interface EditableRow extends ParsedRow {
  key: string
  include: boolean
}

export default function CatalogueImportModal({
  supplierId,
  supplierName,
  supplierCurrency,
  brands,
  rates,
  account,
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [maximised, setMaximised] = useState(false)

  // Follows the currency override, not just the supplier's default, so changing
  // the dropdown re-prices the preview against the right rate.
  const rate = currency === 'ZAR' ? 1 : rates[currency] || 0
  const isLocal = isLocalSupplierCurrency(currency)

  const toggleRow = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

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
      <div
        className={`bg-white w-full rounded-lg shadow-xl flex flex-col ${
          maximised ? 'max-w-none h-full max-h-full' : 'max-w-5xl max-h-[90vh]'
        }`}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Import price list — {supplierName}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Reads SKU, description and wholesale price only. Currency comes from the supplier
              unless you change it below.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMaximised((m) => !m)}
              className="text-gray-400 hover:text-gray-700 text-lg leading-none px-2"
              aria-label={maximised ? 'Restore size' : 'Maximise'}
              title={maximised ? 'Restore size' : 'Maximise'}
            >
              {maximised ? '⤡' : '⤢'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none px-2"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
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

              <p className="text-xs text-gray-500">
                Est. Retail is worked out by the Spare Parts calculator ({account.name}) at the
                live {currency} rate. It is shown for review only — it is never stored, and it
                keeps moving with the rate after import (Rule 63).
              </p>

              <div
                className={`border border-gray-200 rounded overflow-x-auto ${
                  maximised ? 'max-h-[70vh]' : 'max-h-[45vh]'
                }`}
              >
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-2 py-2 w-8"></th>
                      <th className="px-2 py-2">SKU</th>
                      <th className="px-2 py-2">Description</th>
                      <th className="px-2 py-2 text-right">Wholesale ({currency})</th>
                      <th className="px-2 py-2 text-right">Est. Retail (ZAR)</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((r) => {
                      const dupe = duplicates.has(r.sku.trim().toUpperCase())
                      const open = expanded.has(r.key)
                      // Rule 65: a ZAR supplier is local, so the import
                      // percentages are never applied and the estimate comes
                      // from Inventory instead — which this sheet cannot know.
                      const estimate =
                        isLocal || !rate || r.wholesalePrice <= 0
                          ? 0
                          : calcEstRetailZAR(r.wholesalePrice, rate, account)
                      // Landed comes from the real function, never a local copy
                      // of the formula, so the breakdown cannot drift from the
                      // number the rest of the site quotes (Rule 60).
                      const landed = calcLandedZAR(r.wholesalePrice, rate, account)
                      const afterMarkup = landed * (1 + (account.markupPct || 0) / 100)
                      const importPct =
                        (account.shippingPct || 0) + (account.customsPct || 0) + (account.handlingPct || 0)
                      return (
                        <Fragment key={r.key}>
                        <tr className={r.include ? undefined : 'opacity-40'}>
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
                          <td className="px-2 py-1 text-right whitespace-nowrap">
                            {estimate > 0 ? (
                              <span className="font-semibold text-gray-900">{formatZAR(estimate)}</span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                {isLocal
                                  ? 'From Inventory'
                                  : !rate
                                    ? 'No rate'
                                    : 'On request'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              onClick={() => toggleRow(r.key)}
                              className="text-gray-400 hover:text-gray-800 text-xs px-1"
                              aria-expanded={open}
                              aria-label={`${open ? 'Hide' : 'Show'} costing for ${r.sku}`}
                            >
                              {open ? '▾' : '▸'}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-8 py-3">
                              {estimate > 0 ? (
                                <div className="text-xs text-gray-700 max-w-md space-y-1">
                                  <Step label={`Wholesale (${currency})`} value={r.wholesalePrice.toFixed(2)} />
                                  <Step label={`× exchange rate ${rate.toFixed(4)}`} value={formatZAR(r.wholesalePrice * rate)} />
                                  <Step
                                    label={`+ shipping ${account.shippingPct || 0}% + customs ${account.customsPct || 0}%${
                                      account.handlingPct ? ` + handling ${account.handlingPct}%` : ''
                                    } = ${importPct}%`}
                                    value={formatZAR(landed)}
                                  />
                                  <Step label={`× markup ${account.markupPct || 0}%`} value={formatZAR(afterMarkup)} />
                                  <Step label={`× VAT ${account.vatPct || 0}%`} value={formatZAR(estimate)} />
                                  <div className="flex justify-between border-t border-gray-300 pt-1 mt-1 font-semibold text-gray-900">
                                    <span>Est. Retail</span>
                                    <span>{formatZAR(estimate)}</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 pt-1">
                                    {account.name} · Spare Parts calculator · live rate, not stored
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  {isLocal
                                    ? `${currency} is a local currency — the import percentages are never applied and the estimate comes from Inventory instead (Rule 65).`
                                    : !rate
                                      ? `No live ${currency} exchange rate, so no estimate can be worked out.`
                                      : 'No wholesale price on this row — clients see “On request” until it is priced.'}
                                </p>
                              )}
                            </td>
                          </tr>
                        )}
                        </Fragment>
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
