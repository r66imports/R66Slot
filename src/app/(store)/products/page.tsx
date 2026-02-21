'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice: number | null
  brand: string
  productType: string
  scale: string
  collections: string[]
  tags: string[]
  quantity: number
  status: 'draft' | 'active'
  imageUrl: string
  eta: string
  carType: string
  carClass?: string
  sku?: string
}

const BOOK_NOW_URL = 'https://r66slot.co.za/book'

const RACING_CLASSES = ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA']

// ─── Pre-Order PDF builder ────────────────────────────────────────────────────
function buildPreOrderPDF(product: Product): string {
  const chips = [product.carClass, product.scale, product.carType]
    .filter(Boolean)
    .map(c => `<span style="display:inline-block;background:#111;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;margin:0 3px;">${c}</span>`)
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  @page { size: A5; margin: 0; }
  body { font-family: 'Arial', sans-serif; width:148mm; min-height:210mm; background:#fff; }
  .header { background:#111; color:#fff; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
  .logo { font-size:22px; font-weight:900; letter-spacing:1px; }
  .logo span { color:#e53e3e; }
  .badge { background:#e53e3e; color:#fff; font-size:9px; font-weight:700; padding:3px 10px; border-radius:12px; letter-spacing:1px; }
  .img-wrap { background:#f5f5f5; display:flex; align-items:center; justify-content:center; height:140px; overflow:hidden; }
  .img-wrap img { max-height:130px; max-width:100%; object-fit:contain; }
  .body { padding:16px 20px; }
  .brand { font-size:10px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
  .title { font-size:16px; font-weight:900; color:#111; margin-bottom:8px; line-height:1.3; }
  .chips { margin-bottom:12px; }
  .price-row { display:flex; align-items:baseline; gap:10px; margin-bottom:8px; }
  .price { font-size:26px; font-weight:900; color:#e53e3e; }
  .compare { font-size:14px; color:#aaa; text-decoration:line-through; }
  .eta { font-size:11px; color:#666; margin-bottom:16px; }
  .cta { text-align:center; background:#e53e3e; border-radius:10px; padding:14px; margin-top:8px; }
  .cta a { color:#fff; text-decoration:none; font-size:15px; font-weight:900; letter-spacing:1px; display:block; }
  .cta small { display:block; font-size:10px; color:rgba(255,255,255,0.8); margin-top:4px; }
  .footer { background:#111; color:#666; font-size:9px; text-align:center; padding:8px; position:absolute; bottom:0; width:100%; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">R66<span>SLOT</span></div>
    <div class="badge">PRE-ORDER</div>
  </div>
  ${product.imageUrl ? `<div class="img-wrap"><img src="${product.imageUrl}" alt="${product.title}"/></div>` : ''}
  <div class="body">
    ${product.brand ? `<div class="brand">${product.brand}</div>` : ''}
    <div class="title">${product.title}</div>
    ${chips ? `<div class="chips">${chips}</div>` : ''}
    <div class="price-row">
      <div class="price">${product.price > 0 ? `R${product.price.toFixed(2)}` : 'POA'}</div>
      ${product.compareAtPrice && product.compareAtPrice > product.price ? `<div class="compare">R${product.compareAtPrice.toFixed(2)}</div>` : ''}
    </div>
    ${product.eta ? `<div class="eta">Estimated Delivery: ${product.eta}</div>` : ''}
    <div class="cta">
      <a href="${BOOK_NOW_URL}">
        <span>BOOK NOW</span>
        <small>r66slot.co.za/book</small>
      </a>
    </div>
  </div>
  <div class="footer">r66slot.co.za &nbsp;|&nbsp; Route 66 Slot Cars &nbsp;|&nbsp; South Africa's Premier Slot Car Store</div>
</body>
</html>`
}

// ─── Open pre-order via WhatsApp + PDF ───────────────────────────────────────
function handlePreOrder(product: Product) {
  // 1. Open printable PDF
  const html = buildPreOrderPDF(product)
  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }

  // 2. Open WhatsApp after a short delay
  const priceStr = product.price > 0 ? `R${product.price.toFixed(2)}` : 'POA'
  const etaStr = product.eta ? `\nETA: ${product.eta}` : ''
  const msg = [
    `🏎️ *PRE-ORDER ENQUIRY — R66SLOT*`,
    ``,
    `*${product.title}*`,
    product.brand ? `Brand: ${product.brand}` : '',
    product.carClass ? `Class: ${product.carClass}` : '',
    product.scale ? `Scale: ${product.scale}` : '',
    `Price: ${priceStr}${etaStr}`,
    ``,
    `Please reserve this item for me.`,
    ``,
    `📋 Book Now: ${BOOK_NOW_URL}`,
  ].filter(l => l !== null).join('\n')

  setTimeout(() => {
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }, 400)
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBrand, setFilterBrand] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((data) => {
        const active = Array.isArray(data)
          ? data.filter((p: Product) => p.status === 'active')
          : []
        setProducts(active)
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [])

  // Build unique brand list from products
  const brands = useMemo(() => {
    const set = new Set(products.map((p) => p.brand).filter(Boolean))
    return Array.from(set).sort()
  }, [products])

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
      const matchBrand =
        !filterBrand || p.brand.toLowerCase() === filterBrand.toLowerCase()
      const matchClass =
        !filterClass ||
        p.carClass === filterClass ||
        p.tags?.includes(filterClass)
      return matchSearch && matchBrand && matchClass
    })
  }, [products, search, filterBrand, filterClass])

  const preOrders = filtered.filter((p) => p.collections?.includes('pre-orders'))
  const regular = filtered.filter((p) => !p.collections?.includes('pre-orders'))

  const hasActiveFilters = search || filterBrand || filterClass

  const clearAll = () => {
    setSearch('')
    setFilterBrand('')
    setFilterClass('')
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ─── Site Nav Header ─────────────────────────────────── */}
      <header className="bg-black text-white sticky top-0 z-50 border-b border-gray-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold font-play flex-shrink-0">
              <span className="text-white">R66</span>
              <span className="text-red-500">SLOT</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm text-gray-300 hover:text-white transition-colors">Home</Link>
              <span className="text-sm text-white font-bold border-b-2 border-red-500 pb-0.5">Products</span>
              <Link href="/book" className="text-sm text-gray-300 hover:text-white transition-colors">Book Now</Link>
              <Link href="/brands" className="text-sm text-gray-300 hover:text-white transition-colors">Brands</Link>
              <Link href="/account" className="text-sm text-gray-300 hover:text-white transition-colors">Account</Link>
            </nav>

            {/* Book Now CTA + mobile menu */}
            <div className="flex items-center gap-3">
              <Link
                href="/book"
                className="hidden md:inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                Book Now →
              </Link>
              <button
                className="md:hidden p-2 text-gray-300 hover:text-white"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Menu"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <nav className="md:hidden py-4 border-t border-gray-800 flex flex-col gap-3">
              <Link href="/" className="text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Home</Link>
              <span className="text-sm text-white font-bold">Products</span>
              <Link href="/book" className="text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Book Now</Link>
              <Link href="/brands" className="text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Brands</Link>
              <Link href="/account" className="text-sm text-gray-300 hover:text-white" onClick={() => setMenuOpen(false)}>Account</Link>
            </nav>
          )}
        </div>
      </header>

      {/* ─── Page Header / Filters ───────────────────────────── */}
      <div className="bg-black text-white py-10">
        <div className="container mx-auto px-4">

          {/* Title row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">All Products</h1>
              <p className="text-gray-400 mt-1">
                {loading
                  ? 'Loading…'
                  : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} available`}
              </p>
            </div>
            <Link
              href="/products/select"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              ✓ Multiple Choice Selection
            </Link>
          </div>

          {/* ── Search bar ── */}
          <div className="relative mb-5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="Search products, brands, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 rounded-lg pl-10 pr-10 py-3 focus:outline-none focus:border-red-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* ── Filter columns: Brand & Class ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* — Brand column — */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Search by Brand
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterBrand('')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    !filterBrand
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {brands.map((b) => (
                  <button
                    key={b}
                    onClick={() => setFilterBrand(filterBrand === b ? '' : b)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      filterBrand === b
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-transparent text-gray-300 border-gray-600 hover:border-red-400 hover:text-white'
                    }`}
                  >
                    {b}
                  </button>
                ))}
                {loading && (
                  <span className="text-gray-600 text-xs italic self-center">loading…</span>
                )}
                {!loading && brands.length === 0 && (
                  <span className="text-gray-600 text-xs italic self-center">No brands yet</span>
                )}
              </div>
            </div>

            {/* — Class column — */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                Search by Class
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterClass('')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    !filterClass
                      ? 'bg-white text-black border-white'
                      : 'bg-transparent text-gray-300 border-gray-600 hover:border-gray-400'
                  }`}
                >
                  All
                </button>
                {RACING_CLASSES.map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setFilterClass(filterClass === cls ? '' : cls)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      filterClass === cls
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-transparent text-gray-300 border-gray-600 hover:border-red-400 hover:text-white'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-gray-400 text-sm">Filtering:</span>
              {filterBrand && (
                <span className="bg-red-600/20 border border-red-600/40 text-red-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  Brand: {filterBrand}
                  <button onClick={() => setFilterBrand('')} className="hover:text-white ml-1">✕</button>
                </span>
              )}
              {filterClass && (
                <span className="bg-red-600/20 border border-red-600/40 text-red-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  Class: {filterClass}
                  <button onClick={() => setFilterClass('')} className="hover:text-white ml-1">✕</button>
                </span>
              )}
              {search && (
                <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  &ldquo;{search}&rdquo;
                  <button onClick={() => setSearch('')} className="hover:text-white ml-1">✕</button>
                </span>
              )}
              <button
                onClick={clearAll}
                className="text-gray-500 hover:text-white text-xs underline ml-auto"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Product Grid ─────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🏎️</p>
            <p className="text-xl font-semibold text-gray-700">No products found</p>
            <p className="text-gray-500 mt-2">
              {hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Check back soon for new arrivals.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="mt-4 text-red-600 hover:underline text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Pre-Orders section */}
            {preOrders.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-bold">Pre-Orders</h2>
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {preOrders.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {preOrders.map((p) => (
                    <ProductCard key={p.id} product={p} isPreOrder />
                  ))}
                </div>
              </section>
            )}

            {/* Regular products */}
            {regular.length > 0 && (
              <section>
                {preOrders.length > 0 && (
                  <h2 className="text-2xl font-bold mb-6">All Products</h2>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {regular.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ProductCard({
  product: p,
  isPreOrder = false,
}: {
  product: Product
  isPreOrder?: boolean
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative bg-gray-100 h-48 flex items-center justify-center overflow-hidden">
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">🏎️</span>
        )}
        {isPreOrder && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
            PRE-ORDER
          </span>
        )}
        {p.carClass && (
          <span className="absolute top-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
            {p.carClass}
          </span>
        )}
        {p.eta && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            ETA {p.eta}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          {p.brand && (
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              {p.brand}
            </p>
          )}
          <h3 className="font-bold text-gray-900 leading-snug line-clamp-2 mb-2">
            {p.title}
          </h3>
          <div className="flex flex-wrap gap-1 mb-2">
            {p.carType && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                {p.carType}
              </span>
            )}
            {p.scale && (
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                {p.scale}
              </span>
            )}
          </div>
        </div>

        <div className="mt-2">
          {p.price > 0 ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-gray-900">R{p.price.toFixed(2)}</span>
              {p.compareAtPrice && p.compareAtPrice > p.price && (
                <span className="text-sm text-gray-400 line-through">
                  R{p.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500 italic">POA</span>
          )}
        </div>

        {/* Buttons */}
        <div className={`mt-3 flex gap-2 ${isPreOrder ? 'flex-col' : ''}`}>
          {isPreOrder && (
            <button
              onClick={() => handlePreOrder(p)}
              className="w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Pre Order → WhatsApp
            </button>
          )}
          <a
            href={BOOK_NOW_URL}
            className="flex-1 block text-center bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Book Now
          </a>
        </div>
      </div>
    </div>
  )
}
