'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  compareSku,
  formatZAR,
  accountById,
  calcEstRetailZAR,
  isLocalSupplierCurrency,
} from '@/lib/preorder-pricing'
import CatalogueImportModal from '@/components/admin/catalogue-import-modal'
import type { CostingAccount, SupplierCatalogueItem } from '@/types/supplier-preorder'

interface Supplier {
  id: string
  name: string
  preferredCurrency?: string
  brands?: string[]
  defaultAccount?: 'JDM' | 'R66'
}

const CURRENCIES = ['EUR', 'USD', 'GBP', 'ZAR', 'CHF', 'JPY', 'AUD', 'CAD', 'HKD', 'CNY']

const blankRow = () => ({
  id: '',
  brand: '',
  sku: '',
  description: '',
  wholesalePrice: 0,
  currency: '',
})

export default function SupplierCataloguePage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [catalogue, setCatalogue] = useState<SupplierCatalogueItem[]>([])
  const [accounts, setAccounts] = useState<CostingAccount[]>([])
  const [rates, setRates] = useState<Record<string, number>>({})

  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState(blankRow())
  const [brandInput, setBrandInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [showCosting, setShowCosting] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const supplier = useMemo(() => suppliers.find((s) => s.id === selectedId), [suppliers, selectedId])

  const loadCatalogue = useCallback(async (supplierId: string) => {
    if (!supplierId) return setCatalogue([])
    const res = await fetch(`/api/admin/supplier-catalogue?supplierId=${supplierId}&all=true`)
    if (res.ok) setCatalogue(await res.json())
  }, [])

  useEffect(() => {
    ;(async () => {
      const [sRes, aRes, rRes] = await Promise.all([
        fetch('/api/admin/supplier-contacts'),
        fetch('/api/admin/costing-accounts'),
        fetch('/api/admin/exchange-rate'),
      ])
      if (sRes.ok) {
        const list: Supplier[] = await sRes.json()
        setSuppliers(list)
        if (list.length > 0) setSelectedId((cur) => cur || list[0].id)
      }
      if (aRes.ok) setAccounts(await aRes.json())
      if (rRes.ok) setRates((await rRes.json()).rates || {})
    })()
  }, [])

  useEffect(() => {
    loadCatalogue(selectedId)
  }, [selectedId, loadCatalogue])

  const currency = (supplier?.preferredCurrency || 'EUR').toUpperCase()
  const account = accountById(accounts, supplier?.defaultAccount)
  const rate = currency === 'ZAR' ? 1 : rates[currency] || 0

  const saveSupplier = async (patch: Partial<Supplier>) => {
    if (!supplier) return
    const next = { ...supplier, ...patch }
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? next : s)))
    await fetch(`/api/admin/supplier-contacts/${supplier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
  }

  const addBrand = () => {
    const b = brandInput.trim()
    if (!b || !supplier) return
    const brands = supplier.brands || []
    if (brands.some((x) => x.toLowerCase() === b.toLowerCase())) return setBrandInput('')
    saveSupplier({ brands: [...brands, b].sort((a, c) => a.localeCompare(c)) })
    setBrandInput('')
  }

  const removeBrand = (b: string) =>
    saveSupplier({ brands: (supplier?.brands || []).filter((x) => x !== b) })

  const saveAccount = async (acct: CostingAccount) => {
    setAccounts((prev) => prev.map((a) => (a.id === acct.id ? acct : a)))
    await fetch('/api/admin/costing-accounts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(acct),
    })
  }

  const saveRow = async (row: Partial<SupplierCatalogueItem>) => {
    if (!supplier || !(row.sku || '').trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/supplier-catalogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...row,
          supplierId: supplier.id,
          supplierName: supplier.name,
          currency: row.currency || currency,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error || 'Save failed')
      await loadCatalogue(supplier.id)
      setDraft(blankRow())
      setNote(null)
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Save failed' })
    } finally {
      setBusy(false)
    }
  }

  const deleteRow = async (id: string) => {
    if (!confirm('Remove this item from the supplier sheet? It does not affect Inventory.')) return
    await fetch(`/api/admin/supplier-catalogue?id=${id}`, { method: 'DELETE' })
    loadCatalogue(selectedId)
  }

  const runSeed = async (dryRun: boolean) => {
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch(`/api/admin/supplier-catalogue/seed?dryRun=${dryRun}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Seed failed')
      const tail = data.skippedNoBrand > 0 ? ` ${data.skippedNoBrand} skipped (no brand on the product).` : ''
      setNote({
        kind: 'ok',
        text: dryRun
          ? `Dry run: would add ${data.added} items across ${data.brands.length} brands.${tail}`
          : `Added ${data.added} items.${tail}`,
      })
      if (!dryRun) loadCatalogue(selectedId)
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Seed failed' })
    } finally {
      setBusy(false)
    }
  }

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = q
      ? catalogue.filter(
          (i) => i.sku.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
        )
      : catalogue
    return [...rows].sort((a, b) => a.brand.localeCompare(b.brand) || compareSku(a.sku, b.sku))
  }, [catalogue, search])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Catalogue</h1>
        <p className="text-sm text-gray-600 mt-1">
          The sheet clients order from. These rows are <strong>requests only</strong> — nothing here
          is inventory, creates a product or moves stock.
        </p>
      </div>

      {note && (
        <div
          className={`text-sm rounded-md px-3 py-2 ${
            note.kind === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {note.text}
        </div>
      )}

      {/* Supplier + brands */}
      <div className="bg-white rounded-lg shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-56"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => saveSupplier({ preferredCurrency: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Costing account</label>
            <select
              value={supplier?.defaultAccount || 'JDM'}
              onChange={(e) => saveSupplier({ defaultAccount: e.target.value as 'JDM' | 'R66' })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="JDM">JDM Garage — standard</option>
              <option value="R66">Route 66 Imports — spare parts</option>
            </select>
          </div>
          <div className="text-sm text-gray-500 pb-2">
            Rate: {rate > 0 ? `1 ${currency} = ${formatZAR(rate)}` : `no rate for ${currency}`}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Brands this supplier sells
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {(supplier?.brands || []).length === 0 && (
              <span className="text-sm text-gray-400">
                None yet — a brand must be listed here for clients to find it.
              </span>
            )}
            {(supplier?.brands || []).map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-sm text-gray-800"
              >
                {b}
                <button
                  type="button"
                  onClick={() => removeBrand(b)}
                  className="text-gray-400 hover:text-red-600"
                  aria-label={`Remove ${b}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={brandInput}
              onChange={(e) => setBrandInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBrand())}
              placeholder="Add a brand…"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-56"
            />
            <button
              type="button"
              onClick={addBrand}
              className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Costing accounts */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <button
          type="button"
          onClick={() => setShowCosting((v) => !v)}
          className="flex items-center justify-between w-full text-left"
        >
          <div>
            <h2 className="font-semibold text-gray-900">Costing accounts</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Drives every estimated retail price on the client sheet. Set to match the Business
              Calculator’s Spare Parts mode — its single 45% shipping &amp; customs figure split into
              25% + 20%. Keep those two summing to 45 or the two will quote different prices.
            </p>
          </div>
          <span className="text-gray-400">{showCosting ? '▲' : '▼'}</span>
        </button>

        {showCosting && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {accounts.map((a) => (
              <div key={a.id} className="border border-gray-200 rounded-md p-4">
                <h3 className="font-semibold text-sm text-gray-900 mb-3">
                  {a.name}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {a.id === 'R66' ? 'spare parts' : 'standard'}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ['shippingPct', 'Shipping %'],
                      ['customsPct', 'Customs %'],
                      ['handlingPct', 'Handling %'],
                      ['markupPct', 'Markup %'],
                      ['vatPct', 'VAT %'],
                      ['landedMultiplier', 'Landed ×'],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="block text-xs text-gray-500 mb-1">{label}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={a[field]}
                        onChange={(e) =>
                          setAccounts((prev) =>
                            prev.map((x) =>
                              x.id === a.id ? { ...x, [field]: Number(e.target.value) || 0 } : x
                            )
                          )
                        }
                        onBlur={() => saveAccount(a)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  100.00 {currency} →{' '}
                  <strong className="text-gray-800">{formatZAR(calcEstRetailZAR(100, rate, a))}</strong>{' '}
                  est. retail
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Catalogue rows */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="font-semibold text-gray-900">
            Items <span className="text-sm font-normal text-gray-500">({visible.length})</span>
          </h2>
          <div className="flex gap-2">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU or description…"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm w-60"
            />
            <button
              type="button"
              onClick={() => setShowImport(true)}
              disabled={busy || !supplier}
              className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-black disabled:opacity-40"
            >
              Import price list
            </button>
            <button
              type="button"
              onClick={() => runSeed(true)}
              disabled={busy}
              className="px-3 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
              title="Pull SKUs already linked to a supplier on the Price Lists page"
            >
              From Price Lists (dry run)
            </button>
            <button
              type="button"
              onClick={() => runSeed(false)}
              disabled={busy}
              className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40"
            >
              From Price Lists
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-2 pr-3 font-medium">Brand</th>
                <th className="py-2 pr-3 font-medium">SKU</th>
                <th className="py-2 pr-3 font-medium">Description</th>
                <th className="py-2 pr-3 font-medium text-right">Wholesale</th>
                <th className="py-2 pr-3 font-medium text-right">Est. Retail</th>
                <th className="py-2 pr-3 font-medium text-center">Live</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* New row */}
              <tr className="bg-gray-50">
                <td className="py-2 pr-3">
                  <input
                    list="brand-options"
                    value={draft.brand}
                    onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                    placeholder="Brand"
                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <datalist id="brand-options">
                    {(supplier?.brands || []).map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={draft.sku}
                    onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                    placeholder="SKU"
                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    placeholder="Description"
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.wholesalePrice || ''}
                    onChange={(e) => setDraft({ ...draft, wholesalePrice: Number(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                  />
                </td>
                <td className="py-2 pr-3 text-right text-gray-500">
                  {isLocalSupplierCurrency(currency)
                    ? 'From Inventory'
                    : formatZAR(calcEstRetailZAR(draft.wholesalePrice, rate, account))}
                </td>
                <td></td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => saveRow(draft)}
                    disabled={busy || !draft.sku.trim() || !draft.brand.trim()}
                    className="px-3 py-1 text-sm font-medium rounded bg-primary text-black disabled:opacity-30"
                  >
                    Add
                  </button>
                </td>
              </tr>

              {visible.map((item) => (
                <tr key={item.id} className={item.active === false ? 'opacity-50' : undefined}>
                  <td className="py-2 pr-3 text-gray-600">{item.brand}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{item.sku}</td>
                  <td className="py-2 pr-3">
                    <input
                      defaultValue={item.description}
                      onBlur={(e) =>
                        e.target.value !== item.description &&
                        saveRow({ ...item, description: e.target.value })
                      }
                      className="w-full px-2 py-1 border border-transparent hover:border-gray-300 focus:border-gray-300 rounded text-sm"
                    />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={item.wholesalePrice}
                      onBlur={(e) =>
                        Number(e.target.value) !== item.wholesalePrice &&
                        saveRow({ ...item, wholesalePrice: Number(e.target.value) || 0 })
                      }
                      className="w-24 px-2 py-1 border border-transparent hover:border-gray-300 focus:border-gray-300 rounded text-sm text-right"
                    />
                    <span className="ml-1 text-xs text-gray-400">{item.currency}</span>
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold">
                    {isLocalSupplierCurrency(item.currency) ? (
                      <span className="font-normal text-gray-500" title="A local supplier pays no shipping or customs, so the client is quoted the Inventory retail price (Rule 65)">
                        From Inventory
                      </span>
                    ) : (
                      formatZAR(
                        calcEstRetailZAR(
                          item.wholesalePrice,
                          item.currency === currency ? rate : rates[item.currency] || 0,
                          account
                        )
                      )
                    )}
                  </td>
                  <td className="py-2 pr-3 text-center">
                    <input
                      type="checkbox"
                      checked={item.active !== false}
                      onChange={(e) => saveRow({ ...item, active: e.target.checked })}
                      className="w-4 h-4"
                      aria-label={`Show ${item.sku} on the client sheet`}
                    />
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteRow(item.id)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {visible.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-gray-500">
                    No items yet. Add one above, or import from Price Lists.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImport && supplier && (
        <CatalogueImportModal
          supplierId={supplier.id}
          supplierName={supplier.name}
          supplierCurrency={currency}
          brands={supplier.brands || []}
          onClose={() => setShowImport(false)}
          onImported={(added, updated) => {
            setShowImport(false)
            setNote({
              kind: 'ok',
              text: `Imported ${added} new item${added === 1 ? '' : 's'}${
                updated > 0 ? `, updated ${updated} existing` : ''
              }.`,
            })
            loadCatalogue(selectedId)
          }}
        />
      )}
    </div>
  )
}
