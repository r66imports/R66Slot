import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface PosterBody {
  title?: string
  sku?: string
  imageUrl?: string
  brand?: string
  eta?: string
  estimatedRetailPrice?: string
  retailPrice?: string
  cutoffDate?: string
  notes?: string
}

const WIDTH = 1080
const HEIGHT = 1350

// R1 000.00 — space thousands separator, always 2 decimals
function money(v: string | undefined | null): string {
  const n = parseFloat((v || '').replace(/[^\d.-]/g, ''))
  if (!n || !isFinite(n)) return ''
  return `R${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}`
}

function fmtDate(v: string | undefined | null): string {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function clamp(v: string | undefined | null, max: number): string {
  const s = (v || '').trim()
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
}

// Satori only decodes png / jpeg / gif / svg. Anything else (webp, avif) is
// converted with sharp; if that fails the poster renders without an image
// rather than failing the whole request.
const DIRECT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']

// Product images are usually stored as site-relative paths (/api/media/uploads/…),
// so they have to be resolved against this request's own origin before fetching.
function absolute(url: string, request: NextRequest): string {
  if (/^https?:\/\//i.test(url)) return url
  const proto = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host
  if (!host) return ''
  return `${proto}://${host}${url.startsWith('/') ? url : `/${url}`}`
}

async function fetchImage(
  rawUrl: string | undefined,
  request: NextRequest
): Promise<{ dataUri: string; buf: Buffer | null }> {
  const empty = { dataUri: '', buf: null }
  if (!rawUrl) return empty
  if (rawUrl.startsWith('data:')) return { dataUri: rawUrl, buf: null }
  const url = absolute(rawUrl.trim(), request)
  if (!url) return empty
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 10_000)
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!res.ok) return empty
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const buf = Buffer.from(await res.arrayBuffer())
    if (DIRECT_TYPES.includes(type)) {
      return { dataUri: `data:${type};base64,${buf.toString('base64')}`, buf }
    }
    try {
      const sharp = (await import('sharp')).default
      const png = await sharp(buf).png().toBuffer()
      return { dataUri: `data:image/png;base64,${png.toString('base64')}`, buf: png }
    } catch {
      return empty
    }
  } catch {
    return empty
  }
}

/* ─── Poster colour, taken from the car ────────────────────────────────────
   The poster is themed from the car's own paint, which is the whole point of
   it: a yellow Porsche gets a yellow poster.

   Naive "dominant colour" does not work on these photos. They are shot on
   black with a bright RevoSlot logo at the top, so the most common colour is
   black and the most eye-catching is the logo's red. So:

   • the top 28% is cropped away, which removes the logo
   • near-black and near-white pixels are discarded, which removes the
     backdrop, the reflection's fade and chrome/lighting blowout
   • greys are discarded, which removes tyres, glass and shadow
   • what remains is bucketed by hue and weighted by saturation, so a large
     dull area cannot outvote the actual livery

   A car with no saturated colour at all — white, silver, black, bare metal —
   yields nothing, and the house red is used rather than inventing a tint. */

interface Theme {
  band: string
  bandText: string
  accent: string
  footer: string
  wash: string
}

