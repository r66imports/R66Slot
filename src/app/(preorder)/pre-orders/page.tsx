'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Item = {
  id: string
  sku: string
  description: string
  retailPrice: string
  estimatedRetailPrice: string
  eta: string
  cutoffDate?: string
  brand: string
  unit: string
  imageUrl?: string
  createdAt: string
  minOrderQty?: number
  totalReserved?: number
  moqMet?: boolean
  moqGap?: number
  availableQty?: number
  shipmentStatus?: 'preorder' | 'shipping_soon' | 'shipping'
}

type BrandLogo = {
  id: string
  name: string
  imageUrl: string
  active: boolean
}

// ─── Themes ────────────────────────────────────────────────────────────────────
type Theme = {
  key: string
  name: string
  icon: string
  // layout
  bg: string
  footer: string
  footerText: string
  text: string
  textMuted: string
  textSku: string
  border: string
  // header
  headerBg: string
  headerBorder?: string
  logoR66: string
  logoEmporium: string
  badgeLabel: string
  badgeLabelBg: string
  // brand strip
  brandStrip: string
  brandChipBg: string
  brandChipActive: string
  brandChipActiveText: string
  // cards
  cardBg: string
  cardImageBg: string
  cardRingColor: string
  cardGlow?: string
  accentBar: string
  // accent
  accent: string
  accentText: string
  priceShadow?: string
  // spinner
  spinner: string
  // effects
  scanlines?: boolean
  headerGlow?: string
}

const THEMES: Record<string, Theme> = {
  dark: {
    key: 'dark',
    name: 'Dark',
    icon: '🌑',
    bg: '#111111',
    footer: '#0a0a0a',
    footerText: '#6b7280',
    text: '#ffffff',
    textMuted: '#9ca3af',
    textSku: '#6b7280',
    border: 'rgba(255,255,255,0.08)',
    headerBg: '#C41230',
    logoR66: '#ffffff',
    logoEmporium: '#000000',
    badgeLabel: 'PRE ORDERS',
    badgeLabelBg: 'rgba(0,0,0,0.3)',
    brandStrip: 'rgba(0,0,0,0.2)',
    brandChipBg: 'rgba(255,255,255,0.1)',
    brandChipActive: '#ffffff',
    brandChipActiveText: '#000000',
    cardBg: '#1a1a1a',
    cardImageBg: '#1e1e1e',
    cardRingColor: '#C41230',
    accentBar: '#C41230',
    accent: '#C41230',
    accentText: '#ffffff',
    spinner: '#C41230',
  },

  cyberpunk: {
    key: 'cyberpunk',
    name: 'Cyberpunk',
    icon: '⚡',
    bg: '#06000f',
    footer: '#030008',
    footerText: '#5533aa',
    text: '#e8e0ff',
    textMuted: '#8866cc',
    textSku: '#6644aa',
    border: 'rgba(255,0,255,0.18)',
    headerBg: '#0e0020',
    headerBorder: '2px solid #ff00ff',
    headerGlow: '0 2px 20px rgba(255,0,255,0.35)',
    logoR66: '#00ffff',
    logoEmporium: '#ff00ff',
    badgeLabel: '▸ PRE ORDERS ◂',
    badgeLabelBg: 'rgba(255,0,255,0.15)',
    brandStrip: 'rgba(255,0,255,0.08)',
    brandChipBg: 'rgba(255,0,255,0.1)',
    brandChipActive: '#ff00ff',
    brandChipActiveText: '#000000',
    cardBg: '#0d001e',
    cardImageBg: '#130030',
    cardRingColor: '#ff00ff',
    cardGlow: '0 0 18px rgba(255,0,255,0.25)',
    accentBar: 'linear-gradient(90deg,#ff00ff,#00ffff)',
    accent: '#ff00ff',
    accentText: '#000000',
    priceShadow: '0 0 10px rgba(0,255,255,0.7)',
    spinner: '#ff00ff',
    scanlines: true,
  },

  racing: {
    key: 'racing',
    name: 'Racing',
    icon: '🏁',
    bg: '#f5f5f5',
    footer: '#1a1a1a',
    footerText: '#9ca3af',
    text: '#111111',
    textMuted: '#6b7280',
    textSku: '#9ca3af',
    border: 'rgba(0,0,0,0.08)',
    headerBg: '#111111',
    logoR66: '#ffffff',
    logoEmporium: '#C41230',
    badgeLabel: 'PRE ORDERS',
    badgeLabelBg: 'rgba(196,18,48,0.15)',
    brandStrip: 'rgba(255,255,255,0.08)',
    brandChipBg: 'rgba(255,255,255,0.12)',
    brandChipActive: '#C41230',
    brandChipActiveText: '#ffffff',
    cardBg: '#ffffff',
    cardImageBg: '#f0f0f0',
    cardRingColor: '#C41230',
    accentBar: '#C41230',
    accent: '#C41230',
    accentText: '#ffffff',
    spinner: '#C41230',
  },
}

