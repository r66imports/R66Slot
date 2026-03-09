'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MediaLibraryPicker } from '@/components/page-editor/media-library-picker'

const BASE_CAR_BRANDS = ['Datsun 510', 'Ford Escort MK I', 'Ford Escort MK II', 'BMW M3 E30', 'Porsche 911', 'Ferrari 308', 'Lancia Delta', 'Audi Quattro']

interface Product {
  id: string
  title: string
  description: string
  price: number
  compareAtPrice: number | null
  costPerItem: number | null
  sku: string
  barcode: string
  brand: string
  productType: string
  carType: string
  partType: string
  scale: string
  supplier: string
  collections: string[]
  tags: string[]
  quantity: number
  trackQuantity: boolean
  weight: number | null
  weightUnit: string
  boxSize: string
  dimensions: {
    length: number | null
    width: number | null
    height: number | null
  }
  eta: string
  status: 'draft' | 'active'
  imageUrl: string
  images: string[]
  pageId: string
  seo: {
    metaTitle: string
    metaDescription: string
    metaKeywords: string
  }
  createdAt: string
  updatedAt: string
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState<Product | null>(null)
  const [saveError, setSaveError] = useState('')
  const [uploadingImages, setUploadingImages] = useState(false)
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const draggedIdx = useRef<number | null>(null)

