import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/preorder-dashboard-options.json'

interface Options {
  brands: string[]
  units: string[]
  etas: string[]
}

async function getOptions(): Promise<Options> {
  const data = await blobRead<any>(KEY, {})
  return {
    brands: Array.isArray(data.brands) ? data.brands : [],
    units: Array.isArray(data.units) ? data.units : [],
    etas: Array.isArray(data.etas) ? data.etas : [],
  }
}

export async function GET() {
  try {
    return NextResponse.json(await getOptions())
  } catch (error) {
    console.error('Error fetching preorder dashboard options:', error)
    return NextResponse.json({ error: 'Failed to fetch options' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { type, value } = await request.json()
    if (!type || !value?.trim()) {
      return NextResponse.json({ error: 'type and value required' }, { status: 400 })
    }
    if (type !== 'brand' && type !== 'unit' && type !== 'eta') {
      return NextResponse.json({ error: 'type must be brand, unit or eta' }, { status: 400 })
    }
    const options = await getOptions()
    const key = type === 'brand' ? 'brands' : type === 'unit' ? 'units' : 'etas'
    const trimmed = value.trim()
    if (!options[key].includes(trimmed)) {
      options[key].push(trimmed)
      options[key].sort((a: string, b: string) => a.localeCompare(b))
      await blobWrite(KEY, options)
    }
    return NextResponse.json(options)
  } catch (error) {
    console.error('Error saving preorder dashboard option:', error)
    return NextResponse.json({ error: 'Failed to save option' }, { status: 500 })
  }
}
