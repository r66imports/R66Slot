import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { blobRead, blobWrite } from '@/lib/blob-storage'

// Normalises NSR SKU prefix to uppercase: nsr-XXXX → NSR-XXXX
function fixSku(sku: string): string {
  return 'NSR-' + sku.slice(4)
}

function needsFix(sku: string): boolean {
  return typeof sku === 'string' && sku.startsWith('nsr-')
}

// GET — preview: shows what would be renamed vs deleted (duplicates)
export async function GET() {
  try {
    const result = await db.query(
      `SELECT id, sku FROM products WHERE sku LIKE 'nsr-%' ORDER BY sku`
    )
    const allSkus = await db.query(`SELECT sku FROM products ORDER BY sku`)
    const upperSkuSet = new Set(allSkus.rows.map((r: any) => r.sku))

    const renames: string[] = []
    const deletes: string[] = []

    for (const row of result.rows) {
      const fixed = fixSku(row.sku)
      if (upperSkuSet.has(fixed)) {
        deletes.push(`DELETE duplicate: ${row.sku} (${fixed} already exists)`)
      } else {
        renames.push(`RENAME: ${row.sku} → ${fixed}`)
      }
    }

    return NextResponse.json({ renames, deletes, count: result.rows.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — run the fix
export async function POST() {
  const changes: string[] = []
  const errors: string[] = []

  try {
    // ── 1. Products table ────────────────────────────────────────────────────
    const result = await db.query(
      `SELECT id, sku FROM products WHERE sku LIKE 'nsr-%' ORDER BY sku`
    )
    const upperRows = await db.query(`SELECT id, sku FROM products WHERE sku LIKE 'NSR-%'`)
    const upperSkuToId: Record<string, string> = {}
    for (const r of upperRows.rows) upperSkuToId[r.sku] = r.id

    const deletedIds: string[] = []

    for (const row of result.rows) {
      const fixed = fixSku(row.sku)
      if (upperSkuToId[fixed]) {
        // Duplicate — delete the lowercase one
        try {
          await db.query(`DELETE FROM products WHERE id = $1`, [row.id])
          deletedIds.push(row.id)
          changes.push(`products: DELETED duplicate ${row.sku} (${fixed} kept)`)
        } catch (e: any) {
          errors.push(`products DELETE ${row.sku}: ${e.message}`)
        }
      } else {
        // No duplicate — rename
        try {
          await db.query(`UPDATE products SET sku = $1, updated_at = NOW() WHERE id = $2`, [fixed, row.id])
          changes.push(`products: RENAMED ${row.sku} → ${fixed}`)
        } catch (e: any) {
          errors.push(`products RENAME ${row.sku}: ${e.message}`)
        }
      }
    }

    // ── 2. Inventory pricelists blob ─────────────────────────────────────────
    const pricelists = await blobRead<any[]>('data/inventory-pricelists.json', [])
    let plChanged = false
    const seenPlSkus = new Set<string>()
    const updatedPricelists: any[] = []
    for (const entry of pricelists) {
      const sku = entry.sku || ''
      if (needsFix(sku)) {
        const fixed = fixSku(sku)
        if (seenPlSkus.has(fixed)) {
          changes.push(`pricelist: DELETED duplicate ${sku}`)
          plChanged = true
          continue
        }
        seenPlSkus.add(fixed)
        updatedPricelists.push({ ...entry, sku: fixed })
        changes.push(`pricelist: RENAMED ${sku} → ${fixed}`)
        plChanged = true
      } else {
        seenPlSkus.add(sku)
        updatedPricelists.push(entry)
      }
    }
    if (plChanged) await blobWrite('data/inventory-pricelists.json', updatedPricelists)

    // ── 3. Worksheets blob ───────────────────────────────────────────────────
    const worksheets = await blobRead<any[]>('data/worksheets.json', [])
    let wsChanged = false
    const updatedWorksheets = worksheets.map((sheet: any) => {
      const items = (sheet.items || []).map((item: any) => {
        if (needsFix(item.sku || '')) {
          const fixed = fixSku(item.sku)
          changes.push(`worksheet [${sheet.name || sheet.id}]: ${item.sku} → ${fixed}`)
          wsChanged = true
          return { ...item, sku: fixed }
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
        const fixed = fixSku(sku)
        newEntityMap[fixed] = entity
        changes.push(`sku-entity-map: ${sku} → ${fixed}`)
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
        const fixed = fixSku(b.sku)
        changes.push(`backorder [${b.id}]: ${b.sku} → ${fixed}`)
        boChanged = true
        return { ...b, sku: fixed }
      }
      return b
    })
    if (boChanged) await blobWrite('data/backorders.json', updatedBackorders)

    // ── 6. Pre-order list blob ───────────────────────────────────────────────
    const preorderList = await blobRead<any[]>('data/preorder-list.json', [])
    let poChanged = false
    const updatedPreorderList = preorderList.map((item: any) => {
      if (needsFix(item.sku || '')) {
        const fixed = fixSku(item.sku)
        changes.push(`preorder-list [${item.id}]: ${item.sku} → ${fixed}`)
        poChanged = true
        return { ...item, sku: fixed }
      }
      return item
    })
    if (poChanged) await blobWrite('data/preorder-list.json', updatedPreorderList)

    return NextResponse.json({ ok: true, totalChanged: changes.length, errors, changes })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
