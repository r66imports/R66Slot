import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import type { Product } from '../route'

const PRODUCTS_KEY = 'data/products.json'

async function getProducts(): Promise<Product[]> {
  return await blobRead<Product[]>(PRODUCTS_KEY, [])
}

async function saveProducts(products: Product[]): Promise<void> {
  await blobWrite(PRODUCTS_KEY, products)
}

// PUT /api/admin/products/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const products = await getProducts()
    const index = products.findIndex(p => p.id === id)
    if (index === -1) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    products[index] = {
      ...products[index],
      ...body,
      id: products[index].id,
      createdAt: products[index].createdAt,
      updatedAt: new Date().toISOString(),
    }
    await saveProducts(products)
    return NextResponse.json(products[index])
  } catch (error) {
    console.error('Error updating product:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// DELETE /api/admin/products/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const products = await getProducts()
    const filtered = products.filter(p => p.id !== id)
    if (filtered.length === products.length) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    await saveProducts(filtered)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
