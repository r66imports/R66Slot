import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const BRANDS_KEY = 'data/brands.json'

async function getBrands(): Promise<string[]> {
  return await blobRead<string[]>(BRANDS_KEY, [])
}

async function saveBrands(brands: string[]): Promise<void> {
  await blobWrite(BRANDS_KEY, brands)
}

export async function GET() {
  try {
    const brands = await getBrands()
    return NextResponse.json(brands)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    const trimmed = name?.trim()
    if (!trimmed) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const brands = await getBrands()
    if (brands.some((b) => b.toLowerCase() === trimmed.toLowerCase())) {
      return NextResponse.json(trimmed) // already exists, just return it
    }

    const sorted = [...brands, trimmed].sort((a, b) => a.localeCompare(b))
    await saveBrands(sorted)
    return NextResponse.json(trimmed, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    const brands = await getBrands()
    await saveBrands(brands.filter((b) => b !== name))
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
