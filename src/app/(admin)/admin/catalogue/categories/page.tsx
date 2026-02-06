'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
}

export default function CatalogueCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: '',
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
        // If no categories API, use mock data
        setCategories([
          { id: '1', name: 'Slot Cars', slug: 'slot-cars', description: 'All slot cars', parentId: null, productCount: 45, imageUrl: '', isActive: true, order: 1 },
          { id: '2', name: 'Tracks', slug: 'tracks', description: 'Racing tracks', parentId: null, productCount: 12, imageUrl: '', isActive: true, order: 2 },
          { id: '3', name: 'Parts', slug: 'parts', description: 'Replacement parts', parentId: null, productCount: 89, imageUrl: '', isActive: true, order: 3 },
          { id: '4', name: 'Accessories', slug: 'accessories', description: 'Racing accessories', parentId: null, productCount: 34, imageUrl: '', isActive: true, order: 4 },
          { id: '5', name: '1:32 Scale', slug: '1-32-scale', description: '1:32 scale cars', parentId: '1', productCount: 28, imageUrl: '', isActive: true, order: 1 },
          { id: '6', name: '1:24 Scale', slug: '1-24-scale', description: '1:24 scale cars', parentId: '1', productCount: 17, imageUrl: '', isActive: true, order: 2 },
        ])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      // Use mock data on error
      setCategories([
        { id: '1', name: 'Slot Cars', slug: 'slot-cars', description: 'All slot cars', parentId: null, productCount: 45, imageUrl: '', isActive: true, order: 1 },
        { id: '2', name: 'Tracks', slug: 'tracks', description: 'Racing tracks', parentId: null, productCount: 12, imageUrl: '', isActive: true, order: 2 },
        { id: '3', name: 'Parts', slug: 'parts', description: 'Replacement parts', parentId: null, productCount: 89, imageUrl: '', isActive: true, order: 3 },
        { id: '4', name: 'Accessories', slug: 'accessories', description: 'Racing accessories', parentId: null, productCount: 34, imageUrl: '', isActive: true, order: 4 },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    const slug = newCategory.slug || newCategory.name.toLowerCase().replace(/\s+/g, '-')
    const category: Category = {
      id: Date.now().toString(),
      name: newCategory.name,
      slug,
      description: newCategory.description,
      parentId: newCategory.parentId || null,
      productCount: 0,
      imageUrl: '',
      isActive: true,
      order: categories.length + 1,
    }
    setCategories([...categories, category])
    setShowAddModal(false)
    setNewCategory({ name: '', slug: '', description: '', parentId: '' })
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this category?')) {
      setCategories(categories.filter(c => c.id !== id))
    }
  }

  const parentCategories = categories.filter(c => !c.parentId)
  const getChildCategories = (parentId: string) => categories.filter(c => c.parentId === parentId)

  return (
    <div className="font-play">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          + Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading categories...</p>
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
                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-500">{category.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {category.productCount} products
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        category.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
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
                        <div key={child.id} className="flex items-center justify-between p-4 pl-16">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400">↳</span>
                            <div>
                              <h4 className="font-medium text-gray-800">{child.name}</h4>
                              <p className="text-sm text-gray-400">{child.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-500">
                              {child.productCount} products
                            </span>
                            <button
                              onClick={() => setEditingCategory(child)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(child.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
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
          <Card className="w-full max-w-md">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4">Add Category</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Category name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={newCategory.slug}
                    onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="category-slug (auto-generated if empty)"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newCategory.description}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="Category description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                  <select
                    value={newCategory.parentId}
                    onChange={(e) => setNewCategory({ ...newCategory, parentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">None (Top Level)</option>
                    {parentCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-700 text-white">
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