const HOUSE: Theme = {
  band: '#9f1239',
  bandText: '#ffffff',
  accent: '#be123c',
  footer: '#0f172a',
  wash: '#f8fafc',
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => clamp255(c).toString(16).padStart(2, '0')).join('')}`

/** Perceived brightness (WCAG relative luminance), 0–1. */
function luminance(r: number, g: number, b: number): number {
  const f = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function mix(r: number, g: number, b: number, target: number, amount: number): string {
  return hex(r + (target - r) * amount, g + (target - g) * amount, b + (target - b) * amount)
}

async function carTheme(buf: Buffer | null): Promise<Theme> {
  if (!buf) return HOUSE
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(buf).metadata()
    const h = meta.height || 0
    const w = meta.width || 0

    let pipeline = sharp(buf)
    // Drop the top of the frame, where the brand logo sits.
    if (h > 40 && w > 40) {
      const top = Math.floor(h * 0.28)
      pipeline = pipeline.extract({ left: 0, top, width: w, height: h - top })
    }
    const { data, info } = await pipeline
      .resize(160, 160, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // 24 hue buckets of 15°, each accumulating saturation-weighted colour.
    const buckets = Array.from({ length: 24 }, () => ({ w: 0, r: 0, g: 0, b: 0 }))
    const ch = info.channels
    for (let i = 0; i < data.length; i += ch) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      const l = (max + min) / 2 / 255
      if (l < 0.16 || l > 0.93) continue // backdrop, blown highlights
      const d = max - min
      if (d === 0) continue
      const sat = l > 0.5 ? d / (510 - max - min) : d / (max + min)
      if (sat < 0.3) continue // greys: tyres, glass, shadow

      let hue: number
      if (max === r) hue = ((g - b) / d) % 6
      else if (max === g) hue = (b - r) / d + 2
      else hue = (r - g) / d + 4
      hue = ((hue * 60) + 360) % 360

      const bucket = buckets[Math.floor(hue / 15) % 24]
      bucket.w += sat
      bucket.r += r * sat
      bucket.g += g * sat
      bucket.b += b * sat
    }

    const best = buckets.reduce((a, c) => (c.w > a.w ? c : a), buckets[0])
    // Too little saturated paint to be confident — a white/silver/black car.
    if (best.w < 12) return HOUSE

    const r = best.r / best.w
    const g = best.g / best.w
    const b = best.b / best.w

    // The band keeps the car's actual colour — a bright yellow car gets a
    // bright yellow poster. Darkening it to suit white text turned yellow into
    // mustard, which is the opposite of matching the car, so the TEXT flips
    // instead of the paint.
    const bandText = luminance(r, g, b) > 0.42 ? '#161616' : '#ffffff'

    // The price sits on a white body, so it has to be deepened until it reads
    // there regardless of how pale the car is.
    let ar = r
    let ag = g
    let ab = b
    let guard = 0
    while (luminance(ar, ag, ab) > 0.22 && guard++ < 16) {
      ar *= 0.86
      ag *= 0.86
      ab *= 0.86
    }

    return {
      band: hex(r, g, b),
      bandText,
      accent: hex(ar, ag, ab), // price: deep enough to read on white
      footer: mix(r, g, b, 0, 0.66), // footer: near-black, still tinted
      wash: mix(r, g, b, 255, 0.93), // image backdrop: the faintest tint
    }
  } catch {
    return HOUSE
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PosterBody

    const title = clamp(body.title, 90) || 'Pre-Order Item'
    const sku = clamp(body.sku, 40)
    const brand = clamp(body.brand, 28)
    const notes = clamp(body.notes, 160)
    const eta = clamp(body.eta, 40)
    const cutoff = fmtDate(body.cutoffDate)
    const price = money(body.retailPrice) || money(body.estimatedRetailPrice)
    const { dataUri: img, buf: imgBuf } = await fetchImage(body.imageUrl, request)
    const theme = await carTheme(imgBuf)

    const titleSize = title.length > 60 ? 40 : title.length > 38 ? 48 : 56

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            fontFamily: 'sans-serif',
          }}
        >
          {/* Header band */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 118,
              backgroundColor: theme.band,
              color: theme.bandText,
              fontSize: 52,
              fontWeight: 'bold',
              letterSpacing: 6,
            }}
          >
            PRE-ORDER
          </div>

          {/* Product image */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 620,
              backgroundColor: theme.wash,
              padding: 32,
            }}
          >
            {img ? (
              <img src={img} alt="" style={{ maxWidth: 1000, maxHeight: 556, objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', color: '#cbd5e1', fontSize: 34 }}>No product image</div>
            )}
          </div>

          {/* Body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '36px 48px 0 48px',
            }}
          >
            {/* Brand + SKU */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              {brand ? (
                <div
                  style={{
                    display: 'flex',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    padding: '8px 20px',
                    borderRadius: 10,
                    fontSize: 26,
                    fontWeight: 'bold',
                    letterSpacing: 2,
                  }}
                >
                  {brand.toUpperCase()}
                </div>
              ) : (
                <div style={{ display: 'flex' }} />
              )}
              {sku ? (
                <div style={{ display: 'flex', color: '#64748b', fontSize: 26 }}>SKU {sku}</div>
              ) : (
                <div style={{ display: 'flex' }} />
              )}
            </div>

            {/* Title */}
            <div
              style={{
                display: 'flex',
                fontSize: titleSize,
                fontWeight: 'bold',
                color: '#0f172a',
                lineHeight: 1.15,
              }}
            >
              {title}
            </div>

            {/* Notes */}
            {notes ? (
              <div style={{ display: 'flex', marginTop: 14, fontSize: 26, color: '#64748b', lineHeight: 1.3 }}>
                {notes}
              </div>
            ) : (
              <div style={{ display: 'flex' }} />
            )}

            {/* Details + price */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginTop: 'auto',
                paddingTop: 26,
                paddingBottom: 30,
                borderTop: '2px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {eta ? (
                  <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 14 }}>
                    <div style={{ display: 'flex', color: '#94a3b8', fontSize: 22, letterSpacing: 2 }}>
                      EXPECTED ARRIVAL
                    </div>
                    <div style={{ display: 'flex', color: '#0f172a', fontSize: 32, fontWeight: 'bold' }}>
                      {eta}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex' }} />
                )}
                {cutoff ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', color: '#94a3b8', fontSize: 22, letterSpacing: 2 }}>
                      ORDER BEFORE
                    </div>
                    <div style={{ display: 'flex', color: theme.accent, fontSize: 32, fontWeight: 'bold' }}>
                      {cutoff}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex' }} />
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', color: '#94a3b8', fontSize: 22, letterSpacing: 2 }}>
                  PRE-ORDER PRICE
                </div>
                <div style={{ display: 'flex', color: theme.accent, fontSize: 68, fontWeight: 'bold' }}>
                  {price || 'POA'}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 88,
              backgroundColor: theme.footer,
              color: '#ffffff',
              fontSize: 30,
              fontWeight: 'bold',
              letterSpacing: 4,
            }}
          >
            R66SLOT · r66slot.co.za
          </div>
        </div>
      ),
      { width: WIDTH, height: HEIGHT }
    )
  } catch (err: any) {
    console.error('[preorder-poster] failed:', err?.message || err)
    return NextResponse.json({ error: err?.message || 'Poster generation failed' }, { status: 500 })
  }
}
