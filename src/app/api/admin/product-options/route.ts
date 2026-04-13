import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { db } from '@/lib/db'

const OPTIONS_KEY = 'data/product-options.json'

const DEFAULTS = {
  brands: ['NSR', 'Revo', 'Pioneer', 'Sideways'],
  categories: [] as string[],
  scales: ['1/32', '1/24'],
  carClasses: ['GT', 'GT 1', 'GT 2', 'GT 3', 'Group 2', 'Group 5', 'GT/IUMSA'],
  revoParts: ['Tyres', 'Wheels', 'Axle', 'Bearings', 'Gears', 'Pinions', 'Screws and Nuts', 'Motors', 'Guides', 'Body Plates & Chassis', 'White body parts set', 'Clear parts set', 'Lexan Cockpit Set'],
  carTypes: ['Livery', 'White Kit', 'White Body Kit', 'White Body'],
  sidewaysParts: [] as string[],
  customOrgCards: [] as { id: string; name: string }[],
  customOrgBrands: {} as Record<string, string[]>,
}

export async function GET() {
  try {
    const saved = await blobRead<typeof DEFAULTS>(OPTIONS_KEY, DEFAULTS)

    // Pull all distinct category_brands and item_categories values from the products table
    const [brandsResult, icResult] = await Promise.all([
      db.query<{ val: string }>(
        `SELECT DISTINCT jsonb_array_elements_text(category_brands) AS val
         FROM products
         WHERE category_brands IS NOT NULL AND category_brands != '[]'::jsonb
         ORDER BY 1`
      ),
      db.query<{ val: string }>(
        `SELECT DISTINCT jsonb_array_elements_text(item_categories) AS val
         FROM products
         WHERE item_categories IS NOT NULL AND item_categories != '[]'::jsonb
         ORDER BY 1`
      ),
    ])
    const dbBrands = brandsResult.rows.map((r) => r.val).filter(Boolean)
    const dbCategories = icResult.rows.map((r) => r.val).filter(Boolean)

    return NextResponse.json({
      brands: Array.from(new Set([...DEFAULTS.brands, ...(saved.brands || []), ...dbBrands])).sort(),
      categories: Array.from(new Set([...dbCategories, ...(saved.categories || [])])).sort(),
      scales: Array.from(new Set([...DEFAULTS.scales, ...(saved.scales || [])])),
      carClasses: Array.from(new Set([...DEFAULTS.carClasses, ...(saved.carClasses || [])])),
      revoParts: Array.from(new Set([...DEFAULTS.revoParts, ...(saved.revoParts || [])])),
      carTypes: Array.from(new Set([...DEFAULTS.carTypes, ...((saved as any).carTypes || [])])),
      sidewaysParts: Array.from(new Set([...DEFAULTS.sidewaysParts, ...((saved as any).sidewaysParts || [])])),
      customOrgCards: (saved as any).customOrgCards || [],
      customOrgBrands: (saved as any).customOrgBrands || {},
      salesAccounts: (saved as any).salesAccounts || [],
      purchaseAccounts: (saved as any).purchaseAccounts || [],
      brandAccountMap: (saved as any).brandAccountMap || {},
    })
  } catch {
    return NextResponse.json({ ...DEFAULTS, customOrgCards: [], customOrgBrands: {}, salesAccounts: [], purchaseAccounts: [], brandAccountMap: {} })
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
