'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const BOOK_NOW_URL = 'https://r66slot.co.za/book'

type PreOrderPoster = {
  id: string
  orderType: 'new-order' | 'pre-order'
  sku: string
  itemDescription: string
  estimatedDeliveryDate: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  imageUrl: string
  posterImageUrl?: string
  shortCode?: string
  createdAt: string
  published: boolean
}

type PreOrderItem = {
  id: string
  posterId: string
  sku: string
  itemDescription: string
  brand: string
  price: string
  quantity: number
  totalAmount: string
  customerName: string
  customerEmail: string
  orderType: 'new-order' | 'pre-order'
  status: string
  createdAt: string
}

export default function SlotCarOrdersPage() {
  const [posters, setPosters] = useState<PreOrderPoster[]>([])
  const [orders, setOrders] = useState<PreOrderItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sharingPosterId, setSharingPosterId] = useState<string | null>(null)
  const [whatsappDone, setWhatsappDone] = useState<string | null>(null)
  const [facebookResult, setFacebookResult] = useState<{ posterId: string; posted: boolean; error?: string } | null>(null)

  useEffect(() => {
    fetchPosters()
    fetchOrders()
  }, [])

  const fetchPosters = async () => {
    try {
      const response = await fetch('/api/admin/slotcar-orders')
      if (response.ok) {
        const data = await response.json()
        setPosters(data)
      }
    } catch (error) {
      console.error('Error fetching posters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/preorder-list')
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this poster?')) return

    try {
      const response = await fetch(`/api/admin/slotcar-orders/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPosters(posters.filter((p) => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting poster:', error)
    }
  }

  const handleWhatsApp = async (poster: PreOrderPoster) => {
    if (sharingPosterId) return
    setSharingPosterId(poster.id)
    setWhatsappDone(null)

    const code = poster.shortCode || poster.id
    const bookUrl = code ? `${BOOK_NOW_URL}/${code}` : BOOK_NOW_URL
    // Desktop fallback text includes ETA and booking link
    const waText = `🎯 ${poster.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'} - ${poster.itemDescription}\nBrand: ${poster.brand}\nPrice: R${poster.preOrderPrice}\nEst. Delivery: ${poster.estimatedDeliveryDate}\nBook Here: ${bookUrl}`

    try {
      // Fetch the server-generated poster image (branded, no BOOK NOW, works for any shortCode)
      let imageBlob: Blob | null = null

      if (poster.shortCode) {
        try {
          const resp = await fetch(`/api/poster-image/${poster.shortCode}`)
          if (resp.ok) imageBlob = await resp.blob()
        } catch (e) {
          console.warn('Could not generate poster image:', e)
        }
      }

      // Fallback: try proxy with saved poster/product image
      if (!imageBlob) {
        const imageSource = poster.posterImageUrl || poster.imageUrl
        if (imageSource) {
          try {
            const resp = await fetch(`/api/image-proxy?url=${encodeURIComponent(imageSource)}`)
            if (resp.ok) imageBlob = await resp.blob()
          } catch (e) {
            console.warn('Could not fetch poster image via proxy:', e)
          }
        }
      }

      if (imageBlob) {
        const ext = imageBlob.type === 'image/png' ? 'png' : 'jpg'
        const filename = `R66SLOT-${poster.sku || 'poster'}.${ext}`
        const file = new File([imageBlob], filename, { type: imageBlob.type || 'image/png' })

        // Mobile only: Web Share API — attaches image + booking link directly to WhatsApp
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
          !!(navigator as any).userAgentData?.mobile
        if (isMobile && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], text: waText })
          return
        }

        // Desktop: download the poster JPEG + open WhatsApp with pre-filled text
        const objUrl = URL.createObjectURL(imageBlob)
        const a = document.createElement('a')
        a.href = objUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(objUrl), 30000)

        // Open WhatsApp with pre-filled text (booking link + ETA + details)
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')

        // Show the instruction banner on this card
        setWhatsappDone(poster.id)
        setTimeout(() => setWhatsappDone(null), 12000)
      } else {
        // No image — just open WhatsApp with full text
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('WhatsApp share error:', err)
        window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank')
      }
    } finally {
      setSharingPosterId(null)
    }
  }

  const handleFacebook = async (poster: PreOrderPoster) => {
    const code = poster.shortCode || poster.id
    const bookUrl = code ? `${BOOK_NOW_URL}/${code}` : BOOK_NOW_URL
    const caption = `🎯 ${poster.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'} - ${poster.itemDescription}\nBrand: ${poster.brand}\nPrice: R${poster.preOrderPrice}\nEst. Delivery: ${poster.estimatedDeliveryDate}\nBook Here: ${bookUrl}`

    // 1. Try posting directly to R66Slot Facebook Page via Graph API
    if (poster.shortCode) {
      try {
        const res = await fetch('/api/admin/facebook-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortCode: poster.shortCode, caption }),
        })
        const data = await res.json()
        if (data.success) {
          setFacebookResult({ posterId: poster.id, posted: true })
          setTimeout(() => setFacebookResult(null), 15000)
          return
        }
        if (res.status !== 503) {
          // API returned a real error — show it and fall through to download
          setFacebookResult({ posterId: poster.id, posted: false, error: data.error })
          setTimeout(() => setFacebookResult(null), 15000)
        }
        // 503 = token not configured → fall through silently to download
      } catch { /* network error — fall through */ }
    }

    // 2. Fallback: download poster JPEG + copy caption + open Facebook share dialog
    let imageBlob: Blob | null = null
    if (poster.shortCode) {
      try {
        const resp = await fetch(`/api/poster-image/${poster.shortCode}`)
        if (resp.ok) imageBlob = await resp.blob()
      } catch { /* ignore */ }
    }
    if (!imageBlob) {
      const imageSource = poster.posterImageUrl || poster.imageUrl
      if (imageSource) {
        try {
          const resp = await fetch(`/api/image-proxy?url=${encodeURIComponent(imageSource)}`)
          if (resp.ok) imageBlob = await resp.blob()
        } catch { /* ignore */ }
      }
    }

    if (imageBlob) {
      const ext = imageBlob.type === 'image/png' ? 'png' : 'jpg'
      const filename = `R66SLOT-${poster.sku || 'poster'}.${ext}`
      const objUrl = URL.createObjectURL(imageBlob)
      const a = document.createElement('a')
      a.href = objUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(objUrl), 30000)
    }

    try { await navigator.clipboard.writeText(caption) } catch { /* ignore */ }

    // Open Facebook share dialog — booking page OG tags show the poster image
    const shareTarget = poster.shortCode
      ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${BOOK_NOW_URL}/${poster.shortCode}`)}`
      : 'https://www.facebook.com/profile.php?id=61582238030752'
    window.open(shareTarget, '_blank', 'width=620,height=450')

    setFacebookResult((prev) =>
      prev?.posterId === poster.id ? prev : { posterId: poster.id, posted: false }
    )
    setTimeout(() => setFacebookResult(null), 15000)
  }

  if (isLoading) {
    return (
      <div className="font-play flex items-center justify-center min-h-[400px]">
        <p className="text-lg">Loading...</p>
      </div>
    )
  }

  return (
    <div className="font-play">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Poster</h1>
          <p className="text-gray-600 mt-1">
            Create and manage pre-order posters for WhatsApp
          </p>
        </div>
        <Button
          size="lg"
          asChild
          className="bg-blue-600 hover:bg-blue-700 text-white font-play"
        >
          <Link href="/admin/slotcar-orders/poster">
            Create Pre-Order Poster
          </Link>
        </Button>
      </div>

      {posters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <div className="text-6xl">🎯</div>
              <h3 className="text-xl font-semibold font-play">No Pre-Order Posters Yet</h3>
              <p className="text-gray-600 font-play">
                Create your first pre-order poster to share with customers via WhatsApp
              </p>
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-play">
                <Link href="/admin/slotcar-orders/poster">
                  Create Pre-Order Poster →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posters.map((poster) => (
            <Card key={poster.id} className="overflow-hidden">
              {poster.imageUrl && (
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={poster.imageUrl}
                    alt={poster.itemDescription}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      poster.orderType === 'pre-order'
                        ? 'bg-orange-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}>
                      {poster.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'}
                    </span>
                  </div>
                </div>
              )}
              <CardContent className="p-4">
                <h3 className="font-bold text-lg font-play mb-1">{poster.itemDescription}</h3>
                <p className="text-sm text-gray-600 mb-2">SKU: {poster.sku}</p>
                <p className="text-xl font-bold text-primary font-play">R{poster.preOrderPrice}</p>
                <p className="text-sm text-gray-500 mt-2">Brand: {poster.brand}</p>
                <p className="text-sm text-gray-500">Delivery: {poster.estimatedDeliveryDate}</p>
                <p className="text-sm text-gray-500">Available: {poster.availableQty} units</p>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button variant="outline" size="sm" asChild className="font-play">
                    <Link href={`/admin/slotcar-orders/poster?edit=${poster.id}`}>
                      Edit
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="font-play">
                    <Link href={`/preorder/${poster.id}`} target="_blank">
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWhatsApp(poster)}
                    disabled={sharingPosterId === poster.id}
                    className="text-green-600 hover:text-green-700 border-green-200 font-play"
                  >
                    {sharingPosterId === poster.id ? 'Sending…' : 'WhatsApp'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFacebook(poster)}
                    className="text-blue-600 hover:text-blue-700 border-blue-200 font-play"
                  >
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(poster.id)}
                    className="col-span-2 text-red-600 hover:text-red-700 font-play"
                  >
                    Delete
                  </Button>
                </div>

                {/* WhatsApp instruction banner */}
                {whatsappDone === poster.id && (
                  <div className="mt-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs font-play text-green-800">
                    <p className="font-bold">✅ Poster downloaded + WhatsApp opening!</p>
                    <p className="mt-0.5">In WhatsApp, click the 📎 attach button → select the downloaded poster file to send.</p>
                  </div>
                )}

                {/* Facebook result banner */}
                {facebookResult?.posterId === poster.id && (
                  <div className={`mt-3 rounded-md px-3 py-2 text-xs font-play border ${facebookResult.posted ? 'bg-green-50 border-green-200 text-green-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    {facebookResult.posted ? (
                      <p className="font-bold">✅ Posted to R66Slot Facebook Page!</p>
                    ) : (
                      <>
                        <p className="font-bold">
                          {facebookResult.error ? `⚠️ ${facebookResult.error} — poster downloaded, upload manually.` : '✅ Poster downloaded + ad caption copied!'}
                        </p>
                        <p className="mt-0.5">On Facebook, create a new post → attach the poster → paste caption with Ctrl+V.</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Pre-Orders */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-play">Recent Pre-Orders</CardTitle>
            <Button variant="outline" size="sm" asChild className="font-play">
              <Link href="/admin/preorder-list">View All Pre-Orders →</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-gray-500 text-sm font-play text-center py-6">
              No pre-orders yet. Orders placed by customers through posters will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Date</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Customer</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Item</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Brand</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Qty</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Total</th>
                    <th className="py-2 px-3 font-semibold text-xs font-play text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 text-xs font-play">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-2 px-3 text-xs font-play font-medium">{order.customerName}</td>
                      <td className="py-2 px-3 text-xs font-play">{order.itemDescription}</td>
                      <td className="py-2 px-3 text-xs font-play">{order.brand}</td>
                      <td className="py-2 px-3 text-xs font-play">{order.quantity}</td>
                      <td className="py-2 px-3 text-xs font-play font-semibold">R{order.totalAmount}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium font-play ${
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div className="font-play">
              <h3 className="font-semibold mb-2">How Pre-Order Posters Work</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Create a poster with product image and details</li>
                <li>• Export to WhatsApp Business as an image with booking link</li>
                <li>• Customers click the link to book their order</li>
                <li>• Orders are stored in List of Pre-Orders for processing</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
