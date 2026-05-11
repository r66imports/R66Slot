import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { blobRead, blobWrite } from '@/lib/blob-storage'

// Converts RS-XXX → RSXXX (only strips the hyphen directly after RS)
function fixSku(sku: string): string {
  return sku.replace(/^RS-/, 'RS')
}

function needsFix(sku: string): boolean {
  return /^RS-/.test(sku)
}

export async function POST() {
  const changes: string[] = []
  const errors: string[] = []

  try {
    // ── 1. Products table ────────────────────────────────────────────────────
    const result = await db.query(
      `SELECT id, sku FROM products WHERE sku LIKE 'RS-%' ORDER BY sku`
    )
    for (const row of result.rows) {
      const newSku = fixSku(row.sku)
      try {
        await db.query(`UPDATE products SET sku = $1, updated_at = NOW() WHERE sku = $2`, [newSku, row.sku])
        changes.push(`products: ${row.sku} → ${newSku}`)
      } catch (e: any) {
        errors.push(`products ${row.sku}: ${e.message}`)
      }
    }

    // ── 2. Inventory pricelists blob (flat array) ────────────────────────────
    const pricelists = await blobRead<any[]>('data/inventory-pricelists.json', [])
    let plChanged = false
    const updatedPricelists = pricelists.map((entry: any) => {
      if (needsFix(entry.sku || '')) {
        const newSku = fixSku(entry.sku)
        changes.push(`pricelist: ${entry.sku} → ${newSku}`)
        plChanged = true
        return { ...entry, sku: newSku }
      }
      return entry
    })
    if (plChanged) await blobWrite('data/inventory-pricelists.json', updatedPricelists)

    // ── 3. Worksheets blob ───────────────────────────────────────────────────
    const worksheets = await blobRead<any[]>('data/worksheets.json', [])
    let wsChanged = false
    const updatedWorksheets = worksheets.map((sheet: any) => {
      const items = (sheet.items || []).map((item: any) => {
        if (needsFix(item.sku || '')) {
          const newSku = fixSku(item.sku)
          changes.push(`worksheet [${sheet.name || sheet.id}]: ${item.sku} → ${newSku}`)
          wsChanged = true
          return { ...item, sku: newSku }
        }
        return item
      })
      return { ...sheet, items }
    })
    if (wsChanged) await blobWrite('data/worksheets.json', updatedWorksheets)

    // ── 4. SKU entity map blob ───────────────────────────────────────────────
    const entityMap = await blobRead<Record<string, string>>('data/sku-entity-map.json', {})
    const newEntityMap: Record<string, string> = {}
    let emChanged = false
    for (const [sku, entity] of Object.entries(entityMap)) {
      if (needsFix(sku)) {
        const newSku = fixSku(sku)
        newEntityMap[newSku] = entity
        changes.push(`sku-entity-map: ${sku} → ${newSku}`)
        emChanged = true
      } else {
        newEntityMap[sku] = entity
      }
    }
    if (emChanged) await blobWrite('data/sku-entity-map.json', newEntityMap)

    // ── 5. Backorders blob ───────────────────────────────────────────────────
    const backorders = await blobRead<any[]>('data/backorders.json', [])
    let boChanged = false
    const updatedBackorders = backorders.map((b: any) => {
      if (needsFix(b.sku || '')) {
        const newSku = fixSku(b.sku)
        changes.push(`backorder [${b.id}]: ${b.sku} → ${newSku}`)
        boChanged = true
        return { ...b, sku: newSku }
      }
      return b
    })
    if (boChanged) await blobWrite('data/backorders.json', updatedBackorders)

    // ── 6. Pre-order list blob ───────────────────────────────────────────────
    const preorderList = await blobRead<any[]>('data/preorder-list.json', [])
    let poChanged = false
    const updatedPreorderList = preorderList.map((item: any) => {
      if (needsFix(item.sku || '')) {
        const newSku = fixSku(item.sku)
        changes.push(`preorder-list [${item.id}]: ${item.sku} → ${newSku}`)
        poChanged = true
        return { ...item, sku: newSku }
      }
      return item
    })
    if (poChanged) await blobWrite('data/preorder-list.json', updatedPreorderList)

    // ── 7. Inventory counts blob (keyed by product ID — no change needed) ────
    // sku-entity-map keys are uppercase, fix those too
    const entityMapUpper = await blobRead<Record<string, string>>('data/sku-entity-map.json', {})
    const newEntityMapUpper: Record<string, string> = {}
    let emuChanged = false
    for (const [sku, entity] of Object.entries(entityMapUpper)) {
      const upperFixed = sku.replace(/^RS-/, 'RS')
      if (upperFixed !== sku) {
        newEntityMapUpper[upperFixed] = entity
        emuChanged = true
      } else {
        newEntityMapUpper[sku] = entity
      }
    }
    if (emuChanged) await blobWrite('data/sku-entity-map.json', newEntityMapUpper)

    return NextResponse.json({
      ok: true,
      totalChanged: changes.length,
      errors,
      changes,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}

// GET — preview what would change in products table without writing anything
export async function GET() {
  try {
    const result = await db.query(
      `SELECT sku FROM products WHERE sku LIKE 'RS-%' ORDER BY sku`
    )
    const preview = result.rows.map((row: any) => `${row.sku} → ${fixSku(row.sku)}`)
    return NextResponse.json({ preview, count: preview.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
