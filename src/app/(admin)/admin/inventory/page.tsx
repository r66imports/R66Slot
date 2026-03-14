'use client'

import { useState, useEffect, useRef } from 'react'

interface Product {
  id: string
  sku: string
  title: string
  brand: string
  quantity: number
  status: 'draft' | 'active'
  imageUrl: string
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [counts, setCounts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})
  const [saveAllLoading, setSaveAllLoading] = useState(false)
  const [saveAllDone, setSaveAllDone] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((data) => {
        const list: Product[] = (data.products || data || []).map((p: any) => ({
          id: p.id,
          sku: p.sku || '',
          title: p.title || '',
          brand: p.brand || '',
          quantity: p.quantity ?? 0,
          status: p.status || 'draft',
          imageUrl: p.imageUrl || p.image_url || '',
        }))
        // Sort by SKU numerically
        list.sort((a, b) => {
          const na = parseFloat(a.sku) || 0
          const nb = parseFloat(b.sku) || 0
          if (na !== nb) return na - nb
          return a.sku.localeCompare(b.sku)
        })
        setProducts(list)
        // Init counts from DB
        const init: Record<string, string> = {}
        list.forEach((p) => { init[p.id] = String(p.quantity) })
        setCounts(init)
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = products.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return p.sku.toLowerCase().includes(q) || p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
  })

  async function saveOne(id: string) {
    const val = parseInt(counts[id] ?? '0', 10)
    if (isNaN(val)) return
    setSaving((s) => ({ ...s, [id]: true }))
    try {
      await fetch('/api/admin/pos/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, mode: 'set', qty: val }),
      })
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, quantity: val } : p))
      setSaved((s) => ({ ...s, [id]: true }))
      setTimeout(() => setSaved((s) => ({ ...s, [id]: false })), 2000)
    } finally {
      setSaving((s) => ({ ...s, [id]: false }))
    }
  }

  async function saveAll() {
    const changed = filtered.filter((p) => String(p.quantity) !== counts[p.id])
    if (!changed.length) return
    setSaveAllLoading(true)
    for (const p of changed) {
      await saveOne(p.id)
    }
    setSaveAllLoading(false)
    setSaveAllDone(true)
    setTimeout(() => setSaveAllDone(false), 2500)
  }

  function handleKey(e: React.KeyboardEvent, id: string, idx: number) {
    if (e.key === 'Enter') {
      saveOne(id)
      // Move focus to next row
      const nextId = filtered[idx + 1]?.id
      if (nextId && inputRefs.current[nextId]) {
        inputRefs.current[nextId]!.focus()
        inputRefs.current[nextId]!.select()
      }
    }
  }

  const changedCount = filtered.filter((p) => String(p.quantity) !== counts[p.id]).length

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Count</h1>
          <p className="text-sm text-gray-500 mt-1">Update stock quantities — press Enter to save each row</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saveAllLoading || changedCount === 0}
          className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saveAllLoading ? (
            <><span className="animate-spin">⏳</span> Saving…</>
          ) : saveAllDone ? (
            '✅ Saved!'
          ) : (
            `Save All${changedCount > 0 ? ` (${changedCount} changed)` : ''}`
          )}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search SKU, product name or brand…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 text-sm text-gray-500">
        <span>{filtered.length} products</span>
        {changedCount > 0 && <span className="text-orange-600 font-medium">{changedCount} unsaved changes</span>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading inventory…</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-12">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-24">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32">Brand</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28">DB Qty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-32">Count</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-20">Save</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, idx) => {
                const countVal = counts[product.id] ?? String(product.quantity)
                const isDirty = countVal !== String(product.quantity)
                return (
                  <tr
                    key={product.id}
                    className={`border-b last:border-0 ${isDirty ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className="px-4 py-2 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-gray-600">{product.sku || '—'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        {product.imageUrl && (
                          <img src={product.imageUrl} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-800 truncate max-w-[220px]">{product.title}</span>
                        {product.status === 'draft' && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">draft</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">{product.brand || '—'}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="text-sm font-semibold text-gray-700">{product.quantity}</span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        ref={(el) => { inputRefs.current[product.id] = el }}
                        type="number"
                        min="0"
                        value={countVal}
                        onChange={(e) => setCounts((c) => ({ ...c, [product.id]: e.target.value }))}
                        onKeyDown={(e) => handleKey(e, product.id, idx)}
                        className={`w-20 text-center text-sm font-semibold px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                          isDirty ? 'border-orange-400 bg-white' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {saved[product.id] ? (
                        <span className="text-xs text-green-600 font-medium">✓ Saved</span>
                      ) : (
                        <button
                          onClick={() => saveOne(product.id)}
                          disabled={!isDirty || saving[product.id]}
                          className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          {saving[product.id] ? '…' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
