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

async function toDataUri(rawUrl: string | undefined, request: NextRequest): Promise<string> {
  if (!rawUrl) return ''
  if (rawUrl.startsWith('data:')) return rawUrl
  const url = absolute(rawUrl.trim(), request)
  if (!url) return ''
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 10_000)
    const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' })
    clearTimeout(timer)
    if (!res.ok) return ''
    const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const buf = Buffer.from(await res.arrayBuffer())
    if (DIRECT_TYPES.includes(type)) return `data:${type};base64,${buf.toString('base64')}`
    try {
      const sharp = (await import('sharp')).default
      const png = await sharp(buf).png().toBuffer()
      return `data:image/png;base64,${png.toString('base64')}`
    } catch {
      return ''
    }
  } catch {
    return ''
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
    const img = await toDataUri(body.imageUrl, request)

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
              backgroundColor: '#9f1239',
              color: '#ffffff',
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
              backgroundColor: '#f8fafc',
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
                    <div style={{ display: 'flex', color: '#be123c', fontSize: 32, fontWeight: 'bold' }}>
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
                <div style={{ display: 'flex', color: '#be123c', fontSize: 68, fontWeight: 'bold' }}>
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
              backgroundColor: '#0f172a',
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
