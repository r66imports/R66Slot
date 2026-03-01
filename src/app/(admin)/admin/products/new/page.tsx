'use client'

import { useState, useEffect } from 'react'
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
  const [carType, setCarType] = useState('')
  const [partType, setPartType] = useState('')
  const [scale, setScale] = useState('')
  const [supplier, setSupplier] = useState('')
  const [collections, setCollections] = useState<string[]>([])
  const [tags, setTags] = useState('')
  const [carClass, setCarClass] = useState('')
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
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')

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

  // Lists for custom options
  const [brands, setBrands] = useState(['NSR', 'Revo', 'Pioneer', 'Sideways'])
  const [suppliers, setSuppliers] = useState(['NSR'])
  const [scales, setScales] = useState(['1/32', '1/24'])
  const [productTypes, setProductTypes] = useState(['Slot Cars', 'Parts'])
  const [partTypes, setPartTypes] = useState([
    'Guides', 'Braid', 'Lead Wire', 'Magnets', 'Weights', 'Screws',
    'Suspension Parts', 'Tires', 'Wheels', 'Wheels with Tires',
    'Wheel Inserts', 'Inline Gears', 'Sidewinder Gears',
    'Anglewinder Gears', 'Motors'
  ])

  // Modal states
  const [showAddBrand, setShowAddBrand] = useState(false)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showAddScale, setShowAddScale] = useState(false)
  const [showAddProductType, setShowAddProductType] = useState(false)
  const [showAddPartType, setShowAddPartType] = useState(false)

  // New item inputs
  const [newBrand, setNewBrand] = useState('')
  const [newSupplier, setNewSupplier] = useState('')
  const [newScale, setNewScale] = useState('')
  const [newProductType, setNewProductType] = useState('')
  const [newPartType, setNewPartType] = useState('')

  // Add new item functions
  const handleAddBrand = () => {
    if (newBrand.trim() && !brands.includes(newBrand.trim())) {
      setBrands([...brands, newBrand.trim()])
      setBrand(newBrand.trim())
      setNewBrand('')
      setShowAddBrand(false)
    }
  }

  const handleAddSupplier = () => {
    if (newSupplier.trim() && !suppliers.includes(newSupplier.trim())) {
      setSuppliers([...suppliers, newSupplier.trim()])
      setSupplier(newSupplier.trim())
      setNewSupplier('')
      setShowAddSupplier(false)
    }
  }

  const handleAddScale = () => {
    if (newScale.trim() && !scales.includes(newScale.trim())) {
      setScales([...scales, newScale.trim()])
      setScale(newScale.trim())
      setNewScale('')
      setShowAddScale(false)
    }
  }

  const handleAddProductType = () => {
    if (newProductType.trim() && !productTypes.includes(newProductType.trim())) {
      setProductTypes([...productTypes, newProductType.trim()])
      setProductType(newProductType.trim().toLowerCase().replace(/ /g, '-'))
      setNewProductType('')
      setShowAddProductType(false)
    }
  }

  const handleAddPartType = () => {
    if (newPartType.trim() && !partTypes.includes(newPartType.trim())) {
      setPartTypes([...partTypes, newPartType.trim()])
      setPartType(newPartType.trim())
      setNewPartType('')
      setShowAddPartType(false)
    }
  }

  const [saveError, setSaveError] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)

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
        brand,
        productType,
        carType,
        partType,
        scale,
        supplier,
        collections: [...collections, ...selectedCategories.filter(c => !collections.includes(c))],
        categories: selectedCategories,
        carClass,
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
    // Format the product details for WhatsApp
    let message = `*New Product Order*\n\n`
    message += `*Product:* ${title || 'Not specified'}\n`
    message += `*Price:* R${price || '0.00'}\n`
    if (compareAtPrice) message += `*Compare at:* R${compareAtPrice}\n`
    if (brand) message += `*Brand:* ${brand}\n`
    if (productType) message += `*Type:* ${productType}\n`
    if (partType) message += `*Part Type:* ${partType}\n`
    if (scale) message += `*Scale:* ${scale}\n`
    if (supplier) message += `*Supplier:* ${supplier}\n`
    if (sku) message += `*SKU:* ${sku}\n`
    if (quantity) message += `*Quantity:* ${quantity}\n`
    if (description) message += `\n*Description:*\n${description}\n`

    // WhatsApp number
    const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_DEFAULT_NUMBER || '27615898921'

    // Send via WhatsApp Web (opens in same window/tab to send directly)
    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`

    // Open WhatsApp in a new window
    window.open(whatsappUrl, '_blank')
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
              <h3 className="text-sm font-medium text-gray-700 mb-4">Media</h3>
              {mediaFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="relative group">
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
              <h3 className="text-sm font-medium text-gray-700 mb-4">Product Organization</h3>
              <div className="space-y-4">
                {/* Unit (Brand) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit (Brand)
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select brand...</option>
                    {brands.map((b) => (
                      <option key={b} value={b.toLowerCase()}>{b}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddBrand(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Brand
                  </button>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select type...</option>
                    {productTypes.map((pt) => (
                      <option key={pt} value={pt.toLowerCase().replace(/ /g, '-')}>{pt}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddProductType(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Category
                  </button>
                </div>

                {/* Car Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Car Type
                  </label>
                  <select
                    value={carType}
                    onChange={(e) => setCarType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select car type...</option>
                    <option value="livery">Livery</option>
                    <option value="white-kit">White Kit</option>
                    <option value="white-body-kit">White Body Kit</option>
                    <option value="white-body">White Body</option>
                  </select>
                </div>

                {/* Racing Class */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class
                  </label>
                  <select
                    value={carClass}
                    onChange={(e) => setCarClass(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select class...</option>
                    <option value="GT">GT</option>
                    <option value="GT 1">GT 1</option>
                    <option value="GT 2">GT 2</option>
                    <option value="GT 3">GT 3</option>
                    <option value="Group 2">Group 2</option>
                    <option value="Group 5">Group 5</option>
                    <option value="GT/IUMSA">GT/IUMSA</option>
                  </select>
                </div>

                {/* Car Brands (multi-select checkbox dropdown) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Car Brand</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setCarBrandDropdownOpen(!carBrandDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white"
                    >
                      <span className={carBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {carBrands.length === 0 ? 'No brand assigned' : carBrands.length === 1 ? carBrands[0] : `${carBrands.length} brands selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${carBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {carBrandDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={carBrands.length === 0} onChange={() => setCarBrands([])} className="rounded" />
                          <span className="text-sm text-gray-500 italic">No brand assigned</span>
                        </label>
                        {['Ford Escort MK I', 'Ford Escort MK II', 'BMW M3 E30', 'Porsche 911', 'Ferrari 308', 'Lancia Delta', 'Audi Quattro'].map((cb) => (
                          <label key={cb} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={carBrands.includes(cb)} onChange={(e) => setCarBrands(e.target.checked ? [...carBrands, cb] : carBrands.filter(b => b !== cb))} className="rounded" />
                            <span className="text-sm text-gray-900">{cb}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {carBrands.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {carBrands.map(cb => (
                        <span key={cb} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          {cb}
                          <button type="button" onClick={() => setCarBrands(carBrands.filter(b => b !== cb))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

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

                {/* Categories — multi-select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories <span className="text-xs text-gray-400">(select multiple)</span>
                  </label>
                  <div className="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto space-y-1">
                    {categories.length === 0 ? (
                      <p className="text-xs text-gray-400 px-2 py-1">Loading categories...</p>
                    ) : (
                      categories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat.slug)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories(prev => [...prev, cat.slug])
                              } else {
                                setSelectedCategories(prev => prev.filter(s => s !== cat.slug))
                              }
                            }}
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
                    <a href="/admin/catalogue/categories" target="_blank" className="text-xs text-blue-600 hover:text-blue-800">
                      Manage Categories →
                    </a>
                  </div>
                </div>

                {/* Part Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Part Type
                  </label>
                  <select
                    value={partType}
                    onChange={(e) => setPartType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select part type...</option>
                    {partTypes.map((pt) => (
                      <option key={pt} value={pt.toLowerCase().replace(/ /g, '-')}>{pt}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddPartType(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Part Type
                  </button>
                </div>

                {/* Scale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scale
                  </label>
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
                  <button
                    type="button"
                    onClick={() => setShowAddScale(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Scale
                  </button>
                </div>

                {/* Supplier (formerly Vendor) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier
                  </label>
                  <select
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s} value={s.toLowerCase()}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplier(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Supplier
                  </button>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assign to Page
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPageDropdownOpen(!pageDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <span className={pageIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {pageIds.length === 0
                          ? 'No page assigned'
                          : pageIds.length === 1
                            ? (availablePages.find(p => p.id === pageIds[0])?.title || pageIds[0])
                            : `${pageIds.length} pages selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${pageDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {pageDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input
                            type="checkbox"
                            checked={pageIds.length === 0}
                            onChange={() => setPageIds([])}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-500 italic">No page assigned</span>
                        </label>
                        {availablePages.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={pageIds.includes(p.id)}
                              onChange={(e) => setPageIds(e.target.checked ? [...pageIds, p.id] : pageIds.filter(id => id !== p.id))}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-900">{p.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {pageIds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                      {pageIds.map(pid => (
                        <a key={pid} href={`/admin/pages/editor/${pid}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                          {availablePages.find(p => p.id === pid)?.title || pid} →
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">
                      Select pages where this product will appear
                    </p>
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

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Supplier</h3>
            <input
              type="text"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              placeholder="Enter supplier name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddSupplier()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddSupplier(false)
                  setNewSupplier('')
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Add Supplier
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

      {/* Add Part Type Modal */}
      {showAddPartType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Part Type</h3>
            <input
              type="text"
              value={newPartType}
              onChange={(e) => setNewPartType(e.target.value)}
              placeholder="Enter part type"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent mb-4"
              onKeyDown={(e) => e.key === 'Enter' && handleAddPartType()}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddPartType(false)
                  setNewPartType('')
                }}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPartType}
                className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                Add Part Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
