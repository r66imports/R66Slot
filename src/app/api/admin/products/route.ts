import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const PRODUCTS_KEY = 'data/products.json'

export interface Product {
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
  quantity: number
  eta: string
  status: 'draft' | 'active'
  imageUrl: string
  createdAt: string
  updatedAt: string
}

async function getProducts(): Promise<Product[]> {
  return await blobRead<Product[]>(PRODUCTS_KEY, [])
}

async function saveProducts(products: Product[]): Promise<void> {
  await blobWrite(PRODUCTS_KEY, products)
}

// GET /api/admin/products
export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/products
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const products = await getProducts()

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      title: body.title || '',
      description: body.description || '',
      price: body.price || 0,
      compareAtPrice: body.compareAtPrice || null,
      costPerItem: body.costPerItem || null,
      sku: body.sku || '',
      barcode: body.barcode || '',
      brand: body.brand || '',
      productType: body.productType || '',
      quantity: body.quantity || 0,
      eta: body.eta || '',
      status: body.status || 'draft',
      imageUrl: body.imageUrl || body.mediaFiles?.[0] || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    products.push(newProduct)
    await saveProducts(products)

    return NextResponse.json(newProduct, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}

// PUT /api/admin/products (bulk import)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body.products)) {
      const existing = await getProducts()
      const newProducts: Product[] = body.products.map((p: any) => ({
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: p.title || p.name || '',
        description: p.description || '',
        price: parseFloat(p.price) || 0,
        compareAtPrice: p.compareAtPrice ? parseFloat(p.compareAtPrice) : null,
        costPerItem: p.costPerItem ? parseFloat(p.costPerItem) : null,
        sku: p.sku || '',
        barcode: p.barcode || '',
        brand: p.brand || '',
        productType: p.productType || '',
        quantity: parseInt(p.quantity) || 0,
        eta: p.eta || '',
        status: p.status || 'active',
        imageUrl: p.imageUrl || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
      const merged = [...existing, ...newProducts]
      await saveProducts(merged)
      return NextResponse.json({ imported: newProducts.length })
    }
    return NextResponse.json({ error: 'Expected { products: [] }' }, { status: 400 })
  } catch (error) {
    console.error('Error importing products:', error)
    return NextResponse.json({ error: 'Failed to import' }, { status: 500 })
  }
}
