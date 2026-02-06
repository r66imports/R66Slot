'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Brand {
  id: string
  name: string
  code: string
}

interface Supplier {
  id: string
  name: string
  code: string
}

interface Category {
  id: string
  name: string
  slug: string
  description: string
  parentId: string | null
  productCount: number
  imageUrl: string
  isActive: boolean
  order: number
  brandId?: string
  supplierId?: string
  pageUrl?: string
}

// Default brands
const defaultBrands: Brand[] = [
  { id: '1', name: 'Revo Slot', code: 'REVO' },
  { id: '2', name: 'NSR', code: 'NSR' },
  { id: '3', name: 'Pioneer', code: 'PIONEER' },
  { id: '4', name: 'Sideways', code: 'SIDEWAYS' },
  { id: '5', name: 'BRM', code: 'BRM' },
  { id: '6', name: 'Scalextric', code: 'SCAL' },
  { id: '7', name: 'Slot.it', code: 'SLOT' },
  { id: '8', name: 'Carrera', code: 'CARR' },
]

// Default suppliers
const defaultSuppliers: Supplier[] = [
  { id: '1', name: 'Revo Slot', code: 'REVO' },
  { id: '2', name: 'NSR', code: 'NSR' },
  { id: '3', name: 'Pioneer', code: 'PIONEER' },
  { id: '4', name: 'Sideways', code: 'SIDEWAYS' },
  { id: '5', name: 'BRM', code: 'BRM' },
]

