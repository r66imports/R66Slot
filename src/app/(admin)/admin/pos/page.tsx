'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

type Product = {
  id: string
  title: string
  sku: string
  barcode: string | null
  brand: string | null
  price: number
  quantity: number | null
  trackQuantity: boolean
  status: string
  imageUrl: string | null
  images: string[]
}

type LogEntry = {
  id: string
  ts: string
  product: Product
  mode: 'add' | 'subtract' | 'set'
  qty: number
  newQty: number
}

type Mode = 'add' | 'subtract' | 'set'

export default function POSPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const qtyRef = useRef<HTMLInputElement>(null)

  const [scanValue, setScanValue] = useState('')
  const [qty, setQty] = useState(1)
  const [mode, setMode] = useState<Mode>('add')
  const [product, setProduct] = useState<Product | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])
  const [flash, setFlash] = useState<'success' | 'error' | null>(null)

  // Always keep barcode input focused
  const refocus = useCallback(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const triggerFlash = (type: 'success' | 'error') => {
    setFlash(type)
    setTimeout(() => setFlash(null), 800)
  }

  const handleScan = useCallback(async (value: string) => {
    const q = value.trim()
    if (!q) return
    setScanValue('')
    setError(null)
    setProduct(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/admin/pos/scan?q=${encodeURIComponent(q)}`)
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Not found')
        triggerFlash('error')
        refocus()
        return
      }
      const data: Product = await res.json()
      setProduct(data)
      // Auto-update stock immediately on scan
      await applyStock(data, mode, qty)
    } finally {
      setLoading(false)
      refocus()
    }
  }, [mode, qty, refocus]) // eslint-disable-line react-hooks/exhaustive-deps

  const applyStock = async (p: Product, m: Mode, q: number) => {
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/pos/stock', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, mode: m, qty: q }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Update failed')
        triggerFlash('error')
        return
      }
      const data = await res.json()
      const updated = { ...p, quantity: data.quantity }
      setProduct(updated)
      const entry: LogEntry = {
        id: `${Date.now()}-${p.id}`,
        ts: new Date().toLocaleTimeString(),
        product: updated,
        mode: m,
        qty: q,
        newQty: data.quantity,
      }
      setLog(prev => [entry, ...prev].slice(0, 50))
      triggerFlash('success')
    } finally {
      setUpdating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(scanValue)
    }
  }

  const handleManualApply = () => {
    if (product) applyStock(product, mode, qty)
  }

  const modeLabel: Record<Mode, string> = {
    add: 'Receive Stock (+)',
    subtract: 'Sell / Remove (−)',
    set: 'Set Exact (=)',
  }

  const modeColor: Record<Mode, string> = {
    add: 'bg-green-600 hover:bg-green-700',
    subtract: 'bg-red-600 hover:bg-red-700',
    set: 'bg-blue-600 hover:bg-blue-700',
  }

  const flashBorder =
    flash === 'success' ? 'ring-4 ring-green-400' :
    flash === 'error' ? 'ring-4 ring-red-400' : ''

  const imageUrl = product?.images?.[0] || product?.imageUrl || null

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Point of Sale</h1>
            <p className="text-gray-400 text-sm mt-0.5">Scan barcode or type SKU + Enter</p>
          </div>
          <a
            href="/admin/products"
            className="text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors"
          >
            ← Products
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Scanner + Controls */}
          <div className="space-y-4">
            {/* Mode Selector */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {(['add', 'subtract', 'set'] as Mode[]).map(m => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); refocus() }}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      mode === m
                        ? modeColor[m] + ' text-white shadow-lg scale-105'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {m === 'add' ? 'Receive +' : m === 'subtract' ? 'Sell −' : 'Set ='}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">{modeLabel[mode]}</p>
            </div>

            {/* Quantity */}
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Quantity</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setQty(q => Math.max(1, q - 1)); refocus() }}
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-xl font-bold flex items-center justify-center"
                >−</button>
                <input
                  ref={qtyRef}
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  onBlur={refocus}
                  className="w-20 text-center text-xl font-bold bg-gray-800 border border-gray-700 rounded-lg py-2 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => { setQty(q => q + 1); refocus() }}
                  className="w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 text-xl font-bold flex items-center justify-center"
                >+</button>
              </div>
            </div>

            {/* Barcode Input */}
            <div className={`bg-gray-900 rounded-xl p-4 border border-gray-800 transition-all ${flashBorder}`}>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Barcode / SKU</p>
              <input
                ref={inputRef}
                type="text"
                value={scanValue}
                onChange={e => setScanValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Waiting for scan..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg font-mono focus:outline-none focus:border-blue-500 placeholder-gray-600"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              <p className="text-xs text-gray-600 mt-2">Scanner sends Enter automatically — or press Enter manually</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Loading */}
            {(loading || updating) && (
              <div className="text-center text-gray-400 text-sm py-2 animate-pulse">
                {loading ? 'Looking up product...' : 'Updating stock...'}
              </div>
            )}
          </div>

          {/* Right — Product Card + Log */}
          <div className="space-y-4">
            {/* Product Card */}
            {product ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                <div className="flex gap-4 p-4">
                  {imageUrl ? (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-800">
                      <Image src={imageUrl} alt={product.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-2xl">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-white leading-tight">{product.title}</h2>
                    {product.brand && <p className="text-sm text-gray-400 mt-0.5">{product.brand}</p>}
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {product.sku && <span>SKU: {product.sku}</span>}
                      {product.barcode && <span>Barcode: {product.barcode}</span>}
                    </div>
                    <p className="text-sm text-gray-300 mt-1">R {product.price?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Stock Display */}
                <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Stock on Hand</p>
                    <p className={`text-3xl font-bold mt-0.5 ${
                      product.quantity === null ? 'text-gray-500' :
                      product.quantity <= 0 ? 'text-red-400' :
                      product.quantity <= 5 ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {product.trackQuantity ? (product.quantity ?? '—') : 'Untracked'}
                    </p>
                  </div>
                  <button
                    onClick={handleManualApply}
                    disabled={updating}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 ${modeColor[mode]} text-white`}
                  >
                    {mode === 'add' ? `+ ${qty}` : mode === 'subtract' ? `− ${qty}` : `= ${qty}`}
                  </button>
                </div>

                <div className="border-t border-gray-800 px-4 py-2 flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${product.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-xs text-gray-500 capitalize">{product.status}</span>
                  <a
                    href={`/admin/products/${product.id}`}
                    className="ml-auto text-xs text-blue-400 hover:text-blue-300"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Edit product →
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl border border-dashed border-gray-700 p-10 text-center text-gray-600">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm">Scan a barcode or type a SKU to get started</p>
              </div>
            )}

            {/* Session Log */}
            {log.length > 0 && (
              <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Session Log</p>
                  <button
                    onClick={() => setLog([])}
                    className="text-xs text-gray-600 hover:text-gray-400"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-800">
                  {log.map(entry => (
                    <div key={entry.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="text-gray-600 text-xs w-14 flex-shrink-0">{entry.ts}</span>
                      <span className={`text-xs font-bold w-4 flex-shrink-0 ${
                        entry.mode === 'add' ? 'text-green-400' :
                        entry.mode === 'subtract' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {entry.mode === 'add' ? '+' : entry.mode === 'subtract' ? '−' : '='}
                      </span>
                      <span className="flex-1 truncate text-gray-300">{entry.product.title}</span>
                      <span className="text-gray-500 text-xs flex-shrink-0">
                        {entry.mode === 'add' ? `+${entry.qty}` : entry.mode === 'subtract' ? `−${entry.qty}` : `=${entry.qty}`}
                        {' → '}
                        <span className={entry.newQty <= 0 ? 'text-red-400' : 'text-white'}>{entry.newQty}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