  // Editable fields
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
  const [carTypes, setCarTypes] = useState<string[]>([])
  const [partType, setPartType] = useState('')
  const [scale, setScale] = useState('')
  const [supplier, setSupplier] = useState('')
  const [collections, setCollections] = useState<string[]>([])
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState('draft')
  const [boxSize, setBoxSize] = useState('')
  const [dimLength, setDimLength] = useState('')
  const [dimWidth, setDimWidth] = useState('')
  const [dimHeight, setDimHeight] = useState('')
  const [mediaFiles, setMediaFiles] = useState<{ name: string; url: string; type: string }[]>([])
  const [eta, setEta] = useState('')
  const [pageIds, setPageIds] = useState<string[]>([])
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false)
  const [pageUrl, setPageUrl] = useState('')
  const [units, setUnits] = useState<string[]>([])
  const [newUnitInput, setNewUnitInput] = useState('')
  const [unitSaved, setUnitSaved] = useState(false)
  const [carBrands, setCarBrands] = useState<string[]>([])
  const [carBrandDropdownOpen, setCarBrandDropdownOpen] = useState(false)
  const [carBrandOptions, setCarBrandOptions] = useState<string[]>([...BASE_CAR_BRANDS])
  const [newCarBrandInput, setNewCarBrandInput] = useState('')
  const [sidewaysBrands, setSidewaysBrands] = useState<string[]>([])
  const [sidewaysBrandDropdownOpen, setSidewaysBrandDropdownOpen] = useState(false)
  const [sidewaysBrandOptions, setSidewaysBrandOptions] = useState<string[]>([...BASE_CAR_BRANDS])
  const [newSidewaysBrandInput, setNewSidewaysBrandInput] = useState('')
  // Sideways Parts Filter
  const DEFAULT_REVO_PARTS = ['Tyres', 'Wheels', 'Axle', 'Bearings', 'Gears', 'Pinions', 'Screws and Nuts', 'Motors', 'Guides', 'Body Plates & Chassis', 'White body parts set', 'Clear parts set', 'Lexan Cockpit Set']
  const [sidewaysPartOptions, setSidewaysPartOptions] = useState<string[]>(DEFAULT_REVO_PARTS)
  const [selectedSidewaysParts, setSelectedSidewaysParts] = useState<string[]>([])
  const [sidewaysPartDropdownOpen, setSidewaysPartDropdownOpen] = useState(false)
  const [newSidewaysPartInput, setNewSidewaysPartInput] = useState('')
  const [saveInPlaceSuccess, setSaveInPlaceSuccess] = useState(false)
  const [isPreOrder, setIsPreOrder] = useState(false)
  const [availablePages, setAvailablePages] = useState<{ id: string; title: string }[]>([])
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  // Revo Racing Class Filter
  const DEFAULT_CAR_CLASSES = ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA']
  const [carClassOptions, setCarClassOptions] = useState<string[]>(DEFAULT_CAR_CLASSES)
  const [selectedCarClasses, setSelectedCarClasses] = useState<string[]>([])
  const [carClassDropdownOpen, setCarClassDropdownOpen] = useState(false)
  const [newCarClassInput, setNewCarClassInput] = useState('')
  const [carClassPillsHidden, setCarClassPillsHidden] = useState(false)
  // Revo Parts Filter
  const [revoPartOptions, setRevoPartOptions] = useState<string[]>(DEFAULT_REVO_PARTS)
  const [selectedRevoParts, setSelectedRevoParts] = useState<string[]>([])
  const [revoPartDropdownOpen, setRevoPartDropdownOpen] = useState(false)
  const [newRevoPartInput, setNewRevoPartInput] = useState('')
  const [revoPartsPillsHidden, setRevoPartsPillsHidden] = useState(false)
  const [sidewaysPartsPillsHidden, setSidewaysPartsPillsHidden] = useState(false)

  // Lists for custom options (loaded from API)
  const [brands, setBrands] = useState(['NSR', 'Revo', 'Pioneer', 'Sideways'])
  const [scales, setScales] = useState(['1/32', '1/24'])
  const [productTypes, setProductTypes] = useState<string[]>([])
  const [carTypeOptions, setCarTypeOptions] = useState(['Livery', 'White Kit', 'White Body Kit', 'White Body'])

  const [categoryBrands, setCategoryBrands] = useState<string[]>([])
  const [itemCategories, setItemCategories] = useState<string[]>([])
  const [itemCategoryDropdownOpen, setItemCategoryDropdownOpen] = useState(false)

  // Sage Accounts
  const [salesAccount, setSalesAccount] = useState<string[]>([])
  const [purchaseAccount, setPurchaseAccount] = useState<string[]>([])
  const [salesAccountOptions, setSalesAccountOptions] = useState<string[]>([])
  const [purchaseAccountOptions, setPurchaseAccountOptions] = useState<string[]>([])
  const [salesAccountDropdownOpen, setSalesAccountDropdownOpen] = useState(false)
  const [purchaseAccountDropdownOpen, setPurchaseAccountDropdownOpen] = useState(false)
  const [newSalesAccountInput, setNewSalesAccountInput] = useState('')
  const [newPurchaseAccountInput, setNewPurchaseAccountInput] = useState('')

  // Dropdown open states for Product Organization
  const [brandDropdownOpen, setBrandDropdownOpen] = useState(false)
  const [carTypeDropdownOpen, setCarTypeDropdownOpen] = useState(false)
  const [scaleDropdownOpen, setScaleDropdownOpen] = useState(false)

  // Inline add inputs
  const [newBrandInput, setNewBrandInput] = useState('')
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const [newCarTypeInput, setNewCarTypeInput] = useState('')
  const [newScaleInput, setNewScaleInput] = useState('')

  // Autosave
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const isLoaded = useRef(false)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dropdown refs for click-outside
  const brandRef = useRef<HTMLDivElement>(null)

  const carTypeRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef<HTMLDivElement>(null)
  const carBrandRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const itemCategoryRef = useRef<HTMLDivElement>(null)
  const salesAccountRef = useRef<HTMLDivElement>(null)
  const purchaseAccountRef = useRef<HTMLDivElement>(null)
  const carClassRef = useRef<HTMLDivElement>(null)
  const revoPartRef = useRef<HTMLDivElement>(null)
  const sidewaysBrandRef = useRef<HTMLDivElement>(null)
  const sidewaysPartRef = useRef<HTMLDivElement>(null)

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

  // Load persistent dropdown options + pages
  useEffect(() => {
    fetch('/api/admin/product-options')
      .then(r => r.json())
      .then(opts => {
        if (opts.brands?.length) setBrands(opts.brands)
        if (opts.scales?.length) setScales(opts.scales)
        if (opts.categories?.length) setProductTypes(opts.categories)
        if (opts.carTypes?.length) setCarTypeOptions(opts.carTypes)
        if (opts.salesAccounts?.length) setSalesAccountOptions(opts.salesAccounts)
        if (opts.purchaseAccounts?.length) setPurchaseAccountOptions(opts.purchaseAccounts)
        if (opts.carClasses?.length) setCarClassOptions(opts.carClasses)
        if (opts.revoParts?.length) setRevoPartOptions(opts.revoParts)
        if (opts.sidewaysParts?.length) setSidewaysPartOptions(opts.sidewaysParts)
      })
      .catch(() => {})
    fetch('/api/admin/pages')
      .then(res => res.json())
      .then(pages => {
        if (Array.isArray(pages)) {
          setAvailablePages(pages.map((p: any) => ({ id: p.id, title: p.title })))
        }
      })
      .catch(() => {})
  }, [])

  // Load product data
  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        const products: Product[] = await res.json()
        const found = products.find((p) => p.id === id)
        if (found) {
          setProduct(found)
          setTitle(found.title || '')
          setDescription(found.description || '')
          setPrice(found.price?.toString() || '')
          setCompareAtPrice(found.compareAtPrice?.toString() || '')
          setCostPerItem(found.costPerItem?.toString() || '')
          setSku(found.sku || '')
          setBarcode(found.barcode || '')
          setTrackQuantity(found.trackQuantity ?? true)
          setQuantity(found.quantity?.toString() || '0')
          setWeight(found.weight?.toString() || '')
          setWeightUnit(found.weightUnit || 'kg')
          setBrand(found.brand || '')
          setProductType(found.productType || '')
          setCategoryBrands(Array.isArray((found as any).categoryBrands) ? (found as any).categoryBrands : [])
          setItemCategories(Array.isArray((found as any).itemCategories) ? (found as any).itemCategories : (found.productType ? [found.productType] : []))
          setCarType(found.carType || '')
          setCarTypes(Array.isArray((found as any).carTypes) ? (found as any).carTypes : (found.carType ? [found.carType] : []))
          setPartType(found.partType || '')
          setScale(found.scale || '')
          setSupplier(found.supplier || '')
          setCollections(found.collections || [])
          setTags(Array.isArray(found.tags) ? found.tags.join(', ') : '')
          setEta(found.eta || '')
          setStatus(found.status || 'draft')
          setBoxSize(found.boxSize || '')
          setDimLength(found.dimensions?.length?.toString() || '')
          setDimWidth(found.dimensions?.width?.toString() || '')
          setDimHeight(found.dimensions?.height?.toString() || '')
          setPageIds(Array.isArray((found as any).pageIds) ? (found as any).pageIds : (found.pageId ? [found.pageId] : []))
          setPageUrl((found as any).pageUrl || '')
          const loadedBrands: string[] = Array.isArray((found as any).carBrands) ? (found as any).carBrands : []
          setCarBrands(loadedBrands)
          const extraCarBrands = loadedBrands.filter(b => !BASE_CAR_BRANDS.includes(b))
          if (extraCarBrands.length) setCarBrandOptions(prev => [...prev, ...extraCarBrands.filter(x => !prev.includes(x))])
          const loadedSidewaysBrands: string[] = Array.isArray((found as any).sidewaysBrands) ? (found as any).sidewaysBrands : []
          setSidewaysBrands(loadedSidewaysBrands)
          const extraSidewaysBrands = loadedSidewaysBrands.filter(b => !BASE_CAR_BRANDS.includes(b))
          if (extraSidewaysBrands.length) setSidewaysBrandOptions(prev => [...prev, ...extraSidewaysBrands.filter(x => !prev.includes(x))])
          setSelectedSidewaysParts(Array.isArray((found as any).sidewaysParts) ? (found as any).sidewaysParts : [])
          setIsPreOrder((found as any).isPreOrder || false)
          setUnits(Array.isArray((found as any).units) ? (found as any).units : [])
          setSelectedCarClasses(Array.isArray((found as any).carClasses) ? (found as any).carClasses : ((found as any).carClass ? [(found as any).carClass] : []))
          setSelectedRevoParts(Array.isArray((found as any).revoParts) ? (found as any).revoParts : [])
          setSeoTitle(found.seo?.metaTitle || '')
          setSeoDescription(found.seo?.metaDescription || '')
          setSeoKeywords(found.seo?.metaKeywords || '')
          setSalesAccount(Array.isArray((found as any).salesAccount) ? (found as any).salesAccount : [])
          setPurchaseAccount(Array.isArray((found as any).purchaseAccount) ? (found as any).purchaseAccount : [])

          // Load images
          const images: { name: string; url: string; type: string }[] = []
          if (found.images && found.images.length > 0) {
            found.images.forEach((url, i) => {
              images.push({ name: `image-${i + 1}`, url, type: 'image/jpeg' })
            })
          } else if (found.imageUrl) {
            images.push({ name: 'product-image', url: found.imageUrl, type: 'image/jpeg' })
          }
          setMediaFiles(images)

          // Add brand/scale to lists if not already there
          if (found.brand && !brands.some(b => b.toLowerCase() === found.brand.toLowerCase())) {
            setBrands(prev => [...prev, found.brand])
          }
          if (found.scale && !scales.includes(found.scale)) {
            setScales(prev => [...prev, found.scale])
          }
        }
      }
    } catch (err) {
      console.error('Error loading product:', err)
    } finally {
      setLoading(false)
      isLoaded.current = true
    }
  }

  // Add new item functions — update local state and persist to DB
  const handleAddScale = (val: string) => {
    const v = val.trim()
    if (v && !scales.includes(v)) {
      const next = [...scales, v]
      setScales(next)
      saveOptions('scales', next)
    }
    if (v) setScale(v)
    setNewScaleInput('')
    setScaleDropdownOpen(false)
  }
  const handleAddProductType = (val: string) => {
    const v = val.trim()
    if (v && !productTypes.includes(v)) {
      const next = [...productTypes, v]
      setProductTypes(next)
      saveOptions('categories', next)
    }
    if (v) setProductType(v.toLowerCase().replace(/ /g, '-'))
    setNewCategoryInput('')
  }
  const handleAddCarType = (val: string) => {
    const v = val.trim()
    if (!v) return
    if (!carTypeOptions.includes(v)) {
      const next = [...carTypeOptions, v]
      setCarTypeOptions(next)
      saveOptions('carTypes', next)
    }
    if (!carTypes.includes(v)) setCarTypes(prev => [...prev, v])
    setNewCarTypeInput('')
  }

  // ── Unit autosave handlers ─────────────────────────────────────────────────
  const handleAddUnit = async () => {
    const val = newUnitInput.trim()
    if (!val || units.includes(val)) return
    const next = [...units, val]
    setUnits(next)
    setNewUnitInput('')
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: next }),
      })
      setUnitSaved(true)
      setTimeout(() => setUnitSaved(false), 2000)
    } catch { /* non-critical */ }
  }

  const handleDeleteUnit = async (unit: string) => {
    if (!confirm(`Are you fucking sure you want to delete "${unit}"?`)) return
    const next = units.filter((u) => u !== unit)
    setUnits(next)
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ units: next }),
      })
    } catch { /* non-critical */ }
  }

  // Autosave — saves current fields without uploading pending images or redirecting
  const doAutosave = async () => {
    if (!title.trim()) return
    setAutosaveStatus('saving')
    const cleanFloat = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
    const cleanInt = (v: string) => { const n = parseInt(v); return isNaN(n) ? 0 : n }
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(), description,
          price: cleanFloat(price),
          compareAtPrice: compareAtPrice ? cleanFloat(compareAtPrice) : null,
          costPerItem: costPerItem ? cleanFloat(costPerItem) : null,
          sku, barcode, trackQuantity, quantity: cleanInt(quantity),
          weight: weight ? cleanFloat(weight) : null, weightUnit,
          brand: categoryBrands[0] || brand, productType: itemCategories[0] || productType, categoryBrands, itemCategories,
          carBrands, sidewaysBrands, isPreOrder, units, salesAccount, purchaseAccount,
          carClass: selectedCarClasses[0] || '', revoParts: selectedRevoParts, sidewaysParts: selectedSidewaysParts,
          carType: carTypes[0] || carType, carTypes, partType, scale, supplier, collections,
          tags: tags.split(',').map((t: string) => t.trim()).filter(Boolean),
          status, boxSize,
          dimensions: {
            length: dimLength ? cleanFloat(dimLength) : null,
            width: dimWidth ? cleanFloat(dimWidth) : null,
            height: dimHeight ? cleanFloat(dimHeight) : null,
          },
          eta,
          images: mediaFiles.filter(f => !f.url.startsWith('data:')).map(f => f.url),
          imageUrl: mediaFiles.find(f => !f.url.startsWith('data:'))?.url || '',
          pageIds, pageId: pageIds[0] || '', pageUrl,
          seo: { metaTitle: seoTitle, metaDescription: seoDescription, metaKeywords: seoKeywords },
        }),
      })
      setAutosaveStatus('saved')
      setTimeout(() => setAutosaveStatus('idle'), 2000)
    } catch {
      setAutosaveStatus('idle')
    }
  }

  // Autosave effect — debounced 1500ms after any field change (skips during initial load)
  useEffect(() => {
    if (!isLoaded.current) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(doAutosave, 1500)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, price, compareAtPrice, costPerItem, sku, barcode, trackQuantity,
      quantity, weight, weightUnit, brand, productType, categoryBrands, itemCategories,
      carBrands, sidewaysBrands, isPreOrder, units, carTypes, partType, scale, supplier, collections,
      selectedCarClasses, selectedRevoParts, selectedSidewaysParts,
      tags, status, boxSize, dimLength, dimWidth, dimHeight, eta, pageIds, pageUrl,
      seoTitle, seoDescription, seoKeywords, salesAccount, purchaseAccount])

  // Click-outside — close all custom dropdowns (registered once; no state deps needed)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node
      if (brandRef.current && !brandRef.current.contains(t)) setBrandDropdownOpen(false)

      if (carTypeRef.current && !carTypeRef.current.contains(t)) setCarTypeDropdownOpen(false)
      if (scaleRef.current && !scaleRef.current.contains(t)) setScaleDropdownOpen(false)
      if (carBrandRef.current && !carBrandRef.current.contains(t)) setCarBrandDropdownOpen(false)
      if (pageRef.current && !pageRef.current.contains(t)) setPageDropdownOpen(false)
      if (itemCategoryRef.current && !itemCategoryRef.current.contains(t)) setItemCategoryDropdownOpen(false)
      if (salesAccountRef.current && !salesAccountRef.current.contains(t)) setSalesAccountDropdownOpen(false)
      if (purchaseAccountRef.current && !purchaseAccountRef.current.contains(t)) setPurchaseAccountDropdownOpen(false)
      if (carClassRef.current && !carClassRef.current.contains(t)) setCarClassDropdownOpen(false)
      if (revoPartRef.current && !revoPartRef.current.contains(t)) setRevoPartDropdownOpen(false)
      if (sidewaysBrandRef.current && !sidewaysBrandRef.current.contains(t)) setSidewaysBrandDropdownOpen(false)
      if (sidewaysPartRef.current && !sidewaysPartRef.current.contains(t)) setSidewaysPartDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Upload base64 images to server and return real URLs
  const uploadPendingImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []
    for (const file of mediaFiles) {
      if (file.url.startsWith('data:')) {
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

  const handleSave = async (shouldRedirect = true) => {
    setSaving(true)
    setSaveError('')

    if (!title.trim()) {
      setSaveError('Product title is required')
      setSaving(false)
      return
    }

    const cleanFloat = (v: string) => { const n = parseFloat(v); return isNaN(n) ? 0 : n }
    const cleanInt = (v: string) => { const n = parseInt(v); return isNaN(n) ? 0 : n }

    try {
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
        carBrands,
        sidewaysBrands,
        carClass: selectedCarClasses[0] || '',
        revoParts: selectedRevoParts,
        sidewaysParts: selectedSidewaysParts,
        isPreOrder,
        units,
        carType: carTypes[0] || carType,
        carTypes,
        partType,
        scale,
        supplier,
        collections,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        status,
        boxSize,
        dimensions: {
          length: dimLength ? cleanFloat(dimLength) : null,
          width: dimWidth ? cleanFloat(dimWidth) : null,
          height: dimHeight ? cleanFloat(dimHeight) : null,
        },
        eta,
        salesAccount,
        purchaseAccount,
        images: imageUrls,
        imageUrl: imageUrls.length > 0 ? imageUrls[0] : '',
        pageIds,
        pageId: pageIds[0] || '',
        pageUrl,
        seo: {
          metaTitle: seoTitle,
          metaDescription: seoDescription,
          metaKeywords: seoKeywords,
        },
      }

      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })

      if (res.ok) {
        if (shouldRedirect) {
          router.push('/admin/products')
        } else {
          setSaving(false)
          setSaveInPlaceSuccess(true)
          setTimeout(() => setSaveInPlaceSuccess(false), 2500)
        }
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
    if (carTypes.length) parts.push(`*Car Type:* ${carTypes.join(', ')}`)
    if (scale) parts.push(`*Scale:* ${scale}`)
    if (productType) parts.push(`*Type:* ${productType}`)
    if (partType) parts.push(`*Part Type:* ${partType}`)
    if (sku) parts.push(`*SKU:* ${sku}`)
    if (price) parts.push(`*Price:* R${parseFloat(price).toFixed(2)}`)
    if (compareAtPrice) parts.push(`*Was:* R${parseFloat(compareAtPrice).toFixed(2)}`)
    if (eta) parts.push(`*ETA:* ${eta}`)
    if (quantity && quantity !== '0') parts.push(`*Stock:* ${quantity} units`)
    if (description) { parts.push(''); parts.push(description) }
    if (isPreOrder) {
      parts.push('', `📋 *Book Now:* https://r66slot.co.za/book`)
    } else if (pageUrl) {
      parts.push('', `🔗 ${pageUrl}`)
    }

    const message = parts.join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-lg text-gray-600 mb-4">Product not found</p>
        <Link href="/admin/products" className="text-blue-600 hover:underline">Back to Products</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/products" className="text-gray-600 hover:text-gray-900">
                ← Products
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Edit product</h1>
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
                onClick={() => window.open(`/products/${id}`, '_blank')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                View Live
              </button>
              <button
                onClick={() => router.push('/admin/products')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                disabled={saving}
              >
                Discard
              </button>
              {autosaveStatus === 'saving' && <span className="text-xs text-gray-400">Saving...</span>}
              {autosaveStatus === 'saved' && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
              <button
                onClick={() => handleSave(false)}
                className="px-4 py-2 text-sm font-medium text-yellow-300 bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={saving}
              >
                {saveInPlaceSuccess ? 'Saved ✓' : saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => handleSave(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50"
                disabled={saving}
              >
                {uploadingImages ? 'Uploading...' : saving ? 'Saving...' : 'Save & Exit'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short sleeve t-shirt"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
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
                    <span className="text-blue-600 hover:text-blue-700 font-medium">Add file</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Compare at price</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Cost per item</label>
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
                <p className="mt-2 text-xs text-gray-500">Customers won&apos;t see this</p>
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Inventory</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SKU (Stock Keeping Unit)</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Barcode (ISBN, UPC, GTIN, etc.)</label>
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
                  <label htmlFor="trackQuantity" className="ml-2 text-sm text-gray-700">Track quantity</label>
                </div>
                {trackQuantity && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Box Size</label>
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions (cm)</label>
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
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Weight</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
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
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">ETA</label>
                <input
                  type="text"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  placeholder="e.g. 2-3 weeks"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
            </div>

            {/* Product Organization */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Product organization</h3>
              <div className="space-y-4">

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

                {/* Revo Cars Brand Page (multi-select checkbox dropdown) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Revo Cars Brand Page</label>
                  <div className="relative" ref={carBrandRef}>
                    <button
                      type="button"
                      onClick={() => setCarBrandDropdownOpen(!carBrandDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <span className={carBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {carBrands.length === 0
                          ? 'No brand assigned'
                          : carBrands.length === 1
                          ? carBrands[0]
                          : `${carBrands.length} brands selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${carBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {carBrandDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input
                            type="checkbox"
                            checked={carBrands.length === 0}
                            onChange={() => setCarBrands([])}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-500 italic">None</span>
                        </label>
                        {carBrandOptions.map((cb) => (
                          <div key={cb} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={carBrands.includes(cb)}
                                onChange={(e) => setCarBrands(e.target.checked ? [...carBrands, cb] : carBrands.filter(b => b !== cb))}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-900">{cb}</span>
                            </label>
                            <button type="button" onClick={() => { const next = carBrandOptions.filter(x => x !== cb); setCarBrandOptions(next); setCarBrands(prev => prev.filter(b => b !== cb)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100">
                          <input
                            type="text"
                            value={newCarBrandInput}
                            onChange={(e) => setNewCarBrandInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const val = newCarBrandInput.trim()
                                if (val && !carBrandOptions.includes(val)) {
                                  setCarBrandOptions(prev => [...prev, val])
                                  setCarBrands(prev => [...prev, val])
                                }
                                setNewCarBrandInput('')
                              }
                            }}
                            placeholder="Add brand..."
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = newCarBrandInput.trim()
                              if (val && !carBrandOptions.includes(val)) {
                                setCarBrandOptions(prev => [...prev, val])
                                setCarBrands(prev => [...prev, val])
                              }
                              setNewCarBrandInput('')
                            }}
                            className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-700"
                          >+Add</button>
                        </div>
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

                {/* Revo Racing Class Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Revo Racing Class Filter</label>
                    {selectedCarClasses.length > 0 && (
                      <button type="button" onClick={() => setCarClassPillsHidden(!carClassPillsHidden)} className="text-gray-400 hover:text-gray-600" title={carClassPillsHidden ? 'Show selected' : 'Hide selected'}>
                        {carClassPillsHidden
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        }
                      </button>
                    )}
                  </div>
                  <div className="relative" ref={carClassRef}>
                    <button type="button" onClick={() => setCarClassDropdownOpen(!carClassDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
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
                  {selectedCarClasses.length > 0 && !carClassPillsHidden && (
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Revo Parts Filter</label>
                    {selectedRevoParts.length > 0 && (
                      <button type="button" onClick={() => setRevoPartsPillsHidden(!revoPartsPillsHidden)} className="text-gray-400 hover:text-gray-600" title={revoPartsPillsHidden ? 'Show selected' : 'Hide selected'}>
                        {revoPartsPillsHidden
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        }
                      </button>
                    )}
                  </div>
                  <div className="relative" ref={revoPartRef}>
                    <button type="button" onClick={() => setRevoPartDropdownOpen(!revoPartDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
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
                  {selectedRevoParts.length > 0 && !revoPartsPillsHidden && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedRevoParts.map(part => (
                        <span key={part} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                          {part}<button type="button" onClick={() => setSelectedRevoParts(selectedRevoParts.filter(p => p !== part))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sideways Cars Brand Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sideways Cars Brand Page</label>
                  <div className="relative" ref={sidewaysBrandRef}>
                    <button
                      type="button"
                      onClick={() => setSidewaysBrandDropdownOpen(!sidewaysBrandDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                    >
                      <span className={sidewaysBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {sidewaysBrands.length === 0
                          ? 'No brand assigned'
                          : sidewaysBrands.length === 1
                          ? sidewaysBrands[0]
                          : `${sidewaysBrands.length} brands selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysBrandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {sidewaysBrandDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input
                            type="checkbox"
                            checked={sidewaysBrands.length === 0}
                            onChange={() => setSidewaysBrands([])}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-500 italic">None</span>
                        </label>
                        {sidewaysBrandOptions.map((cb) => (
                          <div key={cb} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sidewaysBrands.includes(cb)}
                                onChange={(e) => setSidewaysBrands(e.target.checked ? [...sidewaysBrands, cb] : sidewaysBrands.filter(b => b !== cb))}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-900">{cb}</span>
                            </label>
                            <button type="button" onClick={() => { const next = sidewaysBrandOptions.filter(x => x !== cb); setSidewaysBrandOptions(next); setSidewaysBrands(prev => prev.filter(b => b !== cb)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-1 px-3 py-2 border-t border-gray-100">
                          <input
                            type="text"
                            value={newSidewaysBrandInput}
                            onChange={(e) => setNewSidewaysBrandInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                const val = newSidewaysBrandInput.trim()
                                if (val && !sidewaysBrandOptions.includes(val)) {
                                  setSidewaysBrandOptions(prev => [...prev, val])
                                  setSidewaysBrands(prev => [...prev, val])
                                }
                                setNewSidewaysBrandInput('')
                              }
                            }}
                            placeholder="Add brand..."
                            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = newSidewaysBrandInput.trim()
                              if (val && !sidewaysBrandOptions.includes(val)) {
                                setSidewaysBrandOptions(prev => [...prev, val])
                                setSidewaysBrands(prev => [...prev, val])
                              }
                              setNewSidewaysBrandInput('')
                            }}
                            className="text-xs px-2 py-1 bg-gray-900 text-white rounded hover:bg-gray-700"
                          >+Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {sidewaysBrands.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {sidewaysBrands.map(cb => (
                        <span key={cb} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                          {cb}
                          <button type="button" onClick={() => setSidewaysBrands(sidewaysBrands.filter(b => b !== cb))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sideways Parts Filter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Sideways Parts Filter</label>
                    {selectedSidewaysParts.length > 0 && (
                      <button type="button" onClick={() => setSidewaysPartsPillsHidden(!sidewaysPartsPillsHidden)} className="text-gray-400 hover:text-gray-600" title={sidewaysPartsPillsHidden ? 'Show selected' : 'Hide selected'}>
                        {sidewaysPartsPillsHidden
                          ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        }
                      </button>
                    )}
                  </div>
                  <div className="relative" ref={sidewaysPartRef}>
                    <button type="button" onClick={() => setSidewaysPartDropdownOpen(!sidewaysPartDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={selectedSidewaysParts.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {selectedSidewaysParts.length === 0 ? 'Select part...' : selectedSidewaysParts.length === 1 ? selectedSidewaysParts[0] : `${selectedSidewaysParts.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidewaysPartDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {sidewaysPartDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="checkbox" checked={selectedSidewaysParts.length === 0} onChange={() => setSelectedSidewaysParts([])} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {sidewaysPartOptions.map(part => (
                          <div key={part} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={selectedSidewaysParts.includes(part)} onChange={e => setSelectedSidewaysParts(e.target.checked ? [...selectedSidewaysParts, part] : selectedSidewaysParts.filter(p => p !== part))} className="rounded" />
                              <span className="text-sm text-gray-900">{part}</span>
                            </label>
                            <button type="button" onClick={() => { const next = sidewaysPartOptions.filter(x => x !== part); setSidewaysPartOptions(next); saveOptions('sidewaysParts', next); setSelectedSidewaysParts(prev => prev.filter(p => p !== part)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newSidewaysPartInput} onChange={e => setNewSidewaysPartInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newSidewaysPartInput.trim()) { e.preventDefault(); const v = newSidewaysPartInput.trim(); if (!sidewaysPartOptions.includes(v)) { const next = [...sidewaysPartOptions, v]; setSidewaysPartOptions(next); saveOptions('sidewaysParts', next) }; setSelectedSidewaysParts(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysPartInput('') } }} placeholder="+ Add part..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newSidewaysPartInput.trim(); if (!v) return; if (!sidewaysPartOptions.includes(v)) { const next = [...sidewaysPartOptions, v]; setSidewaysPartOptions(next); saveOptions('sidewaysParts', next) }; setSelectedSidewaysParts(prev => prev.includes(v) ? prev : [...prev, v]); setNewSidewaysPartInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedSidewaysParts.length > 0 && !sidewaysPartsPillsHidden && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {selectedSidewaysParts.map(part => (
                        <span key={part} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-semibold">
                          {part}<button type="button" onClick={() => setSelectedSidewaysParts(selectedSidewaysParts.filter(p => p !== part))} className="hover:text-red-900">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Car Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Car Type</label>
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
                          <label key={ct} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={carTypes.includes(ct)} onChange={e => setCarTypes(e.target.checked ? [...carTypes, ct] : carTypes.filter(t => t !== ct))} className="rounded" />
                            <span className="text-sm text-gray-900">{ct}</span>
                          </label>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newCarTypeInput} onChange={e => setNewCarTypeInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCarTypeInput.trim()) { e.preventDefault(); handleAddCarType(newCarTypeInput) } }} placeholder="+ Add car type..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { if (newCarTypeInput.trim()) handleAddCarType(newCarTypeInput) }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
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

                {/* Scale */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scale</label>
                  <div className="relative" ref={scaleRef}>
                    <button type="button" onClick={() => setScaleDropdownOpen(!scaleDropdownOpen)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={scale ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
                        {scale || 'Select scale...'}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${scaleDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {scaleDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                          <input type="radio" checked={scale === ''} onChange={() => { setScale(''); setScaleDropdownOpen(false) }} className="rounded" />
                          <span className="text-sm text-gray-400 italic">— None —</span>
                        </label>
                        {scales.map(s => (
                          <label key={s} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="radio" checked={scale === s} onChange={() => { setScale(s); setScaleDropdownOpen(false) }} className="rounded" />
                            <span className="text-sm text-gray-900">{s}</span>
                          </label>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newScaleInput} onChange={e => setNewScaleInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newScaleInput.trim()) { e.preventDefault(); handleAddScale(newScaleInput) } }} placeholder="+ Add scale..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { if (newScaleInput.trim()) handleAddScale(newScaleInput) }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
                        </div>
                      </div>
                    )}
                  </div>
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
                  <div className="relative" ref={pageRef}>
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      {pageIds.map(pid => (
                        <span key={pid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                          <a href={`/admin/pages/editor/${pid}`} target="_blank" className="text-blue-600 hover:underline">
                            {availablePages.find(p => p.id === pid)?.title || pid}
                          </a>
                          <button type="button" onClick={() => setPageIds(pageIds.filter(id => id !== pid))} className="ml-0.5 text-gray-400 hover:text-red-500" title="Remove page">×</button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-gray-500">Select pages where this product will appear</p>
                  )}

                  {/* Custom Page URL */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Custom Page URL</label>
                    <input
                      type="text"
                      value={pageUrl}
                      onChange={(e) => setPageUrl(e.target.value)}
                      placeholder="/products/my-product or https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-400">Manually set a custom URL for this product</p>
                    {pageUrl && (
                      <a
                        href={pageUrl.startsWith('http') ? pageUrl : `${pageUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 block"
                      >
                        Open URL →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sage Accounts */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Sage Accounts</h3>
              <p className="text-xs text-gray-400 mb-4">For Sage accounting &amp; CSV imports/exports</p>
              <div className="space-y-4">

                {/* Category (Brand) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category (Brand)</label>
                  <div className="relative" ref={brandRef}>
                    <button type="button" onClick={() => setBrandDropdownOpen(!brandDropdownOpen)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-left text-sm flex items-center justify-between focus:ring-2 focus:ring-gray-900 bg-white">
                      <span className={categoryBrands.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {categoryBrands.length === 0 ? 'Select brand...' : categoryBrands.length === 1 ? categoryBrands[0] : `${categoryBrands.length} selected`}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${brandDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {brandDropdownOpen && (
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
                          <input type="text" value={newBrandInput} onChange={e => setNewBrandInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newBrandInput.trim()) { e.preventDefault(); const v = newBrandInput.trim(); if (!brands.includes(v)) { const next = [...brands, v]; setBrands(next); saveOptions('brands', next) }; setCategoryBrands(prev => prev.includes(v) ? prev : [...prev, v]); setNewBrandInput('') } }} placeholder="+ Add brand..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { const v = newBrandInput.trim(); if (!v) return; if (!brands.includes(v)) { const next = [...brands, v]; setBrands(next); saveOptions('brands', next) }; setCategoryBrands(prev => prev.includes(v) ? prev : [...prev, v]); setNewBrandInput('') }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
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
                        {productTypes.map(pt => (
                          <div key={pt} className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-50">
                            <label className="flex-1 flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={itemCategories.includes(pt)} onChange={e => setItemCategories(e.target.checked ? [...itemCategories, pt] : itemCategories.filter(c => c !== pt))} className="rounded" />
                              <span className="text-sm text-gray-900">{pt}</span>
                            </label>
                            <button type="button" onClick={() => { const next = productTypes.filter(t => t !== pt); setProductTypes(next); saveOptions('categories', next); setItemCategories(prev => prev.filter(c => c !== pt)) }} className="p-0.5 text-gray-300 hover:text-red-500" title="Remove option">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="border-t border-gray-100 px-3 py-2 flex gap-2">
                          <input type="text" value={newCategoryInput} onChange={e => setNewCategoryInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newCategoryInput.trim()) { e.preventDefault(); handleAddProductType(newCategoryInput) } }} placeholder="+ Add category..." className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-gray-400" />
                          <button type="button" onClick={() => { if (newCategoryInput.trim()) handleAddProductType(newCategoryInput) }} className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-700">Add</button>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || 'Product title'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">{seoTitle.length}/70 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder={description ? description.slice(0, 160) : 'Brief product description for search engines'}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">{seoDescription.length}/160 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Keywords</label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="slot car, 1/32, racing"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">Separate with commas</p>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Info</h3>
              <div className="space-y-2 text-xs text-gray-500">
                <p>Created: {new Date(product.createdAt).toLocaleString()}</p>
                <p>Updated: {new Date(product.updatedAt).toLocaleString()}</p>
                <p className="font-mono text-[10px] text-gray-400">ID: {product.id}</p>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}
