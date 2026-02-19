import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

export const runtime = 'nodejs'

type PosterData = {
  id: string
  shortCode: string
  orderType: 'new-order' | 'pre-order'
  sku: string
  itemDescription: string
  estimatedDeliveryDate: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  imageUrl: string
}

async function getPosterByCode(code: string): Promise<PosterData | null> {
  try {
    const posters = await blobRead<PosterData[]>('data/slotcar-orders.json', [])
    return posters.find((p) => p.shortCode === code) || null
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const poster = await getPosterByCode(code)

  if (!poster) {
    return new Response('Poster not found', { status: 404 })
  }

  const isPreOrder = poster.orderType === 'pre-order'

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
        {/* Header Badge */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px',
            backgroundColor: isPreOrder ? '#f97316' : '#22c55e',
            color: '#ffffff',
            fontSize: 28,
            fontWeight: 'bold',
          }}
        >
          {isPreOrder ? '🎯 PRE-ORDER' : '✨ NEW ORDER'}
        </div>

        {/* Product Image */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            backgroundColor: '#f3f4f6',
            padding: '20px',
          }}
        >
          {poster.imageUrl ? (
            <img
              src={poster.imageUrl}
              alt={poster.itemDescription}
              style={{
                maxWidth: '100%',
                maxHeight: '350px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#9ca3af',
                fontSize: 24,
              }}
            >
              Product Image
            </div>
          )}
        </div>

        {/* Product Info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
            gap: '12px',
          }}
        >
          {/* SKU and Brand */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: 18 }}>
              SKU: {poster.sku || '---'}
            </span>
            {poster.brand && (
              <span
                style={{
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: 16,
                }}
              >
                {poster.brand}
              </span>
            )}
          </div>

          {/* Item Description */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              color: '#111827',
            }}
          >
            {poster.itemDescription || 'Product Name'}
          </div>

          {/* Description */}
          {poster.description && (
            <div
              style={{
                fontSize: 18,
                color: '#6b7280',
              }}
            >
              {poster.description}
            </div>
          )}

          {/* Delivery and Price */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '16px',
              marginTop: '8px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#6b7280', fontSize: 16 }}>Est. Delivery</span>
              <span style={{ fontWeight: 600, fontSize: 20 }}>
                {poster.estimatedDeliveryDate || '---'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#6b7280', fontSize: 16 }}>Price</span>
              <span style={{ fontWeight: 'bold', fontSize: 32, color: '#ef4444' }}>
                R{poster.preOrderPrice || '0.00'}
              </span>
            </div>
          </div>

          {/* Book Here Link */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '16px',
            }}
          >
            <span
              style={{
                color: '#2563eb',
                fontSize: 28,
                fontWeight: 'bold',
                textDecoration: 'underline',
              }}
            >
              Book Here
            </span>
          </div>

          {/* Booking URL */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              fontSize: 16,
              color: '#2563eb',
            }}
          >
            r66slot.co.za/book/{code}
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '12px',
              fontSize: 14,
              color: '#9ca3af',
            }}
          >
            R66SLOT - Premium Slot Cars
          </div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 900,
    }
  )
}
