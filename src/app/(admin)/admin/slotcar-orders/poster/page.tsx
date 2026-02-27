'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import html2canvas from 'html2canvas'

// ─── Constants ────────────────────────────────────────────────────────────────
const BRANDS = ['NSR', 'Revo', 'Pioneer', 'Sideways', 'Slot.it', 'Carrera', 'Scalextric', 'Policar', 'BRM', 'Fly']
const RACING_CLASSES = ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA']
const PRODUCT_TYPES = ['Slot Cars', 'Parts', 'Accessories', 'Pre-Order']
const CAR_TYPES = ['Livery', 'White Kit', 'White Body Kit', 'White Body']
const PART_TYPES = ['Guides', 'Braid', 'Lead Wire', 'Magnets', 'Weights', 'Screws', 'Suspension Parts', 'Tires', 'Wheels', 'Wheel Inserts', 'Inline Gears', 'Sidewinder Gears', 'Anglewinder Gears', 'Motors']
const SCALES = ['1/32', '1/24', '1/43', '1/64']
const SUPPLIERS = ['NSR', 'Revo', 'Pioneer', 'Sideways', 'Slot.it', 'Carrera', 'Other']

const BOOK_NOW_URL = 'https://r66slot.co.za/book'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

/** Collapsible section card with checkbox toggle */
function SectionCard({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-0">
        {/* Section header — always visible */}
        <div
          className="flex items-center justify-between px-6 py-4 cursor-pointer select-none"
          onClick={onToggle}
        >
          <h3 className="text-base font-semibold font-play text-gray-900">{title}</h3>
          <label
            className="flex items-center gap-2 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={open}
              onChange={onToggle}
              className="w-4 h-4 accent-gray-900 cursor-pointer"
            />
            <span className="text-xs font-medium text-gray-500 font-play w-8">
              {open ? 'Hide' : 'Show'}
            </span>
          </label>
        </div>
        {/* Section body — hidden when collapsed */}
        {open && (
          <div className="px-6 pb-6 pt-0 border-t border-gray-100 space-y-4">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── PDF builder ──────────────────────────────────────────────────────────────
function buildPosterPDF(data: {
  orderType: string
  sku: string
  itemDescription: string
  estimatedDeliveryDate: string
  brand: string
  description: string
  preOrderPrice: string
  availableQty: number
  imageUrl: string
  shortCode: string
  carClass?: string
  scale?: string
}): string {
  const bookUrl = data.shortCode ? `${BOOK_NOW_URL}/${data.shortCode}` : BOOK_NOW_URL
  const badgeColor = data.orderType === 'pre-order' ? '#f97316' : '#22c55e'
  const badgeLabel = data.orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>R66SLOT – ${data.itemDescription || 'Poster'}</title>
<style>
  @page { size: A5; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; width: 148mm; background: #fff; }
  .badge { background: ${badgeColor}; color: #fff; text-align: center; padding: 10px; font-size: 18px; font-weight: 900; letter-spacing: 3px; }
  .brand-header { background: #111; color: #fff; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; }
  .brand-name { font-size: 22px; font-weight: 900; letter-spacing: -1px; }
  .brand-slot { color: #ef4444; }
  .img-wrap { background: #f3f4f6; display: flex; align-items: center; justify-content: center; height: 160px; overflow: hidden; }
  .img-wrap img { max-width: 100%; max-height: 160px; object-fit: contain; }
  .img-placeholder { color: #9ca3af; font-size: 13px; }
  .info { padding: 14px 16px; }
  .sku { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
  .title { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 6px; line-height: 1.2; }
  .desc { font-size: 12px; color: #4b5563; margin-bottom: 10px; line-height: 1.5; }
  .meta-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .chip { background: #f3f4f6; color: #374151; font-size: 10px; padding: 2px 8px; border-radius: 99px; }
  .details { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; padding-top: 10px; margin-top: 6px; }
  .eta-block p:first-child { font-size: 10px; color: #6b7280; }
  .eta-block p:last-child { font-size: 13px; font-weight: 600; }
  .price-block { text-align: right; }
  .price-block p:first-child { font-size: 10px; color: #6b7280; }
  .price-block .price { font-size: 30px; font-weight: 900; color: #ef4444; }
  .cta { margin: 14px 16px 16px; }
  .cta a { display: block; background: #111; color: #fff; text-align: center; padding: 14px; font-size: 16px; font-weight: 900; letter-spacing: 2px; text-decoration: none; border-radius: 6px; }
  .cta a span { color: #ef4444; }
  .footer { text-align: center; padding: 8px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
  <div class="badge">${badgeLabel}</div>
  <div class="brand-header">
    <span class="brand-name">R66<span class="brand-slot">SLOT</span></span>
    ${data.brand ? `<span style="font-size:13px;color:#9ca3af;">${data.brand}</span>` : ''}
  </div>
  <div class="img-wrap">
    ${data.imageUrl
      ? `<img src="${data.imageUrl}" alt="${data.itemDescription}" />`
      : `<p class="img-placeholder">Product Image</p>`}
  </div>
  <div class="info">
    <p class="sku">SKU: ${data.sku || '---'}</p>
    <h1 class="title">${data.itemDescription || 'Product Name'}</h1>
    ${(data.carClass || data.scale) ? `<div class="meta-chips">${data.carClass ? `<span class="chip">${data.carClass}</span>` : ''}${data.scale ? `<span class="chip">${data.scale}</span>` : ''}</div>` : ''}
    ${data.description ? `<p class="desc">${data.description}</p>` : ''}
    <div class="details">
      <div class="eta-block">
        <p>Est. Delivery</p>
        <p>${data.estimatedDeliveryDate || 'TBC'}</p>
        <p style="margin-top:4px;font-size:10px;color:#6b7280;">Qty Available: ${data.availableQty}</p>
      </div>
      <div class="price-block">
        <p>Price</p>
        <p class="price">R${data.preOrderPrice || '0.00'}</p>
      </div>
    </div>
  </div>
  <div class="cta">
    <a href="${bookUrl}"><span>BOOK NOW</span> → r66slot.co.za/book</a>
  </div>
  <div class="footer">R66SLOT • Premium Slot Cars &amp; Collectibles • r66slot.co.za</div>
</body>
</html>`
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PreOrderPosterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const posterRef = useRef<HTMLDivElement>(null)

  // UI state
  const [saving, setSaving] = useState(false)
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)

  // ── Task 1: section visibility ──
  const [open, setOpen] = useState<Record<string, boolean>>({
    image: true,
    orderType: true,
    productDetails: true,
    categories: true,
    productOrg: true,
    seo: false,
  })
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  // ── Core poster fields ──
  const [imageUrl, setImageUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [shortCode, setShortCode] = useState('')
  const [orderType, setOrderType] = useState<'new-order' | 'pre-order'>('pre-order')
  const [sku, setSku] = useState('')
  const [itemDescription, setItemDescription] = useState('')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('')
  const [brand, setBrand] = useState('')
  const [description, setDescription] = useState('')
  const [preOrderPrice, setPreOrderPrice] = useState('')
  const [availableQty, setAvailableQty] = useState(10)

  // ── Task 2: Categories ──
  const [apiCategories, setApiCategories] = useState<{ id: string; name: string; slug: string; class?: string }[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // ── Task 3: Product Organization ──
  const [carClass, setCarClass] = useState('')
  const [productType, setProductType] = useState('')
  const [carType, setCarType] = useState('')
  const [partType, setPartType] = useState('')
  const [scale, setScale] = useState('')
  const [supplier, setSupplier] = useState('')
  const [tags, setTags] = useState('')
  const [pageId, setPageId] = useState('')
  const [availablePages, setAvailablePages] = useState<{ id: string; title: string }[]>([])

  // ── Task 4: SEO ──
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')

  // ── Load API data on mount ──
  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setApiCategories(data) })
      .catch(() => {})

    fetch('/api/admin/pages')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAvailablePages(data.map((p: any) => ({ id: p.id, title: p.title }))) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (editId) loadPoster(editId)
  }, [editId])

  const loadPoster = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/slotcar-orders/${id}`)
      if (!res.ok) return
      const p = await res.json()
      setOrderType(p.orderType || 'pre-order')
      setSku(p.sku || '')
      setItemDescription(p.itemDescription || '')
      setEstimatedDeliveryDate(p.estimatedDeliveryDate || '')
      setBrand(p.brand || '')
      setDescription(p.description || '')
      setPreOrderPrice(p.preOrderPrice || '')
      setAvailableQty(p.availableQty || 10)
      setImageUrl(p.imageUrl || '')
      setShortCode(p.shortCode || '')
      // extended fields
      setCarClass(p.carClass || '')
      setProductType(p.productType || '')
      setCarType(p.carType || '')
      setPartType(p.partType || '')
      setScale(p.scale || '')
      setSupplier(p.supplier || '')
      setTags(Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''))
      setPageId(p.pageId || '')
      setSelectedCategories(Array.isArray(p.selectedCategories) ? p.selectedCategories : [])
      setSeoTitle(p.seoTitle || '')
      setSeoDescription(p.seoDescription || '')
      setSeoKeywords(p.seoKeywords || '')
    } catch (err) {
      console.error('Error loading poster:', err)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setImageUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const getPosterData = () => ({
    orderType, sku, itemDescription, estimatedDeliveryDate,
    brand, description, preOrderPrice, availableQty, imageUrl, shortCode,
    carClass, scale,
  })

  const handleCopyLink = async () => {
    const code = shortCode || editId || ''
    const url = code ? `${BOOK_NOW_URL}/${code}` : BOOK_NOW_URL
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      prompt('Copy this link:', url)
    }
  }

  const handleExportPDF = () => {
    setExportingPDF(true)
    try {
      const html = buildPosterPDF(getPosterData())
      const win = window.open('', '_blank')
      if (!win) { alert('Pop-up blocked — please allow pop-ups and try again.'); return }
      win.document.write(html)
      win.document.close()
      win.onload = () => setTimeout(() => win.print(), 800)
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportToWhatsApp = () => {
    if (!itemDescription || !preOrderPrice) return
    const code = shortCode || editId || ''
    const bookUrl = code ? `${BOOK_NOW_URL}/${code}` : BOOK_NOW_URL
    window.open(`https://wa.me/?text=${encodeURIComponent(`BOOK HERE: ${bookUrl}`)}`, '_blank')
  }

  const handleExportToFacebook = async () => {
    if (!posterRef.current) return
    try {
      const canvas = await html2canvas(posterRef.current, { backgroundColor: '#ffffff', scale: 2 })
      canvas.toBlob((blob) => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `preorder-${sku || 'poster'}.jpg`
        a.click()
        URL.revokeObjectURL(url)
        const code = shortCode || editId || ''
        const bookingLink = code ? `${BOOK_NOW_URL}/${code}` : BOOK_NOW_URL
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(bookingLink)}&quote=${encodeURIComponent(`🎯 ${orderType === 'pre-order' ? 'PRE-ORDER' : 'NEW ORDER'} - ${itemDescription}\nBrand: ${brand}\nPrice: R${preOrderPrice}\nBook Here: ${bookingLink}`)}`, '_blank')
      }, 'image/jpeg', 0.95)
    } catch (err) { console.error('Facebook export error:', err) }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let finalImageUrl = imageUrl
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const uploadRes = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
        if (uploadRes.ok) finalImageUrl = (await uploadRes.json()).url
      }

      const posterShortCode = shortCode || generateShortCode()
      if (!shortCode) setShortCode(posterShortCode)
      const posterId = editId || `poster_${Date.now()}`

      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean)

      const posterData = {
        id: posterId,
        shortCode: posterShortCode,
        orderType, sku, itemDescription, estimatedDeliveryDate,
        brand, description, preOrderPrice, availableQty,
        imageUrl: finalImageUrl,
        // Task 2
        selectedCategories,
        // Task 3
        carClass, productType, carType, partType, scale, supplier,
        tags: tagList, pageId,
        // Task 4
        seoTitle, seoDescription, seoKeywords,
        createdAt: new Date().toISOString(),
        published: true,
      }

      const posterRes = await fetch('/api/admin/slotcar-orders', {
        method: editId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(posterData),
      })

      if (!posterRes.ok) { alert('Failed to save poster'); return }

      // ── Auto-sync to Products ─────────────────────────────────────────────
      try {
        const collections = ['pre-orders', ...selectedCategories.filter((c) => !['pre-orders'].includes(c))]
        await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: itemDescription,
            description,
            price: parseFloat(preOrderPrice) || 0,
            sku,
            brand: brand.toLowerCase(),
            quantity: availableQty,
            status: 'active',
            imageUrl: finalImageUrl,
            productType: productType || (orderType === 'pre-order' ? 'pre-order' : 'slot-cars'),
            carType, carClass, partType, scale, supplier,
            collections,
            categories: selectedCategories,
            tags: [brand, orderType, 'poster', ...tagList].filter(Boolean),
            eta: estimatedDeliveryDate,
            pageId,
            posterRef: posterId,
            shortCode: posterShortCode,
            seo: { metaTitle: seoTitle, metaDescription: seoDescription, metaKeywords: seoKeywords },
          }),
        })
      } catch (err) {
        console.warn('Product sync failed (non-fatal):', err)
      }

      router.push('/admin/slotcar-orders')
    } catch (err) {
      console.error('Error saving poster:', err)
      alert('Failed to save poster')
    } finally {
      setSaving(false)
    }
  }

  const addToProductsUrl = (() => {
    const params = new URLSearchParams()
    if (itemDescription) params.set('title', itemDescription)
    if (description) params.set('description', description)
    if (preOrderPrice) params.set('price', preOrderPrice)
    if (sku) params.set('sku', sku)
    if (brand) params.set('brand', brand)
    if (availableQty) params.set('quantity', availableQty.toString())
    // Skip base64 data URIs — they're too large for a URL and Cloudflare rejects with 400
    if (imageUrl && !imageUrl.startsWith('data:')) params.set('imageUrl', imageUrl)
    return `/admin/products/new?${params.toString()}`
  })()

  const bookingLink = shortCode
    ? `${BOOK_NOW_URL}/${shortCode}`
    : editId ? `${BOOK_NOW_URL}/${editId}` : BOOK_NOW_URL

  const toggleCategory = (slug: string) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  // derive selected page title for the link
  const selectedPage = availablePages.find((p) => p.id === pageId)

  return (
    <div className="font-play min-h-screen bg-gray-50">

      {/* ── Sticky Header ── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2 flex-wrap">
            <div className="flex items-center gap-4">
              <Link href="/admin/slotcar-orders" className="text-gray-600 hover:text-gray-900 font-play text-sm">
                ← Back to Orders
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 font-play">
                {editId ? 'Edit Pre-Order Poster' : 'Create Pre-Order Poster'}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 text-sm font-bold rounded-lg border-2 border-gray-300 bg-white hover:bg-gray-50 font-play flex items-center gap-1.5 transition-colors"
              >
                {linkCopied ? '✅ Copied!' : '🔗 Copy Link'}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF || !itemDescription}
                className="px-3 py-2 text-sm font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white font-play flex items-center gap-1.5 disabled:opacity-50"
              >
                📄 Export PDF
              </button>
              <Button
                onClick={handleExportToWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white font-play flex items-center gap-2"
                disabled={!itemDescription || !preOrderPrice}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </Button>
              <Button onClick={handleExportToFacebook} className="bg-blue-600 hover:bg-blue-700 text-white font-play" disabled={!itemDescription || !preOrderPrice}>
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
              <Button variant="outline" className="font-play" asChild>
                <a href={addToProductsUrl} target="_blank" rel="noopener noreferrer">
                  Add to Products
                </a>
              </Button>
              <Button onClick={handleSave} className="bg-gray-900 hover:bg-gray-800 text-white font-play" disabled={saving || !itemDescription || !preOrderPrice}>
                {saving ? 'Saving...' : 'Save Poster'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Booking Link Bar ── */}
      {(shortCode || editId) && (
        <div className="bg-blue-50 border-b border-blue-200 py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3 text-sm flex-wrap">
            <span className="text-blue-600 font-medium font-play">Booking Link:</span>
            <code className="bg-white border border-blue-200 px-3 py-1 rounded text-blue-800 font-mono text-xs">{bookingLink}</code>
            <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline font-play text-xs">Open →</a>
            <button onClick={handleCopyLink} className="text-blue-600 hover:text-blue-800 font-play text-xs font-medium">{linkCopied ? '✅ Copied!' : '📋 Copy'}</button>
          </div>
        </div>
      )}

      {/* ── Main Grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ════ LEFT COLUMN: Forms ════ */}
          <div className="space-y-4">

            {/* ─ Task 1: All sections have checkbox toggle ─ */}

            {/* 1. Product Image */}
            <SectionCard title="Product Image" open={open.image} onToggle={() => toggle('image')}>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {imageUrl ? (
                  <div className="relative">
                    <img src={imageUrl} alt="Product" className="max-h-64 mx-auto rounded-lg" />
                    <button onClick={() => { setImageUrl(''); setImageFile(null) }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600">×</button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-600 font-play">Click to upload product image</p>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </SectionCard>

            {/* 2. Order Type */}
            <SectionCard title="Order Type" open={open.orderType} onToggle={() => toggle('orderType')}>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="orderType" value="pre-order" checked={orderType === 'pre-order'} onChange={() => setOrderType('pre-order')} className="w-4 h-4 accent-gray-900" />
                  <span className="font-play font-medium">Pre-Order</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="orderType" value="new-order" checked={orderType === 'new-order'} onChange={() => setOrderType('new-order')} className="w-4 h-4 accent-gray-900" />
                  <span className="font-play font-medium">New Order</span>
                </label>
              </div>
            </SectionCard>

            {/* 3. Product Details */}
            <SectionCard title="Product Details" open={open.productDetails} onToggle={() => toggle('productDetails')}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Item SKU</label>
                <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g., NSR-1234" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Item Description *</label>
                <input type="text" value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} placeholder="e.g., NSR Porsche 917K" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Estimated Delivery Date</label>
                <input type="date" value={estimatedDeliveryDate} onChange={(e) => setEstimatedDeliveryDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Brand (Unit)</label>
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">Select Brand…</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Product description…" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Pre-Order Price (Rand) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">R</span>
                  <input type="number" step="0.01" value={preOrderPrice} onChange={(e) => setPreOrderPrice(e.target.value)} placeholder="0.00" className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Available Quantity</label>
                <input type="number" value={availableQty} onChange={(e) => setAvailableQty(parseInt(e.target.value) || 0)} min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
              </div>
            </SectionCard>

            {/* ─ Task 2: Categories ─ */}
            <SectionCard title="Categories" open={open.categories} onToggle={() => toggle('categories')}>
              <p className="text-xs text-gray-500 font-play">Select all categories this product belongs to</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-52 overflow-y-auto">
                {apiCategories.length === 0 ? (
                  <p className="text-xs text-gray-400 px-4 py-3 font-play">Loading categories…</p>
                ) : (
                  apiCategories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.slug)}
                        onChange={() => toggleCategory(cat.slug)}
                        className="w-4 h-4 accent-gray-900"
                      />
                      <span className="text-sm font-play text-gray-800 flex-1">{cat.name}</span>
                      {cat.class && (
                        <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded font-play">
                          {cat.class}
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((slug) => (
                    <span key={slug} className="bg-gray-900 text-white text-xs px-2.5 py-1 rounded-full font-play flex items-center gap-1">
                      {slug}
                      <button onClick={() => toggleCategory(slug)} className="hover:text-red-300 ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}
              <a href="/admin/catalogue/categories" target="_blank" className="text-xs text-blue-600 hover:underline font-play">
                Manage Categories →
              </a>
            </SectionCard>

            {/* ─ Task 3: Product Organization – Full Selection ─ */}
            <SectionCard title="Product Organization" open={open.productOrg} onToggle={() => toggle('productOrg')}>

              {/* Class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Racing Class</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCarClass('')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors font-play ${!carClass ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'}`}
                  >
                    None
                  </button>
                  {RACING_CLASSES.map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setCarClass(carClass === cls ? '' : cls)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors font-play ${carClass === cls ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Product Type</label>
                <select value={productType} onChange={(e) => setProductType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">Select type…</option>
                  {PRODUCT_TYPES.map((t) => <option key={t} value={t.toLowerCase().replace(/ /g, '-')}>{t}</option>)}
                </select>
              </div>

              {/* Car Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Car Type</label>
                <select value={carType} onChange={(e) => setCarType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">Select car type…</option>
                  {CAR_TYPES.map((t) => <option key={t} value={t.toLowerCase().replace(/ /g, '-')}>{t}</option>)}
                </select>
              </div>

              {/* Scale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Scale</label>
                <select value={scale} onChange={(e) => setScale(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">Select scale…</option>
                  {SCALES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Part Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Part Type</label>
                <select value={partType} onChange={(e) => setPartType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">Select part type…</option>
                  {PART_TYPES.map((t) => <option key={t} value={t.toLowerCase().replace(/ /g, '-')}>{t}</option>)}
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Supplier</label>
                <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">Select supplier…</option>
                  {SUPPLIERS.map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Tags</label>
                <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="gt3, limited, 2025, livery (comma-separated)" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play" />
              </div>

              {/* Assign to Page */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Assign to Page</label>
                <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play">
                  <option value="">No page assigned</option>
                  {availablePages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
                {pageId && (
                  <div className="flex gap-3 mt-2">
                    <a href={`/admin/pages/editor/${pageId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-play">View Page →</a>
                    <span className="text-gray-300">|</span>
                    <a href={`/admin/pages/frontend/${pageId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline font-play">Preview Live →</a>
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ─ Task 4: SEO Options ─ */}
            <SectionCard title="SEO Options" open={open.seo} onToggle={() => toggle('seo')}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Meta Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder={itemDescription || 'Page title for search engines'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play"
                />
                <p className="mt-1 text-xs text-gray-400 font-play">{seoTitle.length}/70 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Meta Description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  placeholder={description ? description.slice(0, 160) : 'Brief description for search results'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play"
                />
                <p className="mt-1 text-xs text-gray-400 font-play">{seoDescription.length}/160 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 font-play">Meta Keywords</label>
                <input
                  type="text"
                  value={seoKeywords}
                  onChange={(e) => setSeoKeywords(e.target.value)}
                  placeholder="slot car, 1/32, pre-order, NSR, GT3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 font-play"
                />
                <p className="mt-1 text-xs text-gray-400 font-play">Separate with commas</p>
              </div>
            </SectionCard>

          </div>{/* end left column */}

          {/* ════ RIGHT COLUMN: Preview + actions ════ */}
          <div className="space-y-4">

            {/* Poster Preview */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold font-play">Poster Preview</h3>
                  <button onClick={handleExportPDF} disabled={!itemDescription} className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-play">
                    📄 Print / PDF
                  </button>
                </div>

                <div ref={posterRef} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden" style={{ maxWidth: '400px', margin: '0 auto' }}>
                  <div className={`py-2 px-4 text-center font-bold text-white font-play ${orderType === 'pre-order' ? 'bg-orange-500' : 'bg-green-500'}`}>
                    {orderType === 'pre-order' ? '🎯 PRE-ORDER' : '✨ NEW ORDER'}
                  </div>
                  <div className="bg-gray-100 flex items-center justify-center" style={{ maxHeight: '280px', overflow: 'hidden' }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt="Product" className="max-w-full max-h-[280px] object-contain" />
                    ) : (
                      <div className="text-gray-400 text-center p-8">
                        <svg className="mx-auto h-14 w-14 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="font-play text-sm">Product Image</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-xs text-gray-500 font-play">SKU: {sku || '---'}</p>
                        <h4 className="text-lg font-bold font-play leading-tight">{itemDescription || 'Product Name'}</h4>
                      </div>
                      {brand && <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded font-play shrink-0">{brand}</span>}
                    </div>
                    {/* Org chips in preview */}
                    {(carClass || scale || productType) && (
                      <div className="flex flex-wrap gap-1">
                        {carClass && <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-play font-bold">{carClass}</span>}
                        {scale && <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-play">{scale}</span>}
                        {productType && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-play">{productType}</span>}
                      </div>
                    )}
                    {description && <p className="text-sm text-gray-600 font-play line-clamp-3">{description}</p>}
                    {/* Categories in preview */}
                    {selectedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedCategories.slice(0, 4).map((slug) => (
                          <span key={slug} className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full font-play">{slug}</span>
                        ))}
                        {selectedCategories.length > 4 && <span className="text-xs text-gray-400 font-play">+{selectedCategories.length - 4}</span>}
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div>
                        <p className="text-xs text-gray-500 font-play">Est. Delivery</p>
                        <p className="font-semibold font-play text-sm">{estimatedDeliveryDate || '---'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 font-play">Price</p>
                        <p className="text-2xl font-bold text-red-500 font-play">R{preOrderPrice || '0.00'}</p>
                      </div>
                    </div>
                    <a href={bookingLink} target="_blank" rel="noopener noreferrer" className="block w-full py-3 bg-black text-white text-center font-bold font-play rounded-lg hover:bg-gray-800 transition-colors">
                      BOOK NOW →
                    </a>
                    {(shortCode || editId) && (
                      <p className="text-xs text-center text-gray-500 font-play font-mono">{bookingLink.replace('https://', '')}</p>
                    )}
                    <p className="text-xs text-center text-gray-400 font-play">R66SLOT – Premium Slot Cars</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold font-play text-sm mb-3 text-gray-700">Poster Summary</h4>
                <div className="space-y-1.5 text-xs font-play">
                  {carClass && <div className="flex justify-between"><span className="text-gray-500">Class:</span><span className="font-bold text-red-600">{carClass}</span></div>}
                  {productType && <div className="flex justify-between"><span className="text-gray-500">Type:</span><span>{productType}</span></div>}
                  {scale && <div className="flex justify-between"><span className="text-gray-500">Scale:</span><span>{scale}</span></div>}
                  {supplier && <div className="flex justify-between"><span className="text-gray-500">Supplier:</span><span>{supplier}</span></div>}
                  {selectedCategories.length > 0 && <div className="flex justify-between"><span className="text-gray-500">Categories:</span><span>{selectedCategories.length} selected</span></div>}
                  {selectedPage && <div className="flex justify-between"><span className="text-gray-500">Page:</span><span className="truncate max-w-[120px]">{selectedPage.title}</span></div>}
                  {seoTitle && <div className="flex justify-between"><span className="text-gray-500">SEO Title:</span><span className="truncate max-w-[120px]">{seoTitle}</span></div>}
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold font-play text-sm mb-3 text-gray-700">Quick Links</h4>
                <div className="space-y-2">
                  <Link href="/admin/slotcar-orders" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-play">🎨 Slotcar Orders</Link>
                  <Link href="/admin/products/new" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-play">➕ New Product</Link>
                  <Link href="/admin/catalogue/categories" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-play">🏷️ Product Categories</Link>
                  <Link href="/products" target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-play">🛒 View Products →</Link>
                </div>
              </CardContent>
            </Card>

          </div>{/* end right column */}
        </div>
      </div>
    </div>
  )
}