const THEME_ORDER = ['dark', 'cyberpunk', 'racing']

// ─── Scanlines overlay (cyberpunk) ─────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
        mixBlendMode: 'multiply',
      }}
    />
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function PreOrdersListPage() {
  const [items, setItems] = useState<Item[]>([])
  const [logos, setLogos] = useState<BrandLogo[]>([])
  const [headerLogo, setHeaderLogo] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [activeBrand, setActiveBrand] = useState<string | null>(null)
  const [themeKey, setThemeKey] = useState<string>('dark')
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [resellerBlocked, setResellerBlocked] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/auth/reseller-check').then(async r => {
      const data = await r.json().catch(() => ({}))
      // Block only if reseller WITHOUT full access
      setResellerBlocked(data.isReseller === true && data.fullAccess !== true)
    }).catch(() => setResellerBlocked(false))
  }, [])

  useEffect(() => {
    if (resellerBlocked === null) return  // still checking
    if (resellerBlocked) return           // blocked — don't load items
    Promise.all([
      fetch('/api/preorder-item').then(r => r.json()).catch(() => []),
      fetch('/api/preorder-header').then(r => r.json()).catch(() => ({ logos: [], theme: 'dark' })),
    ]).then(([itemData, headerData]) => {
      setItems(Array.isArray(itemData) ? itemData : [])
      // Handle both legacy array format and new { logos, theme } format
      if (Array.isArray(headerData)) {
        setLogos(headerData)
      } else {
        setLogos(Array.isArray(headerData.logos) ? headerData.logos : [])
        if (headerData.headerLogo) setHeaderLogo(headerData.headerLogo)
        // Only apply admin default theme if user hasn't set a preference
        const saved = localStorage.getItem('preorders-theme')
        if (!saved && headerData.theme && THEMES[headerData.theme]) {
          setThemeKey(headerData.theme)
        }
      }
      // Apply localStorage preference (overrides admin default)
      const saved = localStorage.getItem('preorders-theme')
      if (saved && THEMES[saved]) setThemeKey(saved)
    }).finally(() => setLoading(false))
  }, [resellerBlocked])

  const t = THEMES[themeKey] ?? THEMES.dark

  const selectTheme = (key: string) => {
    setThemeKey(key)
    localStorage.setItem('preorders-theme', key)
    setShowThemePicker(false)
  }

  const filtered = activeBrand
    ? items.filter(item => item.brand?.toLowerCase() === activeBrand.toLowerCase())
    : items

  const handleLogoClick = (name: string) => {
    setActiveBrand(prev => (prev?.toLowerCase() === name.toLowerCase() ? null : name))
  }

  const isCyberpunk = t.key === 'cyberpunk'

  // ── Reseller check: still loading ──
  if (resellerBlocked === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#06000f]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff00ff]" />
      </div>
    )
  }

  // ── Reseller access denied ──
  if (resellerBlocked) {
    return (
      <div
        className="min-h-screen font-play flex flex-col items-center justify-center relative overflow-hidden"
        style={{ background: '#06000f', color: '#e8e0ff' }}
      >
        {/* Scanlines */}
        <div
          className="pointer-events-none fixed inset-0 z-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.12) 0px, rgba(0,0,0,0.12) 1px, transparent 1px, transparent 3px)',
            mixBlendMode: 'multiply',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #ff00ff 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #00ffff 0%, transparent 70%)' }} />

        <div className="relative z-20 text-center px-6 max-w-lg">
          <div
            className="text-7xl font-black mb-2 tracking-widest"
            style={{ color: '#ff00ff', textShadow: '0 0 30px #ff00ff, 0 0 60px #ff00ff88' }}
          >
            ⛔
          </div>
          <h1
            className="text-3xl font-black uppercase tracking-widest mb-3"
            style={{ color: '#ff00ff', textShadow: '0 0 20px #ff00ff' }}
          >
            Access Denied
          </h1>
          <p
            className="text-xl font-bold mb-8 uppercase tracking-wider"
            style={{ color: '#00ffff', textShadow: '0 0 12px #00ffff' }}
          >
            You are a Reseller
          </p>
          <a
            href="/resellers-pre-orders"
            className="inline-block px-8 py-3 font-bold uppercase tracking-widest text-sm transition-all"
            style={{
              background: 'transparent',
              border: '2px solid #ff00ff',
              color: '#ff00ff',
              boxShadow: '0 0 16px #ff00ff66, inset 0 0 16px #ff00ff11',
              textShadow: '0 0 8px #ff00ff',
            }}
          >
            Go to Reseller Pre-Orders →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen font-play transition-colors duration-300"
      style={{ background: t.bg, color: t.text }}
    >
      {t.scanlines && <Scanlines />}

      {/* ── Header ── */}
      <header
        style={{
          background: t.headerBg,
          borderBottom: t.headerBorder,
          boxShadow: t.headerGlow,
        }}
      >
        <div className="py-3 px-6 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold">
            {headerLogo && (
              <img src={headerLogo} alt="R66 Emporium" className="h-10 w-10 object-contain" />
            )}
            <span style={{ color: t.logoR66 }}>R66</span>
            <span style={{ color: t.logoEmporium }}>EMPORIUM</span>
          </Link>

          <span
            className="ml-auto text-xs font-bold tracking-widest uppercase px-4 py-1 rounded-full"
            style={{
              background: t.badgeLabelBg,
              color: isCyberpunk ? '#ff00ff' : t.logoR66,
              border: isCyberpunk ? '1px solid rgba(255,0,255,0.4)' : 'none',
              textShadow: isCyberpunk ? '0 0 8px #ff00ff' : 'none',
            }}
          >
            {t.badgeLabel}
          </span>
        </div>

        {/* Brand logo filter strip */}
        {logos.length > 0 && (
          <div
            className="px-6 py-2 flex items-center gap-2 overflow-x-auto"
            style={{ background: t.brandStrip }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider shrink-0 mr-1"
              style={{ color: isCyberpunk ? 'rgba(255,0,255,0.6)' : 'rgba(255,255,255,0.5)' }}
            >
              Filter:
            </span>
            {logos.map(logo => {
              const isActive = activeBrand?.toLowerCase() === logo.name.toLowerCase()
              return (
                <button
                  key={logo.id}
                  onClick={() => handleLogoClick(logo.name)}
                  title={logo.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all shrink-0"
                  style={{
                    background: isActive ? t.brandChipActive : t.brandChipBg,
                    color: isActive ? t.brandChipActiveText : t.text,
                    transform: isActive ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: isActive && isCyberpunk ? '0 0 12px rgba(255,0,255,0.6)' : isActive ? '0 2px 8px rgba(0,0,0,0.3)' : 'none',
                    border: isCyberpunk ? `1px solid ${isActive ? '#ff00ff' : 'rgba(255,0,255,0.2)'}` : 'none',
                  }}
                >
                  {logo.imageUrl && (
                    <img src={logo.imageUrl} alt={logo.name} className="h-6 object-contain" />
                  )}
                  {logo.name && (
                    <span className="text-xs font-bold">{logo.name}</span>
                  )}
                </button>
              )
            })}
            {activeBrand && (
              <button
                onClick={() => setActiveBrand(null)}
                className="ml-auto shrink-0 text-xs underline"
                style={{ color: isCyberpunk ? 'rgba(0,255,255,0.6)' : 'rgba(255,255,255,0.6)' }}
              >
                Clear filter
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 py-10 relative z-20">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              textShadow: isCyberpunk ? '0 0 20px rgba(255,0,255,0.5)' : 'none',
              color: isCyberpunk ? '#e8e0ff' : t.text,
            }}
          >
            {activeBrand ? `${activeBrand} Pre-Orders` : 'Pre-Order Items'}
          </h1>
          <p style={{ color: t.textMuted, fontSize: 14 }}>
            Reserve your item before it arrives. Contact us via WhatsApp to confirm your order.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div
              className="animate-spin rounded-full h-12 w-12 border-b-2"
              style={{ borderColor: t.spinner }}
            />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20" style={{ color: t.textMuted }}>
            <div className="text-5xl mb-4">📦</div>
            <p>
              {activeBrand
                ? `No pre-orders found for ${activeBrand}.`
                : 'No pre-orders available at the moment. Check back soon.'}
            </p>
            {activeBrand && (
              <button
                onClick={() => setActiveBrand(null)}
                className="mt-4 text-sm underline"
                style={{ color: t.accent }}
              >
                Show all pre-orders
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(item => {
              const price = parseFloat(item.retailPrice || item.estimatedRetailPrice || '0')
              const cutoffSoon = item.cutoffDate
                ? (new Date(item.cutoffDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 2
                : false

              return (
                <Link
                  key={item.id}
                  href={`/pre-order/${item.id}`}
                  className="group rounded-2xl overflow-hidden transition-all duration-200"
                  style={{
                    background: t.cardBg,
                    border: `1px solid ${t.border}`,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.boxShadow = t.cardGlow ?? `0 0 0 2px ${t.cardRingColor}`
                    el.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.boxShadow = 'none'
                    el.style.transform = 'translateY(0)'
                  }}
                >
                  {/* Image */}
                  <div
                    className="flex items-center justify-center h-52"
                    style={{ background: t.cardImageBg }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.description}
                        className="max-h-48 max-w-full object-contain p-3"
                      />
                    ) : (
                      <div className="text-4xl" style={{ color: t.textSku }}>📦</div>
                    )}
                  </div>

                  {/* Accent bar */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: t.accentBar,
                      boxShadow: isCyberpunk ? '0 0 8px rgba(255,0,255,0.6)' : 'none',
                    }}
                  />

                  {/* Details */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.brand && (
                        <span
                          className="text-xs font-bold px-3 py-0.5 rounded-full"
                          style={{
                            background: t.accent,
                            color: t.accentText,
                            boxShadow: isCyberpunk ? '0 0 8px rgba(255,0,255,0.5)' : 'none',
                          }}
                        >
                          {item.brand}
                        </span>
                      )}
                      {cutoffSoon && (
                        <span
                          className="text-xs font-bold px-3 py-0.5 rounded-full animate-pulse"
                          style={{
                            background: isCyberpunk ? '#ff0' : '#dc2626',
                            color: '#000',
                          }}
                        >
                          {isCyberpunk ? '⚠ CLOSING SOON' : 'Closing Soon'}
                        </span>
                      )}
                    </div>

                    <p className="text-xs" style={{ color: t.textSku }}>SKU: {item.sku}</p>

                    <h2
                      className="font-semibold text-sm leading-snug line-clamp-2 transition-colors"
                      style={{ color: t.text }}
                    >
                      {item.description}
                    </h2>

                    <p
                      className="font-bold text-lg"
                      style={{
                        color: isCyberpunk ? '#00ffff' : t.accent,
                        textShadow: t.priceShadow,
                      }}
                    >
                      {price > 0 ? `R ${price.toFixed(2)}` : 'POA'}
                    </p>

                    <div
                      className="flex items-center justify-between text-xs pt-1"
                      style={{
                        color: t.textMuted,
                        borderTop: `1px solid ${t.border}`,
                      }}
                    >
                      {item.shipmentStatus === 'shipping_soon' ? (
                        <span className="font-bold" style={{ color: '#3b82f6' }}>🚢 Shipping Soon</span>
                      ) : item.shipmentStatus === 'shipping' ? (
                        <span className="font-bold" style={{ color: '#22c55e' }}>📦 Shipping</span>
                      ) : (
                        <span>ETA: {item.eta || '—'}</span>
                      )}
                    </div>

                    {/* Cut-off date badge — always visible when set */}
                    {item.cutoffDate && !item.shipmentStatus && (
                      <div className="pt-1">
                        <span
                          className={`inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-1 rounded-full ${cutoffSoon ? 'animate-pulse' : ''}`}
                          style={{
                            background: cutoffSoon ? '#dc2626' : '#d97706',
                            color: '#fff',
                          }}
                        >
                          🗓 Order by: {new Date(item.cutoffDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    )}

                    {/* Qty / MOQ section */}
                    {item.minOrderQty != null && item.minOrderQty > 0 ? (
                      item.moqMet ? (
                        /* Sold out — badge only */
                        <div className="pt-1">
                          <span
                            className="font-bold text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: '#dc2626', color: '#fff' }}
                          >
                            Sold Out
                          </span>
                        </div>
                      ) : (
                        /* Available — show reserved count, available count and progress bar */
                        <div className="pt-1 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span style={{ color: t.textMuted }}>
                              {item.totalReserved ?? 0} / {item.minOrderQty} reserved
                            </span>
                            <span
                              className="font-semibold text-[10px]"
                              style={{ color: isCyberpunk ? '#f97316' : t.accent }}
                            >
                              {item.availableQty ?? item.moqGap ?? 0} Available
                            </span>
                          </div>
                          <div
                            className="w-full h-1.5 rounded-full overflow-hidden"
                            style={{ background: t.border }}
                          >
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.round(((item.totalReserved ?? 0) / item.minOrderQty) * 100))}%`,
                                background: isCyberpunk ? '#f97316' : t.accent,
                              }}
                            />
                          </div>
                        </div>
                      )
                    ) : (item.availableQty != null && (
                      /* No MOQ — show flat available qty badge */
                      <div className="pt-1">
                        {item.availableQty > 0 ? (
                          <span
                            className="font-bold text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: isCyberpunk ? '#f97316' : t.accent, color: isCyberpunk ? '#000' : t.accentText }}
                          >
                            {item.availableQty} Available
                          </span>
                        ) : (
                          <span
                            className="font-bold text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: '#dc2626', color: '#fff' }}
                          >
                            Sold Out
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        className="text-center py-6 mt-10 text-sm"
        style={{ background: t.footer, color: t.footerText }}
      >
        {isCyberpunk ? (
          <span>
            <span style={{ color: '#ff00ff' }}>◈</span>
            {' '}R66SLOT · www.r66slot.co.za{' '}
            <span style={{ color: '#ff00ff' }}>◈</span>
          </span>
        ) : (
          `© ${new Date().getFullYear()} R66SLOT · www.r66slot.co.za`
        )}
      </footer>

      {/* ── Floating theme switcher ── */}
      <div className="fixed bottom-6 left-6 z-50">
        {showThemePicker && (
          <>
            {/* backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
            {/* menu — opens upward */}
            <div
              className="absolute bottom-14 left-0 rounded-2xl overflow-hidden shadow-2xl z-50"
              style={{
                background: isCyberpunk ? '#0e0020' : '#1a1a1a',
                border: isCyberpunk ? '1px solid rgba(255,0,255,0.5)' : '1px solid rgba(255,255,255,0.12)',
                minWidth: 170,
                boxShadow: isCyberpunk ? '0 0 24px rgba(255,0,255,0.4)' : '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Theme
              </p>
              {THEME_ORDER.map(key => {
                const th = THEMES[key]
                const isSelected = themeKey === key
                return (
                  <button
                    key={key}
                    onClick={() => selectTheme(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left transition-colors"
                    style={{
                      color: isSelected ? (isCyberpunk ? '#ff00ff' : '#C41230') : '#ffffff',
                      background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                    }}
                  >
                    <span className="text-lg">{th.icon}</span>
                    <span>{th.name}</span>
                    {isSelected && <span className="ml-auto text-xs opacity-60">✓</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setShowThemePicker(p => !p)}
          title="Change theme"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{
            background: isCyberpunk ? '#0e0020' : '#1a1a1a',
            color: isCyberpunk ? '#ff00ff' : '#ffffff',
            border: isCyberpunk ? '1px solid rgba(255,0,255,0.6)' : '1px solid rgba(255,255,255,0.15)',
            boxShadow: isCyberpunk ? '0 0 16px rgba(255,0,255,0.4)' : '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <span className="text-base">{t.icon}</span>
          <span>{t.name}</span>
          <span style={{ opacity: 0.5, fontSize: 10 }}>▲</span>
        </button>
      </div>
    </div>
  )
}
