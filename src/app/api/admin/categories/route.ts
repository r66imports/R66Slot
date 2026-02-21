import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const CATEGORIES_KEY = 'data/product-categories.json'

const DEFAULT_CATEGORIES = [
  { id: '1', name: 'Slot Cars', slug: 'slot-cars', description: 'All slot car models', parentId: null, productCount: 0, imageUrl: '', isActive: true, order: 1, brandId: '', supplierId: '', pageUrl: '/products/slot-cars', class: '' },
  { id: '2', name: 'Parts', slug: 'parts', description: 'Replacement & performance parts', parentId: null, productCount: 0, imageUrl: '', isActive: true, order: 2, brandId: '', supplierId: '', pageUrl: '/products/parts', class: '' },
  { id: '3', name: 'Accessories', slug: 'accessories', description: 'Racing accessories', parentId: null, productCount: 0, imageUrl: '', isActive: true, order: 3, brandId: '', supplierId: '', pageUrl: '/products/accessories', class: '' },
  { id: '4', name: 'Pre-Orders', slug: 'pre-orders', description: 'Upcoming items available for pre-order', parentId: null, productCount: 0, imageUrl: '', isActive: true, order: 4, brandId: '', supplierId: '', pageUrl: '/preorder', class: '' },
  // Racing Classes as sub-categories of Slot Cars
  { id: '5', name: 'GT', slug: 'gt', description: 'GT class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 1, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/gt', class: 'GT' },
  { id: '6', name: 'GT 1', slug: 'gt-1', description: 'GT1 class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 2, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/gt-1', class: 'GT 1' },
  { id: '7', name: 'GT 2', slug: 'gt-2', description: 'GT2 class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 3, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/gt-2', class: 'GT 2' },
  { id: '8', name: 'GT 3', slug: 'gt-3', description: 'GT3 class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 4, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/gt-3', class: 'GT 3' },
  { id: '9', name: 'Group 2', slug: 'group-2', description: 'Group 2 class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 5, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/group-2', class: 'Group 2' },
  { id: '10', name: 'Group 5', slug: 'group-5', description: 'Group 5 class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 6, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/group-5', class: 'Group 5' },
  { id: '11', name: 'GT/IUMSA', slug: 'gt-iumsa', description: 'GT/IUMSA class slot cars', parentId: '1', productCount: 0, imageUrl: '', isActive: true, order: 7, brandId: '', supplierId: '', pageUrl: '/products/slot-cars/gt-iumsa', class: 'GT/IUMSA' },
]

async function getCategories() {
  return await blobRead<any[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES)
}

async function saveCategories(categories: any[]) {
  await blobWrite(CATEGORIES_KEY, categories)
}

export async function GET() {
  try {
    const categories = await getCategories()
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(DEFAULT_CATEGORIES)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const categories = await getCategories()

    const newCategory = {
      id: `cat_${Date.now()}`,
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      description: body.description || '',
      parentId: body.parentId || null,
      productCount: 0,
      imageUrl: body.imageUrl || '',
      isActive: body.isActive !== false,
      order: body.order || categories.length + 1,
      brandId: body.brandId || '',
      supplierId: body.supplierId || '',
      pageUrl: body.pageUrl || `/products/${body.slug || body.name.toLowerCase().replace(/\s+/g, '-')}`,
      class: body.class || '',
    }

    categories.push(newCategory)
    await saveCategories(categories)
    return NextResponse.json(newCategory, { status: 201 })
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const categories = await getCategories()

    const idx = categories.findIndex((c: any) => c.id === body.id)
    if (idx === -1) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    categories[idx] = { ...categories[idx], ...body, updatedAt: new Date().toISOString() }
    await saveCategories(categories)
    return NextResponse.json(categories[idx])
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const categories = await getCategories()
    const filtered = categories.filter((c: any) => c.id !== id && c.parentId !== id)
    await saveCategories(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 })
  }
}