export default function CatalogueCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [brands] = useState<Brand[]>(defaultBrands)
  const [suppliers] = useState<Supplier[]>(defaultSuppliers)
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUrlModal, setShowUrlModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  // Filters
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [subCategoryFilter, setSubCategoryFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    brandId: '',
    supplierId: '',
    pageUrl: '',
    isActive: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      } else {
        // Use mock data
        setCategories([
          { id: '1', name: 'Slot Cars', slug: 'slot-cars', description: 'All slot cars', parentId: null, productCount: 45, imageUrl: '', isActive: true, order: 1, brandId: '', supplierId: '', pageUrl: '/products/slot-cars' },
          { id: '2', name: 'Tracks', slug: 'tracks', description: 'Racing tracks', parentId: null, productCount: 12, imageUrl: '', isActive: true, order: 2, brandId: '', supplierId: '', pageUrl: '/products/tracks' },
          { id: '3', name: 'Parts', slug: 'parts', description: 'Replacement parts', parentId: null, productCount: 89, imageUrl: '', isActive: true, order: 3, brandId: '', supplierId: '', pageUrl: '/products/parts' },
          { id: '4', name: 'Accessories', slug: 'accessories', description: 'Racing accessories', parentId: null, productCount: 34, imageUrl: '', isActive: true, order: 4, brandId: '', supplierId: '', pageUrl: '/products/accessories' },
          { id: '5', name: '1:32 Scale', slug: '1-32-scale', description: '1:32 scale cars', parentId: '1', productCount: 28, imageUrl: '', isActive: true, order: 1, brandId: '1', supplierId: '1', pageUrl: '/products/slot-cars/1-32' },
          { id: '6', name: '1:24 Scale', slug: '1-24-scale', description: '1:24 scale cars', parentId: '1', productCount: 17, imageUrl: '', isActive: true, order: 2, brandId: '2', supplierId: '2', pageUrl: '/products/slot-cars/1-24' },
        ])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setCategories([
        { id: '1', name: 'Slot Cars', slug: 'slot-cars', description: 'All slot cars', parentId: null, productCount: 45, imageUrl: '', isActive: true, order: 1, brandId: '', supplierId: '', pageUrl: '/products/slot-cars' },
        { id: '2', name: 'Tracks', slug: 'tracks', description: 'Racing tracks', parentId: null, productCount: 12, imageUrl: '', isActive: true, order: 2, brandId: '', supplierId: '', pageUrl: '/products/tracks' },
        { id: '3', name: 'Parts', slug: 'parts', description: 'Replacement parts', parentId: null, productCount: 89, imageUrl: '', isActive: true, order: 3, brandId: '', supplierId: '', pageUrl: '/products/parts' },
        { id: '4', name: 'Accessories', slug: 'accessories', description: 'Racing accessories', parentId: null, productCount: 34, imageUrl: '', isActive: true, order: 4, brandId: '', supplierId: '', pageUrl: '/products/accessories' },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: '',
      brandId: '',
      supplierId: '',
      pageUrl: '',
      isActive: true,
    })
  }

  const handleAddCategory = async () => {
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-')
    const category: Category = {
      id: Date.now().toString(),
      name: formData.name,
      slug,
      description: formData.description,
      parentId: formData.parentId || null,
      productCount: 0,
      imageUrl: '',
      isActive: formData.isActive,
      order: categories.length + 1,
      brandId: formData.brandId,
      supplierId: formData.supplierId,
      pageUrl: formData.pageUrl || `/products/${slug}`,
    }
    setCategories([...categories, category])
    setShowAddModal(false)
    resetForm()
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId || '',
      brandId: category.brandId || '',
      supplierId: category.supplierId || '',
      pageUrl: category.pageUrl || '',
      isActive: category.isActive,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!selectedCategory) return

    const updatedCategories = categories.map(cat => {
      if (cat.id === selectedCategory.id) {
        return {
          ...cat,
          name: formData.name,
          slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
          description: formData.description,
          parentId: formData.parentId || null,
          brandId: formData.brandId,
          supplierId: formData.supplierId,
          pageUrl: formData.pageUrl,
          isActive: formData.isActive,
        }
      }
      return cat
    })
    setCategories(updatedCategories)
    setShowEditModal(false)
    setSelectedCategory(null)
    resetForm()
  }

  const handleOpenUrlModal = (category: Category) => {
    setSelectedCategory(category)
    setShowUrlModal(true)
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(c => c.id !== id))
    }
  }

  const handleToggleActive = (id: string) => {
    setCategories(categories.map(cat =>
      cat.id === id ? { ...cat, isActive: !cat.isActive } : cat
    ))
  }

  // Filter categories
  const filteredCategories = categories.filter(cat => {
    if (brandFilter && cat.brandId !== brandFilter) return false
    if (supplierFilter && cat.supplierId !== supplierFilter) return false
    // Category filter - show only this parent category and its children
    if (categoryFilter) {
      if (cat.id !== categoryFilter && cat.parentId !== categoryFilter) return false
    }
    // Sub Category filter - show only this specific sub category
    if (subCategoryFilter && cat.id !== subCategoryFilter) return false
    return true
  })

  // Get parent categories for the Category dropdown
  const parentCategoriesForFilter = categories.filter(c => !c.parentId)

  // Get sub categories based on selected category filter
  const subCategoriesForFilter = categoryFilter
    ? categories.filter(c => c.parentId === categoryFilter)
    : categories.filter(c => c.parentId)

  const parentCategories = filteredCategories.filter(c => !c.parentId)
  const getChildCategories = (parentId: string) => filteredCategories.filter(c => c.parentId === parentId)

  const getBrandName = (brandId?: string) => {
    if (!brandId) return ''
    const brand = brands.find(b => b.id === brandId)
    return brand ? brand.name : ''
  }

  const getSupplierName = (supplierId?: string) => {
    if (!supplierId) return ''
    const supplier = suppliers.find(s => s.id === supplierId)
    return supplier ? supplier.name : ''
  }

  return (
    <div className="font-play">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/catalogue" className="hover:text-blue-600">Catalogue</Link>
            <span>/</span>
            <span className="text-gray-900">Categories</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 mt-1">Organize your products into categories</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowAddModal(true) }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Add Category
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Brand:</label>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]"
            >
              <option value="">Select Brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setSubCategoryFilter('') // Reset sub category when category changes
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]"
            >
              <option value="">Select Category</option>
              {parentCategoriesForFilter.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Sub Category:</label>
            <select
              value={subCategoryFilter}
              onChange={(e) => setSubCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]"
              disabled={!categoryFilter && subCategoriesForFilter.length === 0}
            >
              <option value="">Select Sub Category</option>
              {subCategoriesForFilter.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Supplier:</label>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
              ))}
            </select>
          </div>
          {(brandFilter || categoryFilter || subCategoryFilter || supplierFilter) && (
            <button
              onClick={() => {
                setBrandFilter('')
                setCategoryFilter('')
                setSubCategoryFilter('')
                setSupplierFilter('')
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          )}
          <div className="ml-auto text-sm text-gray-500">
            {filteredCategories.length} categories
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading categories...</p>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No categories found</p>
          {(brandFilter || supplierFilter) && (
            <button
              onClick={() => { setBrandFilter(''); setSupplierFilter('') }}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {parentCategories.map((category) => {
            const children = getChildCategories(category.id)
            return (
              <Card key={category.id}>
                <CardContent className="p-0">
                  {/* Parent Category */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
                        🏷️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{category.name}</h3>
                          {category.pageUrl && (
                            <button
                              onClick={() => handleOpenUrlModal(category)}
                              className="text-blue-500 hover:text-blue-700"
                              title="View Page URL"
                            >
                              🔗
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{category.description}</p>
                        <div className="flex gap-2 mt-1">
                          {getBrandName(category.brandId) && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                              {getBrandName(category.brandId)}
                            </span>
                          )}
                          {getSupplierName(category.supplierId) && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                              {getSupplierName(category.supplierId)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {category.productCount} products
                      </span>
                      <button
                        onClick={() => handleToggleActive(category.id)}
                        className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                          category.isActive
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Child Categories */}
                  {children.length > 0 && (
                    <div className="divide-y divide-gray-100">
                      {children.map((child) => (
                        <div key={child.id} className="flex items-center justify-between p-4 pl-16 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400">↳</span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-800">{child.name}</h4>
                                {child.pageUrl && (
                                  <button
                                    onClick={() => handleOpenUrlModal(child)}
                                    className="text-blue-500 hover:text-blue-700"
                                    title="View Page URL"
                                  >
                                    🔗
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-400">{child.description}</p>
                              <div className="flex gap-2 mt-1">
                                {getBrandName(child.brandId) && (
                                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                    {getBrandName(child.brandId)}
                                  </span>
                                )}
                                {getSupplierName(child.supplierId) && (
                                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                                    {getSupplierName(child.supplierId)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {child.productCount} products
                            </span>
                            <button
                              onClick={() => handleToggleActive(child.id)}
                              className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                                child.isActive
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {child.isActive ? 'Active' : 'Inactive'}
                            </button>
                            <button
                              onClick={() => handleEditCategory(child)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(child.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Add Category</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Category name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Auto-generated"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Category description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">None (Top Level)</option>
                      {categories.filter(c => !c.parentId).map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
                    <input
                      type="text"
                      value={formData.pageUrl}
                      onChange={(e) => setFormData({ ...formData, pageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="/products/category-slug"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button
                  onClick={handleAddCategory}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!formData.name}
                >
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit Category</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Category name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <input
                      type="text"
                      value={formData.slug}
                      onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="category-slug"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={2}
                    placeholder="Category description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                    <select
                      value={formData.parentId}
                      onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">None (Top Level)</option>
                      {categories.filter(c => !c.parentId && c.id !== selectedCategory.id).map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <select
                      value={formData.brandId}
                      onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                    <select
                      value={formData.supplierId}
                      onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page URL</label>
                    <input
                      type="text"
                      value={formData.pageUrl}
                      onChange={(e) => setFormData({ ...formData, pageUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="/products/category-slug"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="editIsActive" className="text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => { setShowEditModal(false); setSelectedCategory(null); resetForm() }}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!formData.name}
                >
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* URL Page Link Modal */}
      {showUrlModal && selectedCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Category Page Link</h2>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="font-semibold text-gray-900">{selectedCategory.name}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">Page URL</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white px-3 py-2 rounded border text-sm break-all">
                      {selectedCategory.pageUrl || `/products/${selectedCategory.slug}`}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedCategory.pageUrl || `/products/${selectedCategory.slug}`)
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      title="Copy URL"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={selectedCategory.pageUrl || `/products/${selectedCategory.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Open Page →
                  </a>
                  <button
                    onClick={() => handleEditCategory(selectedCategory)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit Category
                  </button>
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <Button variant="outline" onClick={() => { setShowUrlModal(false); setSelectedCategory(null) }}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
