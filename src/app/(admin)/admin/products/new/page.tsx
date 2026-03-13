'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MediaLibraryPicker } from '@/components/page-editor/media-library-picker'

export default function NewProductPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)

  // Product state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [costPerItem, setCostPerItem] = useState('')
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [trackQuantity, setTrackQuantity] = useState(true)
  const [quantity, setQuantity] = useState('0')
  const [weight, setWeight] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [brand, setBrand] = useState('')
  const [productType, setProductType] = useState('')
  const [itemCategories, setItemCategories] = useState<string[]>([])
  const [itemCategoryDropdownOpen, setItemCategoryDropdownOpen] = useState(false)
  const [carType, setCarType] = useState('')
  const [partType, setPartType] = useState('')
  const [scale, setScale] = useState('')
  const [supplier, setSupplier] = useState('')
  const [collections, setCollections] = useState<string[]>([])
  const [tags, setTags] = useState('')
  // Category (Brand) dropdown
  const [categoryBrands, setCategoryBrands] = useState<string[]>([])
  const [categoryBrandDropdownOpen, setCategoryBrandDropdownOpen] = useState(false)
  const [newCategoryBrandInput, setNewCategoryBrandInput] = useState('')
  // Sage Accounts
  const [salesAccount, setSalesAccount] = useState<string[]>([])
  const [purchaseAccount, setPurchaseAccount] = useState<string[]>([])
  const [salesAccountOptions, setSalesAccountOptions] = useState<string[]>([])
  const [purchaseAccountOptions, setPurchaseAccountOptions] = useState<string[]>([])
  const [salesAccountDropdownOpen, setSalesAccountDropdownOpen] = useState(false)
  const [purchaseAccountDropdownOpen, setPurchaseAccountDropdownOpen] = useState(false)
  const [newSalesAccountInput, setNewSalesAccountInput] = useState('')
  const [newPurchaseAccountInput, setNewPurchaseAccountInput] = useState('')
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string; class?: string }[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [status, setStatus] = useState('draft')
  const [boxSize, setBoxSize] = useState('')
  const [dimLength, setDimLength] = useState('')
  const [dimWidth, setDimWidth] = useState('')
  const [dimHeight, setDimHeight] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string; type: string }[]>([])
  const [pageIds, setPageIds] = useState<string[]>([])
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false)
  const [availablePages, setAvailablePages] = useState<{ id: string; title: string }[]>([])
  const [carBrands, setCarBrands] = useState<string[]>([])
  const [carBrandDropdownOpen, setCarBrandDropdownOpen] = useState(false)
  const [newCarBrandInput, setNewCarBrandInput] = useState('')
  const [customCarBrands, setCustomCarBrands] = useState<string[]>([])
  const BASE_CAR_BRANDS = ['Datsun 510', 'Ford Escort MK I', 'Ford Escort MK II', 'BMW M3 E30', 'Porsche 911', 'Ferrari 308', 'Lancia Delta', 'Audi Quattro']
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  // Revo Racing Class Filter
  const DEFAULT_CAR_CLASSES = ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA']
  const DEFAULT_REVO_PARTS = ['Tyres', 'Wheels', 'Axle', 'Bearings', 'Gears', 'Pinions', 'Screws and Nuts', 'Motors', 'Guides', 'Body Plates & Chassis', 'White body parts set', 'Clear parts set', 'Lexan Cockpit Set']
  const [carClassOptions, setCarClassOptions] = useState<string[]>(DEFAULT_CAR_CLASSES)
  const [selectedCarClasses, setSelectedCarClasses] = useState<string[]>([])
  const [carClassDropdownOpen, setCarClassDropdownOpen] = useState(false)
  const [newCarClassInput, setNewCarClassInput] = useState('')
  // Revo Parts Filter
  const [revoPartOptions, setRevoPartOptions] = useState<string[]>(DEFAULT_REVO_PARTS)
  const [selectedRevoParts, setSelectedRevoParts] = useState<string[]>([])
  const [revoPartDropdownOpen, setRevoPartDropdownOpen] = useState(false)
  const [newRevoPartInput, setNewRevoPartInput] = useState('')
  // Revo Car Type (multi-select)
  const [carTypes, setCarTypes] = useState<string[]>([])
  const [carTypeOptions, setCarTypeOptions] = useState<string[]>(['Livery', 'White Kit', 'White Body Kit', 'White Body'])
  const [carTypeDropdownOpen, setCarTypeDropdownOpen] = useState(false)
  const [newCarTypeInput, setNewCarTypeInput] = useState('')
  // Sideways Product Organization
  const BASE_CAR_BRANDS_NEW = ['Datsun 510', 'Ford Escort MK I', 'Ford Escort MK II', 'BMW M3 E30', 'Porsche 911', 'Ferrari 308', 'Lancia Delta', 'Audi Quattro']
  const [sidewaysBrands, setSidewaysBrands] = useState<string[]>([])
  const [sidewaysBrandOptions, setSidewaysBrandOptions] = useState<string[]>([...BASE_CAR_BRANDS_NEW])
  const [sidewaysBrandDropdownOpen, setSidewaysBrandDropdownOpen] = useState(false)
  const [newSidewaysBrandInput, setNewSidewaysBrandInput] = useState('')
  const [sidewaysParts, setSelectedSidewaysParts] = useState<string[]>([])
  const [sidewaysPartOptions, setSidewaysPartOptions] = useState<string[]>([])
  const [sidewaysPartDropdownOpen, setSidewaysPartDropdownOpen] = useState(false)
  const [newSidewaysPartInput, setNewSidewaysPartInput] = useState('')
  const [sidewaysCarTypes, setSidewaysCarTypes] = useState<string[]>([])
  const [sidewaysCarTypeDropdownOpen, setSidewaysCarTypeDropdownOpen] = useState(false)
  const [newSidewaysCarTypeInput, setNewSidewaysCarTypeInput] = useState('')
  const [selectedSidewaysCarClasses, setSelectedSidewaysCarClasses] = useState<string[]>([])
  const [sidewaysCarClassDropdownOpen, setSidewaysCarClassDropdownOpen] = useState(false)
  const [newSidewaysCarClassInput, setNewSidewaysCarClassInput] = useState('')
  // Custom Brand Org Cards
  const [customOrgCards, setCustomOrgCards] = useState<{ id: string; name: string }[]>([])
  const [customOrgData, setCustomOrgData] = useState<Record<string, { brands: string[]; carClasses: string[]; parts: string[]; carTypes: string[] }>>({})
  const [customOrgBrands, setCustomOrgBrands] = useState<Record<string, string[]>>({})
  const [customOrgDropdowns, setCustomOrgDropdowns] = useState<Record<string, string | null>>({})
  const [customOrgNewInput, setCustomOrgNewInput] = useState<Record<string, string>>({})
  const [customOrgCollapsed, setCustomOrgCollapsed] = useState<Record<string, boolean>>({})
  const [showNewOrgInput, setShowNewOrgInput] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  // Collapse states
  const [productOrgCollapsed, setProductOrgCollapsed] = useState(false)
  const [revoOrgCollapsed, setRevoOrgCollapsed] = useState(false)
  const [sidewaysOrgCollapsed, setSidewaysOrgCollapsed] = useState(false)

  // Load available pages and categories on mount
  useEffect(() => {
    fetch('/api/admin/pages')
      .then(res => res.json())
      .then(pages => {
        if (Array.isArray(pages)) {
          setAvailablePages(pages.map((p: any) => ({ id: p.id, title: p.title })))
        }
      })
      .catch(() => {})

    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, class: c.class })))
        }
      })
      .catch(() => {})

    fetch('/api/admin/product-options')
      .then(r => r.json())
      .then(opts => {
        if (opts.brands?.length) setBrands(opts.brands)
        if (opts.scales?.length) setScales(opts.scales)
        if (opts.categories?.length) setProductTypes(opts.categories)
        if (opts.salesAccounts?.length) setSalesAccountOptions(opts.salesAccounts)
        if (opts.purchaseAccounts?.length) setPurchaseAccountOptions(opts.purchaseAccounts)
        if (opts.carClasses?.length) setCarClassOptions(opts.carClasses)
        if (opts.revoParts?.length) setRevoPartOptions(opts.revoParts)
        if (opts.sidewaysParts?.length) setSidewaysPartOptions(opts.sidewaysParts)
        if (opts.customOrgCards?.length) setCustomOrgCards(opts.customOrgCards)
        if (opts.customOrgBrands) setCustomOrgBrands(opts.customOrgBrands)
      })
      .catch(() => {})
  }, [])

  // Load data from poster page if passed via URL params
  useEffect(() => {
    const paramTitle = searchParams.get('title')
    const paramDescription = searchParams.get('description')
    const paramPrice = searchParams.get('price')
    const paramSku = searchParams.get('sku')
    const paramBrand = searchParams.get('brand')
    const paramQuantity = searchParams.get('quantity')
    const paramImageUrl = searchParams.get('imageUrl')

    if (paramTitle) setTitle(paramTitle)
    if (paramDescription) setDescription(paramDescription)
    if (paramPrice) setPrice(paramPrice)
    if (paramSku) setSku(paramSku)
    if (paramBrand) setBrand(paramBrand.toLowerCase())
    if (paramQuantity) setQuantity(paramQuantity)
    if (paramImageUrl) setMediaFiles([{ name: 'poster-image.jpg', url: paramImageUrl, type: 'image/jpeg' }])
  }, [searchParams])

  // Click-outside — close all dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (categoryBrandRef.current && !categoryBrandRef.current.contains(t)) setCategoryBrandDropdownOpen(false)
      if (itemCategoryRef.current && !itemCategoryRef.current.contains(t)) setItemCategoryDropdownOpen(false)
      if (salesAccountRef.current && !salesAccountRef.current.contains(t)) setSalesAccountDropdownOpen(false)
      if (purchaseAccountRef.current && !purchaseAccountRef.current.contains(t)) setPurchaseAccountDropdownOpen(false)
      if (carClassRef.current && !carClassRef.current.contains(t)) setCarClassDropdownOpen(false)
      if (revoPartRef.current && !revoPartRef.current.contains(t)) setRevoPartDropdownOpen(false)
      if (carBrandRef.current && !carBrandRef.current.contains(t)) setCarBrandDropdownOpen(false)
      if (carTypeRef.current && !carTypeRef.current.contains(t)) setCarTypeDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Lists for custom options (loaded from API)
  const [brands, setBrands] = useState(['NSR', 'Revo', 'Pioneer', 'Sideways'])
  const [scales, setScales] = useState(['1/32', '1/24'])
  const [productTypes, setProductTypes] = useState(['Slot Cars', 'Parts'])

  // Modal states
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [showAddScale, setShowAddScale] = useState(false)
  const [showAddProductType, setShowAddProductType] = useState(false)

  // New item inputs
  const [newBrand, setNewBrand] = useState('')
  const [newScale, setNewScale] = useState('')
  const [newProductType, setNewProductType] = useState('')

  // Save options to persistent store
  const saveOptions = async (key: string, list: string[]) => {
    try {
      await fetch('/api/admin/product-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: list }),
      })
    } catch { /* non-critical */ }
  }

  // Add new item functions
  const handleAddBrand = () => {
    const val = newBrand.trim()
    if (val && !brands.includes(val)) {
      const next = [...brands, val]
      setBrands(next)
      saveOptions('brands', next)
      setBrand(val)
      setNewBrand('')
      setShowAddBrand(false)
    }
  }

  const handleAddScale = () => {
    const val = newScale.trim()
    if (val && !scales.includes(val)) {
      const next = [...scales, val]
      setScales(next)
      saveOptions('scales', next)
      setScale(val)
      setNewScale('')
      setShowAddScale(false)
    }
  }

  const handleAddProductType = () => {
    const val = newProductType.trim()
    if (val && !productTypes.includes(val)) {
      const next = [...productTypes, val]
      setProductTypes(next)
      saveOptions('categories', next)
      setProductType(val.toLowerCase().replace(/ /g, '-'))
      setNewProductType('')
      setShowAddProductType(false)
    }
  }

  const [saveError, setSaveError] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const draggedIdx = useRef<number | null>(null)
  const categoryBrandRef = useRef<HTMLDivElement>(null)
  const itemCategoryRef = useRef<HTMLDivElement>(null)
  const salesAccountRef = useRef<HTMLDivElement>(null)
  const purchaseAccountRef = useRef<HTMLDivElement>(null)
  const carClassRef = useRef<HTMLDivElement>(null)
  const revoPartRef = useRef<HTMLDivElement>(null)
  const carBrandRef = useRef<HTMLDivElement>(null)
  const carTypeRef = useRef<HTMLDivElement>(null)

  // Upload base64 images to server and return real URLs
  const uploadPendingImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const file of mediaFiles) {
      if (file.url.startsWith('data:')) {
        // Convert base64 data URI to File and upload
        try {
          const res = await fetch(file.url)
          const blob = await res.blob()
          const formData = new FormData()
          formData.append('file', blob, file.name || 'image.jpg')
          const uploadRes = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
          if (uploadRes.ok) {
            const data = await uploadRes.json()
            uploadedUrls.push(data.url)
          }
        } catch (err) {
          console.error('Image upload failed:', err)
        }
      } else {
        uploadedUrls.push(file.url)
      }
    }
    return uploadedUrls
  }

  const handleSave = async (publishStatus: string) => {
    setSaving(true)
    setSaveError('')

    // Validate required field
    if (!title.trim()) {
      setSaveError('Product title is required')
      setSaving(false)
      return
    }

    // Clean numeric values - avoid NaN
    const cleanFloat = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
    const cleanInt = (v: string) => { const n = parseInt(v); return isNaN(n) ? 0 : n }

    try {
      // Upload any base64 images first
      setUploadingImages(true)
      const imageUrls = await uploadPendingImages()
      setUploadingImages(false)

      const productData = {
        title: title.trim(),
        description,
        price: cleanFloat(price),
        compareAtPrice: compareAtPrice ? cleanFloat(compareAtPrice) : null,
        costPerItem: costPerItem ? cleanFloat(costPerItem) : null,
        sku,
        barcode,
        trackQuantity,
        quantity: cleanInt(quantity),
        weight: weight ? cleanFloat(weight) : null,
        weightUnit,
        brand: categoryBrands[0] || brand,
        productType: itemCategories[0] || productType,
        categoryBrands,
        itemCategories,
        carType: carTypes[0] || carType,
        carTypes,
        partType,
        scale,
        supplier,
        collections: [...collections, ...selectedCategories.filter(c => !collections.includes(c))],
        categories: selectedCategories,
        salesAccount,
        purchaseAccount,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status: publishStatus,
        boxSize,
        dimensions: {
          length: dimLength ? cleanFloat(dimLength) : null,
          width: dimWidth ? cleanFloat(dimWidth) : null,
          height: dimHeight ? cleanFloat(dimHeight) : null,
        },
        mediaFiles: imageUrls,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : '',
        pageIds,
        pageId: pageIds[0] || '',
        carBrands,
        carClass: selectedCarClasses[0] || '',
        revoParts: selectedRevoParts,
        sidewaysBrands,
        sidewaysParts,
        sidewaysCarClasses: selectedSidewaysCarClasses,
        sidewaysCarTypes,
        customOrgs: customOrgData,
        isPreOrder,
        seo: {
          metaTitle: seoTitle,
          metaDescription: seoDescription,
          metaKeywords: seoKeywords,
        },
      }

      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      if (res.ok) {
        router.push('/admin/products')
      } else {
        let errMsg = `Server error (${res.status})`
        try {
          const errData = await res.json()
          if (errData.error) errMsg = errData.error
        } catch {}
        setSaveError(errMsg)
        setSaving(false)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      setSaveError('Network error - check your connection')
      setUploadingImages(false)
      setSaving(false)
    }
  }

  const handleExportToWhatsApp = () => {
    const header = isPreOrder
      ? `🎯 *PRE-ORDER – ${title || 'Product'}*`
      : `🛒 *${title || 'Product'}*`

    const parts: string[] = [header, '']
    if (brand) parts.push(`*Brand:* ${brand}`)
    if (carBrands.length > 0) parts.push(`*Car Brand:* ${carBrands.join(', ')}`)
    if (carType) parts.push(`*Car Type:* ${carType}`)
    if (scale) parts.push(`*Scale:* ${scale}`)
    if (productType) parts.push(`*Type:* ${productType}`)
    if (partType) parts.push(`*Part Type:* ${partType}`)
    if (sku) parts.push(`*SKU:* ${sku}`)
    if (price) parts.push(`*Price:* R${parseFloat(price).toFixed(2)}`)
    if (compareAtPrice) parts.push(`*Was:* R${parseFloat(compareAtPrice).toFixed(2)}`)
    if (quantity && quantity !== '0') parts.push(`*Qty:* ${quantity}`)
    if (description) { parts.push(''); parts.push(description) }
    if (isPreOrder) {
      parts.push('', `📋 *Book Now:* https://r66slot.co.za/book`)
    }

    const message = parts.join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/products"
                className="text-gray-600 hover:text-gray-900"
              >
                ← Products
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Add product</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportToWhatsApp}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                type="button"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Export to WhatsApp
              </button>
              <button
                onClick={() => router.push('/admin/products')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                disabled={saving}
              >
                Discard
              </button>
              <button
                onClick={() => handleSave('draft')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                disabled={saving}
              >
                Save as draft
              </button>
              <button
                onClick={() => handleSave('active')}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                disabled={saving}
              >
                {uploadingImages ? 'Uploading images...' : saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {saveError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <span className="text-red-600 font-medium text-sm">Error: {saveError}</span>
            <button onClick={() => setSaveError('')} className="ml-auto text-red-400 hover:text-red-600 text-lg">&times;</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title & Description */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short sleeve t-shirt"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Product description..."
                  />
                </div>
              </div>
            </div>

            {/* Media */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Media</h3>
              <p className="text-xs text-gray-400 mb-4">Drag to reorder · First image is the main image</p>
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => { draggedIdx.current = index }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverIdx(index) }}
                      onDragLeave={() => setDragOverIdx(null)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOverIdx(null)
                        const from = draggedIdx.current
                        if (from !== null && from !== index) {
                          setMediaFiles(prev => {
                            const next = [...prev]
                            const [item] = next.splice(from, 1)
                            next.splice(index, 0, item)
                            return next
                          })
                        }
                        draggedIdx.current = null
                      }}
                      className={`relative group cursor-grab active:cursor-grabbing rounded-lg ${dragOverIdx === index ? 'ring-2 ring-blue-400' : ''}`}
                    >
                      {file.type.startsWith('image/') || file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <img src={file.url} alt={file.name} className="w-full h-32 object-contain rounded-lg border border-gray-200 bg-gray-50" />
                      ) : (
                        <div className="w-full h-32 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                          <div className="text-center">
                            <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <p className="text-xs text-gray-500 mt-1 truncate px-2">{file.name}</p>
                          </div>
                        </div>
                      )}
                      {/* MAIN badge */}
                      {index === 0 ? (
                        <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded pointer-events-none">
                          MAIN
                        </span>
                      ) : (
                        <button
                          onClick={() => setMediaFiles(prev => {
                            const next = [...prev]
                            const [item] = next.splice(index, 1)
                            next.unshift(item)
                            return next
                          })}
                          className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Set Main
                        </button>
                      )}
                      {/* Remove */}
                      <button
                        onClick={() => setMediaFiles(mediaFiles.filter((_, i) => i !== index))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer block hover:border-gray-400 transition-colors">
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="text-sm text-gray-600">
                    <span className="text-blue-600 hover:text-blue-700 font-medium">
                      Add file
                    </span>
                    {' '}or drop files to upload
                  </div>
                  <p className="text-xs text-gray-400">Images, PDFs, documents</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={(e) => {
                    const files = e.target.files
                    if (!files) return
                    Array.from(files).forEach(file => {
                      const reader = new FileReader()
                      reader.onloadend = () => {
                        setMediaFiles(prev => [...prev, {
                          name: file.name,
                          url: reader.result as string,
                          type: file.type,
                        }])
                      }
                      reader.readAsDataURL(file)
                    })
                    e.target.value = ''
                  }}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => setMediaLibraryOpen(true)}
                className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Choose from Media Library
              </button>
              <MediaLibraryPicker
                open={mediaLibraryOpen}
                onClose={() => setMediaLibraryOpen(false)}
                onSelect={(url) => {
                  const name = url.split('/').pop() || 'image'
                  setMediaFiles(prev => [...prev, { name, url, type: 'image/jpeg' }])
                }}
              />
            </div>

            {/* Pricing */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Pricing (Rand)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R</span>
                    <input
                      type="number"
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Compare at price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">R</span>
                    <input
                      type="number"
                      step="0.01"
                      value={compareAtPrice}
                      onChange={(e) => setCompareAtPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost per item
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">R</span>
                  <input
                    type="number"
                    step="0.01"
                    value={costPerItem}
                    onChange={(e) => setCostPerItem(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Customers won&apos;t see this
                </p>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Inventory</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU (Stock Keeping Unit)
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Barcode (ISBN, UPC, GTIN, etc.)
                    </label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="trackQuantity"
                    checked={trackQuantity}
                    onChange={(e) => setTrackQuantity(e.target.checked)}
                    className="h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
                  />
                  <label htmlFor="trackQuantity" className="ml-2 text-sm text-gray-700">
                    Track quantity
                  </label>
                </div>
                {trackQuantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Shipping */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Shipping</h3>

              {/* Box Size */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Box Size
                </label>
                <select
                  value={boxSize}
                  onChange={(e) => setBoxSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="">Select box size...</option>
                  <option value="extra-small">Extra Small</option>
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra-large">Extra Large</option>
                </select>
              </div>

              {/* Dimensions */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions (cm)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={dimLength}
                      onChange={(e) => setDimLength(e.target.value)}
                      placeholder="Length"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">Length</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={dimWidth}
                      onChange={(e) => setDimWidth(e.target.value)}
                      placeholder="Width"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">Width</p>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.1"
                      value={dimHeight}
                      onChange={(e) => setDimHeight(e.target.value)}
                      placeholder="Height"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1 text-center">Height</p>
                  </div>
                </div>
              </div>

              {/* Weight */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lbs</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Product Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Product status</h3>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
              </select>
            </div>

            {/* Product Organization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button type="button" onClick={() => setProductOrgCollapsed(!productOrgCollapsed)} className="w-full flex items-center justify-between mb-4 text-left group">
                <h3 className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Product Organization</h3>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${productOrgCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {!productOrgCollapsed && <div className="space-y-4">

                {/* Pre Order Toggle */}
                <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Pre Order</p>
                    <p className="text-xs text-gray-500">Changes &quot;Add to Cart&quot; to &quot;Pre Order&quot; and shows product on /book</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreOrder(!isPreOrder)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${isPreOrder ? 'bg-orange-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isPreOrder ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scale</label>
                  <select
                    value={scale}
                    onChange={(e) => setScale(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select scale...</option>
                    {scales.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowAddScale(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Scale</button>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="Separate with commas"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>

                {/* Page Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Page</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <span className={pageIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {pageIds.length === 0 ? 'No page assigned' : pageIds.length === 1 ? (availablePages.find(p => p.id === pageIds[0])?.title || pageIds[0]) : `${pageIds.length} pages selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${pageDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {pageDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={pageIds.length === 0} onChange={() => setPageIds([])} className="rounded" />
                          <span className="text-sm text-gray-500 italic">No page assigned</span>
                        </label>
                        {availablePages.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={pageIds.includes(p.id)} onChange={(e) => setPageIds(e.target.checked ? [...pageIds, p.id] : pageIds.filter(id => id !== p.id))} className="rounded" />
                            <span className="text-sm text-gray-900">{p.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {pageIds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pageIds.map(pid => (
                        <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                          <a href={`/admin/pages/editor/${pid}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {availablePages.find(p => p.id === pid)?.title || pid}
                          </a>
                          <button type="button" onClick={() => setPageIds(pageIds.filter(id => id !== pid))} className="ml-0.5 text-gray-400 hover:text-red-500" title="Remove page">×</button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Select pages where this product will appear</p>
                  )}
                </div>

                {/* Page Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Page Categories <span className="text-xs text-gray-400">(select multiple)</span></label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                    {categories.length === 0 ? (
                      <p className="text-xs text-gray-400 px-2 py-1">Loading categories...</p>
                    ) : (
                      categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.slug)}
                            onChange={(e) => { if (e.target.checked) { setSelectedCategories(prev => [...prev, cat.slug]) } else { setSelectedCategories(prev => prev.filter(s => s !== cat.slug)) } }}
                            className="h-3.5 w-3.5 text-gray-900 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                          {cat.class && <span className="text-xs text-red-600 font-medium">({cat.class})</span>}
                        </label>
                      ))
                    )}
                  </div>
                  {selectedCategories.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{selectedCategories.length} selected: {selectedCategories.join(', ')}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <a href="/admin/catalogue/categories" target="_blank" className="text-xs text-blue-600 hover:text-blue-800">Manage Categories →</a>
                  </div>
                </div>
              </div>}
            </div>

            {/* Revo Product Organization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button type="button" onClick={() => setRevoOrgCollapsed(!revoOrgCollapsed)} className="w-full flex items-center justify-between mb-4 text-left group">
                <h3 className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Revo Product Organization</h3>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${revoOrgCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {!revoOrgCollapsed && <div className="space-y-4">

                {/* Revo Cars Brand Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revo Cars Brand Page</label>
                  <div className="relative" ref={carBrandRef}>
                    <button type="button" onClick={() => setCarBrandDropdownOpen(!carBrandDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={carBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {carBrands.length === 0 ? 'No brand assigned' : carBrands.length === 1 ? carBrands[0] : `${carBrands.length} brands selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${carBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {carBrandDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={carBrands.length === 0} onChange={() => setCarBrands([])} className="rounded" />
                          <span className="text-sm text-gray-500 italic">None</span>
                        </label>
                        {[...BASE_CAR_BRANDS, ...customCarBrands].map((cb) => (
                          <div key={cb} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={carBrands.includes(cb)} onChange={(e) => setCarBrands(e.target.checked ? [...carBrands, cb] : carBrands.filter(b => b !== cb))} className="rounded" />
                              <span className="text-sm text-gray-900">{cb}</span>
                            </label>
                            {!BASE_CAR_BRANDS.includes(cb) && (
                              <button type="button" onClick={() => { setCustomCarBrands(prev => prev.filter(x => x !== cb)); setCarBrands(prev => prev.filter(b => b !== cb)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100">
                          <input type="text" value={newCarBrandInput} onChange={(e) => setNewCarBrandInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const val = newCarBrandInput.trim(); if (val && ![...BASE_CAR_BRANDS, ...customCarBrands].includes(val)) { setCustomCarBrands(prev => [...prev, val]); setCarBrands(prev => [...prev, val]) }; setNewCarBrandInput('') } }} placeholder="Add brand..." className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                          <button type="button" onClick={() => { const val = newCarBrandInput.trim(); if (val && ![...BASE_CAR_BRANDS, ...customCarBrands].includes(val)) { setCustomCarBrands(prev => [...prev, val]); setCarBrands(prev => [...prev, val]) }; setNewCarBrandInput('') }} className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-700">+Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {carBrands.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {carBrands.map(cb => (
                        <span key={cb} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          {cb}<button type="button" onClick={() => setCarBrands(carBrands.filter(b => b !== cb))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revo Racing Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revo Racing Class Filter</label>
                  <div className="relative" ref={carClassRef}>
                    <button type="button" onClick={() => setCarClassDropdownOpen(!carClassDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={selectedCarClasses.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {selectedCarClasses.length === 0 ? 'Select class...' : selectedCarClasses.length === 1 ? selectedCarClasses[0] : `${selectedCarClasses.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${carClassDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {carClassDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={selectedCarClasses.length === 0} onChange={() => setSelectedCarClasses([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {carClassOptions.map(cls => (
                          <div key={cls} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={selectedCarClasses.includes(cls)} onChange={e => setSelectedCarClasses(e.target.checked ? [...selectedCarClasses, cls] : selectedCarClasses.filter(c => c !== cls))} className="rounded" />
                              <span className="text-sm text-gray-900">{cls}</span>
                            </label>
                            <button type="button" onClick={() => { const next = carClassOptions.filter(x => x !== cls); setCarClassOptions(next); saveOptions('carClasses', next); setSelectedCarClasses(prev => prev.filter(c => c !== cls)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newCarClassInput} onChange={e => setNewCarClassInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCarClassInput.trim()) { e.preventDefault(); const v = newCarClassInput.trim(); if (!carClassOptions.includes(v)) { const next = [...carClassOptions, v]; setCarClassOptions(next); saveOptions('carClasses', next) }; setSelectedCarClasses(prev => prev.includes(v) ? prev : [...prev, v]); setNewCarClassInput('') } }} placeholder="+ Add class..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newCarClassInput.trim(); if (!v) return; if (!carClassOptions.includes(v)) { const next = [...carClassOptions, v]; setCarClassOptions(next); saveOptions('carClasses', next) }; setSelectedCarClasses(prev => prev.includes(v) ? prev : [...prev, v]); setNewCarClassInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedCarClasses.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedCarClasses.map(cls => (
                        <span key={cls} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                          {cls}<button type="button" onClick={() => setSelectedCarClasses(selectedCarClasses.filter(c => c !== cls))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revo Parts Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revo Parts Filter</label>
                  <div className="relative" ref={revoPartRef}>
                    <button type="button" onClick={() => setRevoPartDropdownOpen(!revoPartDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={selectedRevoParts.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {selectedRevoParts.length === 0 ? 'Select part...' : selectedRevoParts.length === 1 ? selectedRevoParts[0] : `${selectedRevoParts.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${revoPartDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {revoPartDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={selectedRevoParts.length === 0} onChange={() => setSelectedRevoParts([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {revoPartOptions.map(part => (
                          <div key={part} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={selectedRevoParts.includes(part)} onChange={e => setSelectedRevoParts(e.target.checked ? [...selectedRevoParts, part] : selectedRevoParts.filter(p => p !== part))} className="rounded" />
                              <span className="text-sm text-gray-900">{part}</span>
                            </label>
                            <button type="button" onClick={() => { const next = revoPartOptions.filter(x => x !== part); setRevoPartOptions(next); saveOptions('revoParts', next); setSelectedRevoParts(prev => prev.filter(p => p !== part)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newRevoPartInput} onChange={e => setNewRevoPartInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newRevoPartInput.trim()) { e.preventDefault(); const v = newRevoPartInput.trim(); if (!revoPartOptions.includes(v)) { const next = [...revoPartOptions, v]; setRevoPartOptions(next); saveOptions('revoParts', next) }; setSelectedRevoParts(prev => prev.includes(v) ? prev : [...prev, v]); setNewRevoPartInput('') } }} placeholder="+ Add part..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newRevoPartInput.trim(); if (!v) return; if (!revoPartOptions.includes(v)) { const next = [...revoPartOptions, v]; setRevoPartOptions(next); saveOptions('revoParts', next) }; setSelectedRevoParts(prev => prev.includes(v) ? prev : [...prev, v]); setNewRevoPartInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedRevoParts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedRevoParts.map(part => (
                        <span key={part} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                          {part}<button type="button" onClick={() => setSelectedRevoParts(selectedRevoParts.filter(p => p !== part))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revo Car Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revo Car Type</label>
                  <div className="relative" ref={carTypeRef}>
                    <button type="button" onClick={() => setCarTypeDropdownOpen(!carTypeDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={carTypes.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {carTypes.length === 0 ? '— None —' : carTypes.length === 1 ? carTypes[0] : `${carTypes.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${carTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {carTypeDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={carTypes.length === 0} onChange={() => setCarTypes([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {carTypeOptions.map(ct => (
                          <div key={ct} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={carTypes.includes(ct)} onChange={e => setCarTypes(e.target.checked ? [...carTypes, ct] : carTypes.filter(t => t !== ct))} className="rounded" />
                              <span className="text-sm text-gray-900">{ct}</span>
                            </label>
                            <button type="button" onClick={() => { const next = carTypeOptions.filter(x => x !== ct); setCarTypeOptions(next); saveOptions('carTypes', next); setCarTypes(prev => prev.filter(t => t !== ct)); setSidewaysCarTypes(prev => prev.filter(t => t !== ct)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newCarTypeInput} onChange={e => setNewCarTypeInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCarTypeInput.trim()) { e.preventDefault(); const v = newCarTypeInput.trim(); if (!carTypeOptions.includes(v)) { const next = [...carTypeOptions, v]; setCarTypeOptions(next); saveOptions('carTypes', next) }; setCarTypes(prev => prev.includes(v) ? prev : [...prev, v]); setNewCarTypeInput('') } }} placeholder="+ Add car type..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newCarTypeInput.trim(); if (!v) return; if (!carTypeOptions.includes(v)) { const next = [...carTypeOptions, v]; setCarTypeOptions(next); saveOptions('carTypes', next) }; setCarTypes(prev => prev.includes(v) ? prev : [...prev, v]); setNewCarTypeInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {carTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {carTypes.map(ct => (
                        <span key={ct} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                          {ct}<button type="button" onClick={() => setCarTypes(carTypes.filter(t => t !== ct))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>}
            </div>

            {/* Sideways Product Organization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <button type="button" onClick={() => setSidewaysOrgCollapsed(!sidewaysOrgCollapsed)} className="w-full flex items-center justify-between mb-4 text-left group">
                <h3 className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Sideways Product Organization</h3>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysOrgCollapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {!sidewaysOrgCollapsed && (
                <div className="space-y-4">
                  {/* Sideways Cars Brand Page */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Sideways Cars Brand Page</label>
                    <div className="relative">
                      <button type="button" onClick={() => setSidewaysBrandDropdownOpen(!sidewaysBrandDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                        <span className={sidewaysBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                          {sidewaysBrands.length === 0 ? 'No brand assigned' : sidewaysBrands.length === 1 ? sidewaysBrands[0] : `${sidewaysBrands.length} brands selected`}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {sidewaysBrandDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {sidewaysBrandOptions.map(b => (
                            <div key={b} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                              <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={sidewaysBrands.includes(b)} onChange={e => setSidewaysBrands(e.target.checked ? [...sidewaysBrands, b] : sidewaysBrands.filter(x => x !== b))} className="rounded" />
                                <span className="text-sm">{b}</span>
                              </label>
                              <button type="button" onClick={() => { const next = sidewaysBrandOptions.filter(x => x !== b); setSidewaysBrandOptions(next); setSidewaysBrands(prev => prev.filter(x => x !== b)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                            <input type="text" value={newSidewaysBrandInput} onChange={e => setNewSidewaysBrandInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSidewaysBrandInput.trim()) { e.preventDefault(); const v = newSidewaysBrandInput.trim(); setSidewaysBrandOptions(prev => [...prev, v]); setSidewaysBrands(prev => [...prev, v]); setNewSidewaysBrandInput('') }}} placeholder="Add brand..." className="flex-1 text-sm border border-gray-300 rounded px-2 py-1" />
                            <button type="button" onClick={() => { const v = newSidewaysBrandInput.trim(); if (!v) return; setSidewaysBrandOptions(prev => [...prev, v]); setSidewaysBrands(prev => [...prev, v]); setNewSidewaysBrandInput('') }} className="text-xs px-2 py-1 bg-gray-900 text-white rounded">+Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {sidewaysBrands.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sidewaysBrands.map(b => <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{b}<button type="button" onClick={() => setSidewaysBrands(sidewaysBrands.filter(x => x !== b))}>×</button></span>)}
                      </div>
                    )}
                  </div>
                  {/* Sideways Parts Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Sideways Parts Filter</label>
                    <div className="relative">
                      <button type="button" onClick={() => setSidewaysPartDropdownOpen(!sidewaysPartDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                        <span className={sidewaysParts.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                          {sidewaysParts.length === 0 ? 'Select part...' : sidewaysParts.length === 1 ? sidewaysParts[0] : `${sidewaysParts.length} selected`}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysPartDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {sidewaysPartDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {(sidewaysPartOptions || []).map(p => (
                            <div key={p} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                              <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={sidewaysParts.includes(p)} onChange={e => setSelectedSidewaysParts(e.target.checked ? [...sidewaysParts, p] : sidewaysParts.filter(x => x !== p))} className="rounded" />
                                <span className="text-sm">{p}</span>
                              </label>
                              <button type="button" onClick={() => { const next = sidewaysPartOptions.filter(x => x !== p); setSidewaysPartOptions(next); saveOptions('sidewaysParts', next); setSelectedSidewaysParts(prev => prev.filter(x => x !== p)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                            <input type="text" value={newSidewaysPartInput} onChange={e => setNewSidewaysPartInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSidewaysPartInput.trim()) { e.preventDefault(); const v = newSidewaysPartInput.trim(); if (!sidewaysPartOptions.includes(v)) { const next = [...sidewaysPartOptions, v]; setSidewaysPartOptions(next); saveOptions('sidewaysParts', next) }; setSelectedSidewaysParts(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysPartInput('') } }} placeholder="+ Add part..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                            <button type="button" onClick={() => { const v = newSidewaysPartInput.trim(); if (!v) return; if (!sidewaysPartOptions.includes(v)) { const next = [...sidewaysPartOptions, v]; setSidewaysPartOptions(next); saveOptions('sidewaysParts', next) }; setSelectedSidewaysParts(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysPartInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">+Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Sideways Race Class Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Sideways Race Class Filter</label>
                    <div className="relative">
                      <button type="button" onClick={() => setSidewaysCarClassDropdownOpen(!sidewaysCarClassDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                        <span className={selectedSidewaysCarClasses.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                          {selectedSidewaysCarClasses.length === 0 ? 'Select class...' : selectedSidewaysCarClasses.length === 1 ? selectedSidewaysCarClasses[0] : `${selectedSidewaysCarClasses.length} selected`}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysCarClassDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {sidewaysCarClassDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {carClassOptions.map(cls => (
                            <div key={cls} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                              <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={selectedSidewaysCarClasses.includes(cls)} onChange={e => setSelectedSidewaysCarClasses(e.target.checked ? [...selectedSidewaysCarClasses, cls] : selectedSidewaysCarClasses.filter(c => c !== cls))} className="rounded" />
                                <span className="text-sm">{cls}</span>
                              </label>
                              <button type="button" onClick={() => { const next = carClassOptions.filter(x => x !== cls); setCarClassOptions(next); saveOptions('carClasses', next); setSelectedSidewaysCarClasses(prev => prev.filter(c => c !== cls)); setSelectedCarClasses(prev => prev.filter(c => c !== cls)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                            <input type="text" value={newSidewaysCarClassInput} onChange={e => setNewSidewaysCarClassInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSidewaysCarClassInput.trim()) { e.preventDefault(); const v = newSidewaysCarClassInput.trim(); if (!carClassOptions.includes(v)) { const next = [...carClassOptions, v]; setCarClassOptions(next); saveOptions('carClasses', next) }; setSelectedSidewaysCarClasses(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysCarClassInput('') } }} placeholder="+ Add class..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                            <button type="button" onClick={() => { const v = newSidewaysCarClassInput.trim(); if (!v) return; if (!carClassOptions.includes(v)) { const next = [...carClassOptions, v]; setCarClassOptions(next); saveOptions('carClasses', next) }; setSelectedSidewaysCarClasses(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysCarClassInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">+Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedSidewaysCarClasses.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedSidewaysCarClasses.map(c => <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{c}<button type="button" onClick={() => setSelectedSidewaysCarClasses(selectedSidewaysCarClasses.filter(x => x !== c))}>×</button></span>)}
                      </div>
                    )}
                  </div>
                  {/* Sideways Car Type */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Sideways Car Type</label>
                    <div className="relative">
                      <button type="button" onClick={() => setSidewaysCarTypeDropdownOpen(!sidewaysCarTypeDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                        <span className={sidewaysCarTypes.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                          {sidewaysCarTypes.length === 0 ? '— None —' : sidewaysCarTypes.length === 1 ? sidewaysCarTypes[0] : `${sidewaysCarTypes.length} selected`}
                        </span>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysCarTypeDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {sidewaysCarTypeDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                          {carTypeOptions.map(ct => (
                            <div key={ct} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                              <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={sidewaysCarTypes.includes(ct)} onChange={e => setSidewaysCarTypes(e.target.checked ? [...sidewaysCarTypes, ct] : sidewaysCarTypes.filter(x => x !== ct))} className="rounded" />
                                <span className="text-sm">{ct}</span>
                              </label>
                              <button type="button" onClick={() => { const next = carTypeOptions.filter(x => x !== ct); setCarTypeOptions(next); saveOptions('carTypes', next); setSidewaysCarTypes(prev => prev.filter(t => t !== ct)); setCarTypes(prev => prev.filter(t => t !== ct)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          ))}
                          <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                            <input type="text" value={newSidewaysCarTypeInput} onChange={e => setNewSidewaysCarTypeInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSidewaysCarTypeInput.trim()) { e.preventDefault(); const v = newSidewaysCarTypeInput.trim(); if (!carTypeOptions.includes(v)) { const next = [...carTypeOptions, v]; setCarTypeOptions(next); saveOptions('carTypes', next) }; setSidewaysCarTypes(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysCarTypeInput('') } }} placeholder="+ Add car type..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                            <button type="button" onClick={() => { const v = newSidewaysCarTypeInput.trim(); if (!v) return; if (!carTypeOptions.includes(v)) { const next = [...carTypeOptions, v]; setCarTypeOptions(next); saveOptions('carTypes', next) }; setSidewaysCarTypes(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysCarTypeInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">+Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {sidewaysCarTypes.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {sidewaysCarTypes.map(ct => <span key={ct} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">{ct}<button type="button" onClick={() => setSidewaysCarTypes(sidewaysCarTypes.filter(x => x !== ct))}>×</button></span>)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Brand Org Cards */}
            {customOrgCards.map((card) => {
              const cardData = customOrgData[card.id] || { brands: [], carClasses: [], parts: [], carTypes: [] }
              const cardBrandOptions = customOrgBrands[card.id] || []
              const collapsed = customOrgCollapsed[card.id] ?? false
              const openDropdown = customOrgDropdowns[card.id] ?? null
              const getInput = (field: string) => customOrgNewInput[`${card.id}_${field}`] || ''
              const setInput = (field: string, val: string) => setCustomOrgNewInput(prev => ({ ...prev, [`${card.id}_${field}`]: val }))
              const updateCardField = (field: 'brands' | 'carClasses' | 'parts' | 'carTypes', val: string[]) => {
                setCustomOrgData(prev => ({ ...prev, [card.id]: { ...cardData, [field]: val } }))
              }
              const saveCardOptions = async (key: string, value: any) => {
                try { await fetch('/api/admin/product-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) }) } catch {}
              }
              return (
                <div key={card.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="w-full flex items-center gap-2 mb-4">
                    <button type="button" onClick={() => setCustomOrgCollapsed(prev => ({ ...prev, [card.id]: !collapsed }))} className="flex-1 flex items-center justify-between text-left group">
                      <h3 className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{card.name} Product Organization</h3>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <button type="button" onClick={async () => {
                      const nextCards = customOrgCards.filter(c => c.id !== card.id)
                      const nextBrands = { ...customOrgBrands }
                      delete nextBrands[card.id]
                      setCustomOrgCards(nextCards)
                      setCustomOrgBrands(nextBrands)
                      setCustomOrgData(prev => { const n = { ...prev }; delete n[card.id]; return n })
                      await fetch('/api/admin/product-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customOrgCards: nextCards, customOrgBrands: nextBrands }) })
                    }} className="p-1 text-gray-300 hover:text-red-500 flex-shrink-0" title="Delete this card">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  {!collapsed && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">{card.name} Cars Brand Page</label>
                        <div className="relative">
                          <button type="button" onClick={() => setCustomOrgDropdowns(prev => ({ ...prev, [card.id]: openDropdown === 'brands' ? null : 'brands' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between bg-white">
                            <span className={cardData.brands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>{cardData.brands.length === 0 ? 'No brand assigned' : cardData.brands.length === 1 ? cardData.brands[0] : `${cardData.brands.length} selected`}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'brands' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {openDropdown === 'brands' && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                              {cardBrandOptions.map(b => (
                                <div key={b} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                                  <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={cardData.brands.includes(b)} onChange={e => updateCardField('brands', e.target.checked ? [...cardData.brands, b] : cardData.brands.filter(x => x !== b))} className="rounded" />
                                    <span className="text-sm">{b}</span>
                                  </label>
                                  <button type="button" onClick={() => {
                                    const next = cardBrandOptions.filter(x => x !== b)
                                    setCustomOrgBrands(prev => ({ ...prev, [card.id]: next }))
                                    saveCardOptions('customOrgBrands', { ...customOrgBrands, [card.id]: next })
                                    updateCardField('brands', cardData.brands.filter(x => x !== b))
                                  }} className="p-0.5 text-gray-300 hover:text-red-500"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                              ))}
                              <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                                <input type="text" value={getInput('brands')} onChange={e => setInput('brands', e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && getInput('brands').trim()) { e.preventDefault(); const v = getInput('brands').trim(); const next = [...cardBrandOptions, v]; setCustomOrgBrands(prev => ({ ...prev, [card.id]: next })); saveCardOptions('customOrgBrands', { ...customOrgBrands, [card.id]: next }); updateCardField('brands', [...cardData.brands, v]); setInput('brands', '') }}} placeholder="Add brand..." className="flex-1 text-sm border border-gray-300 rounded px-2 py-1" />
                                <button type="button" onClick={() => { const v = getInput('brands').trim(); if (!v) return; const next = [...cardBrandOptions, v]; setCustomOrgBrands(prev => ({ ...prev, [card.id]: next })); saveCardOptions('customOrgBrands', { ...customOrgBrands, [card.id]: next }); updateCardField('brands', [...cardData.brands, v]); setInput('brands', '') }} className="text-xs px-2 py-1 bg-gray-900 text-white rounded">+Add</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {cardData.brands.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{cardData.brands.map(b => <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{b}<button type="button" onClick={() => updateCardField('brands', cardData.brands.filter(x => x !== b))}>×</button></span>)}</div>}
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">{card.name} Race Class Filter</label>
                        <div className="relative">
                          <button type="button" onClick={() => setCustomOrgDropdowns(prev => ({ ...prev, [card.id]: openDropdown === 'carClasses' ? null : 'carClasses' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between bg-white">
                            <span className={cardData.carClasses.length === 0 ? 'text-gray-400' : 'text-gray-900'}>{cardData.carClasses.length === 0 ? 'Select class...' : cardData.carClasses.length === 1 ? cardData.carClasses[0] : `${cardData.carClasses.length} selected`}</span>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'carClasses' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                          {openDropdown === 'carClasses' && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                              {carClassOptions.map(cls => (
                                <div key={cls} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                                  <label className="flex-1 flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={cardData.carClasses.includes(cls)} onChange={e => updateCardField('carClasses', e.target.checked ? [...cardData.carClasses, cls] : cardData.carClasses.filter(c => c !== cls))} className="rounded" />
                                    <span className="text-sm">{cls}</span>
                                  </label>
                                  <button type="button" onClick={() => { const next = carClassOptions.filter(x => x !== cls); setCarClassOptions(next); saveOptions('carClasses', next); updateCardField('carClasses', cardData.carClasses.filter(c => c !== cls)); setSelectedCarClasses(prev => prev.filter(c => c !== cls)); setSelectedSidewaysCarClasses(prev => prev.filter(c => c !== cls)) }} className="p-0.5 text-gray-300 hover:text-red-500">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                  </button>
                                </div>
                              ))}
                              <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                                <input type="text" value={getInput('carClasses')} onChange={e => setInput('carClasses', e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && getInput('carClasses').trim()) { e.preventDefault(); const v = getInput('carClasses').trim(); if (!carClassOptions.includes(v)) { const next = [...carClassOptions, v]; setCarClassOptions(next); saveOptions('carClasses', next) }; updateCardField('carClasses', cardData.carClasses.includes(v) ? cardData.carClasses : [...cardData.carClasses, v]); setInput('carClasses', '') } }} placeholder="+ Add class..." className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900" />
                                <button type="button" onClick={() => { const v = getInput('carClasses').trim(); if (!v) return; if (!carClassOptions.includes(v)) { const next = [...carClassOptions, v]; setCarClassOptions(next); saveOptions('carClasses', next) }; updateCardField('carClasses', cardData.carClasses.includes(v) ? cardData.carClasses : [...cardData.carClasses, v]); setInput('carClasses', '') }} className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-700">+Add</button>
                              </div>
                            </div>
                          )}
                        </div>
                        {cardData.carClasses.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{cardData.carClasses.map(c => <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{c}<button type="button" onClick={() => updateCardField('carClasses', cardData.carClasses.filter(x => x !== c))}>×</button></span>)}</div>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Add New Brand Org Card */}
            <div className="bg-white rounded-lg shadow-sm border border-dashed border-gray-300 p-4">
              {!showNewOrgInput ? (
                <button type="button" onClick={() => setShowNewOrgInput(true)} className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors py-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Add Brand Organization
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input autoFocus type="text" value={newOrgName} onChange={e => setNewOrgName(e.target.value)} onKeyDown={async e => {
                    if (e.key === 'Enter' && newOrgName.trim()) {
                      e.preventDefault()
                      const id = `org_${Date.now()}`; const next = [...customOrgCards, { id, name: newOrgName.trim() }]; setCustomOrgCards(next)
                      await fetch('/api/admin/product-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customOrgCards: next }) })
                      setNewOrgName(''); setShowNewOrgInput(false)
                    }
                    if (e.key === 'Escape') { setShowNewOrgInput(false); setNewOrgName('') }
                  }} placeholder="Brand name (e.g. NSR, Pioneer)..." className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  <button type="button" onClick={async () => {
                    if (!newOrgName.trim()) { setShowNewOrgInput(false); return }
                    const id = `org_${Date.now()}`; const next = [...customOrgCards, { id, name: newOrgName.trim() }]; setCustomOrgCards(next)
                    await fetch('/api/admin/product-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customOrgCards: next }) })
                    setNewOrgName(''); setShowNewOrgInput(false)
                  }} className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                  <button type="button" onClick={() => { setShowNewOrgInput(false); setNewOrgName('') }} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                </div>
              )}
            </div>

            {/* Sage Accounts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Sage Accounts</h3>
              <p className="text-xs text-gray-400 mb-4">For Sage accounting &amp; CSV imports/exports</p>
              <div className="space-y-4">

                {/* Category (Brand) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category (Brand)</label>
                  <div className="relative" ref={categoryBrandRef}>
                    <button type="button" onClick={() => setCategoryBrandDropdownOpen(!categoryBrandDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={categoryBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {categoryBrands.length === 0 ? 'Select brand...' : categoryBrands.length === 1 ? categoryBrands[0] : `${categoryBrands.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${categoryBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {categoryBrandDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={categoryBrands.length === 0} onChange={() => setCategoryBrands([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {brands.map(b => (
                          <div key={b} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={categoryBrands.includes(b)} onChange={e => setCategoryBrands(e.target.checked ? [...categoryBrands, b] : categoryBrands.filter(c => c !== b))} className="rounded" />
                              <span className="text-sm text-gray-900">{b}</span>
                            </label>
                            <button type="button" onClick={() => { const next = brands.filter(x => x !== b); setBrands(next); saveOptions('brands', next); setCategoryBrands(prev => prev.filter(c => c !== b)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newCategoryBrandInput} onChange={e => setNewCategoryBrandInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCategoryBrandInput.trim()) { e.preventDefault(); const v = newCategoryBrandInput.trim(); if (!brands.includes(v)) { const next = [...brands, v]; setBrands(next); saveOptions('brands', next) }; setCategoryBrands(prev => prev.includes(v) ? prev : [...prev, v]); setNewCategoryBrandInput('') } }} placeholder="+ Add brand..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newCategoryBrandInput.trim(); if (!v) return; if (!brands.includes(v)) { const next = [...brands, v]; setBrands(next); saveOptions('brands', next) }; setCategoryBrands(prev => prev.includes(v) ? prev : [...prev, v]); setNewCategoryBrandInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {categoryBrands.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {categoryBrands.map(cb => (
                        <span key={cb} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                          {cb}<button type="button" onClick={() => setCategoryBrands(categoryBrands.filter(c => c !== cb))} className="hover:text-blue-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item Categories (Unit) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Categories (Unit)</label>
                  <div className="relative" ref={itemCategoryRef}>
                    <button type="button" onClick={() => setItemCategoryDropdownOpen(!itemCategoryDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={itemCategories.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {itemCategories.length === 0 ? 'Select category...' : itemCategories.length === 1 ? itemCategories[0] : `${itemCategories.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${itemCategoryDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {itemCategoryDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={itemCategories.length === 0} onChange={() => setItemCategories([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {productTypes.map((pt) => (
                          <div key={pt} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={itemCategories.includes(pt)} onChange={(e) => setItemCategories(e.target.checked ? [...itemCategories, pt] : itemCategories.filter(c => c !== pt))} className="rounded" />
                              <span className="text-sm text-gray-900">{pt}</span>
                            </label>
                            <button type="button" onClick={() => { const next = productTypes.filter(t => t !== pt); setProductTypes(next); saveOptions('categories', next); setItemCategories(prev => prev.filter(c => c !== pt)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newProductType} onChange={(e) => setNewProductType(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newProductType.trim()) { e.preventDefault(); const val = newProductType.trim(); const next = productTypes.includes(val) ? productTypes : [...productTypes, val]; setProductTypes(next); saveOptions('categories', next); if (!itemCategories.includes(val)) setItemCategories(prev => [...prev, val]); setNewProductType('') } }} placeholder="+ Add category..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const val = newProductType.trim(); if (!val) return; const next = productTypes.includes(val) ? productTypes : [...productTypes, val]; setProductTypes(next); saveOptions('categories', next); if (!itemCategories.includes(val)) setItemCategories(prev => [...prev, val]); setNewProductType('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {itemCategories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {itemCategories.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                          {cat}<button type="button" onClick={() => setItemCategories(itemCategories.filter(c => c !== cat))} className="hover:text-blue-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sales Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sales Account</label>
                  <p className="text-xs text-gray-400 mb-2">For Sage accounting &amp; CSV imports/exports</p>
                  <div className="relative" ref={salesAccountRef}>
                    <button type="button" onClick={() => setSalesAccountDropdownOpen(!salesAccountDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={salesAccount.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {salesAccount.length === 0 ? 'Select account...' : salesAccount.length === 1 ? salesAccount[0] : `${salesAccount.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${salesAccountDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {salesAccountDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={salesAccount.length === 0} onChange={() => setSalesAccount([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {salesAccountOptions.map(opt => (
                          <div key={opt} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={salesAccount.includes(opt)} onChange={e => setSalesAccount(e.target.checked ? [...salesAccount, opt] : salesAccount.filter(a => a !== opt))} className="rounded" />
                              <span className="text-sm text-gray-900">{opt}</span>
                            </label>
                            <button type="button" onClick={() => { const next = salesAccountOptions.filter(o => o !== opt); setSalesAccountOptions(next); saveOptions('salesAccounts', next); setSalesAccount(prev => prev.filter(a => a !== opt)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newSalesAccountInput} onChange={e => setNewSalesAccountInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSalesAccountInput.trim()) { e.preventDefault(); const v = newSalesAccountInput.trim(); if (!salesAccountOptions.includes(v)) { const next = [...salesAccountOptions, v]; setSalesAccountOptions(next); saveOptions('salesAccounts', next) }; setSalesAccount(prev => prev.includes(v) ? prev : [...prev, v]); setNewSalesAccountInput('') } }} placeholder="+ Add account..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newSalesAccountInput.trim(); if (!v) return; if (!salesAccountOptions.includes(v)) { const next = [...salesAccountOptions, v]; setSalesAccountOptions(next); saveOptions('salesAccounts', next) }; setSalesAccount(prev => prev.includes(v) ? prev : [...prev, v]); setNewSalesAccountInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {salesAccount.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {salesAccount.map(a => (
                        <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                          {a}<button type="button" onClick={() => setSalesAccount(salesAccount.filter(x => x !== a))} className="hover:text-green-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* Purchase Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Account</label>
                  <p className="text-xs text-gray-400 mb-2">For Sage accounting &amp; CSV imports/exports</p>
                  <div className="relative" ref={purchaseAccountRef}>
                    <button type="button" onClick={() => setPurchaseAccountDropdownOpen(!purchaseAccountDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={purchaseAccount.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {purchaseAccount.length === 0 ? 'Select account...' : purchaseAccount.length === 1 ? purchaseAccount[0] : `${purchaseAccount.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${purchaseAccountDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {purchaseAccountDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={purchaseAccount.length === 0} onChange={() => setPurchaseAccount([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {purchaseAccountOptions.map(opt => (
                          <div key={opt} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={purchaseAccount.includes(opt)} onChange={e => setPurchaseAccount(e.target.checked ? [...purchaseAccount, opt] : purchaseAccount.filter(a => a !== opt))} className="rounded" />
                              <span className="text-sm text-gray-900">{opt}</span>
                            </label>
                            <button type="button" onClick={() => { const next = purchaseAccountOptions.filter(o => o !== opt); setPurchaseAccountOptions(next); saveOptions('purchaseAccounts', next); setPurchaseAccount(prev => prev.filter(a => a !== opt)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newPurchaseAccountInput} onChange={e => setNewPurchaseAccountInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newPurchaseAccountInput.trim()) { e.preventDefault(); const v = newPurchaseAccountInput.trim(); if (!purchaseAccountOptions.includes(v)) { const next = [...purchaseAccountOptions, v]; setPurchaseAccountOptions(next); saveOptions('purchaseAccounts', next) }; setPurchaseAccount(prev => prev.includes(v) ? prev : [...prev, v]); setNewPurchaseAccountInput('') } }} placeholder="+ Add account..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newPurchaseAccountInput.trim(); if (!v) return; if (!purchaseAccountOptions.includes(v)) { const next = [...purchaseAccountOptions, v]; setPurchaseAccountOptions(next); saveOptions('purchaseAccounts', next) }; setPurchaseAccount(prev => prev.includes(v) ? prev : [...prev, v]); setNewPurchaseAccountInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {purchaseAccount.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {purchaseAccount.map(a => (
                        <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-semibold">
                          {a}<button type="button" onClick={() => setPurchaseAccount(purchaseAccount.filter(x => x !== a))} className="hover:text-purple-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEO Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">SEO Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Product title'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {seoTitle.length}/70 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Description
                  </label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder={description ? description.slice(0, 160) : 'Brief product description for search engines'}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {seoDescription.length}/160 characters
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta Keywords
                  </label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="slot car, 1/32, racing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Separate with commas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Brand Modal */}
      {showAddBrand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Brand</h3>
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="Enter brand name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddBrand(false)
                  setNewBrand('')
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBrand}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Add Brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Scale Modal */}
      {showAddScale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Scale</h3>
            <input
              type="text"
              value={newScale}
              onChange={(e) => setNewScale(e.target.value)}
              placeholder="Enter scale (e.g., 1/43)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddScale()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddScale(false)
                  setNewScale('')
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddScale}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Add Scale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddProductType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
            <input
              type="text"
              value={newProductType}
              onChange={(e) => setNewProductType(e.target.value)}
              placeholder="Enter product type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddProductType()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddProductType(false)
                  setNewProductType('')
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProductType}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
