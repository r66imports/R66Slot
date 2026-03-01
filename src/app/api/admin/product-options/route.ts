import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const OPTIONS_KEY = 'data/product-options.json'

const DEFAULTS = {
  brands: ['NSR', 'Revo', 'Pioneer', 'Sideways'],
  categories: ['Slot Cars', 'Parts'],
  scales: ['1/32', '1/24'],
  carClasses: ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA'],
  revoParts: ['Tyres', 'Wheels', 'Axle', 'Bearings', 'Gears', 'Pinions', 'Screws and Nuts', 'Motors', 'Guides', 'Body Plates & Chassis', 'White body parts set', 'Clear parts set', 'Lexan Cockpit Set'],
}

export async function GET() {
  try {
    const saved = await blobRead<typeof DEFAULTS>(OPTIONS_KEY, DEFAULTS)
    // Merge saved values with defaults so new hardcoded defaults always appear
    return NextResponse.json({
      brands: Array.from(new Set([...DEFAULTS.brands, ...(saved.brands || [])])),
      categories: Array.from(new Set([...DEFAULTS.categories, ...(saved.categories || [])])),
      scales: Array.from(new Set([...DEFAULTS.scales, ...(saved.scales || [])])),
      carClasses: Array.from(new Set([...DEFAULTS.carClasses, ...(saved.carClasses || [])])),
      revoParts: Array.from(new Set([...DEFAULTS.revoParts, ...(saved.revoParts || [])])),
    })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<typeof DEFAULTS>(OPTIONS_KEY, DEFAULTS)
    const updated = { ...current, ...body }
    await blobWrite(OPTIONS_KEY, updated)
    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
