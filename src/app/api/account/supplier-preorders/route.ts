import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { blobRead, blobAppendArrayItems } from '@/lib/blob-storage'
import { getRates, rateFor } from '@/lib/exchange-rates'
import {
  accountById,
  calcEstRetailZAR,
  isLocalSupplierCurrency,
  lineEstRetailZAR,
  DEFAULT_COSTING_ACCOUNTS,
} from '@/lib/preorder-pricing'
import { findBySkus } from '@/lib/supplier-catalogue'
import type {
  CostingAccount,
  SupplierPreOrder,
  SupplierPreOrderLine,
} from '@/types/supplier-preorder'
import type { SupplierContact } from '@/app/api/admin/supplier-contacts/route'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const KEY = 'data/supplier-preorders.json'

async function requireCustomer() {
  const token = (await cookies()).get('customer_token')?.value
  if (!token) return null
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    return null
  }
}

function nextRef(existing: SupplierPreOrder[]): number {
  const highest = existing.reduce((max, o) => {
    const n = parseInt((o.ref || '').replace(/\D/g, ''), 10)
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return highest + 1
}

/** GET — this customer's own pre-orders, re-priced against the live rate. */
export async function GET(_request: NextRequest) {
  const decoded = await requireCustomer()
  if (!decoded) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const email = decoded.email?.toLowerCase()

  try {
    const [all, savedAccounts, rateData] = await Promise.all([
      blobRead<SupplierPreOrder[]>(KEY, []),
      blobRead<CostingAccount[]>('data/costing-accounts.json', []),
      getRates(),
    ])
    const accounts = savedAccounts.length > 0 ? savedAccounts : DEFAULT_COSTING_ACCOUNTS

    const mine = all
      // A binned request is gone as far as the client is concerned, even though
      // admin can still recover it for 30 days.
      .filter(
        (o) =>
          !o.deletedAt && (o.customerId === decoded.id || o.clientEmail?.toLowerCase() === email)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Strip wholesale prices and re-price unlocked lines on the way out.
    const safe = mine.map((o) => {
      const account = accountById(accounts, o.account)
      const rate = rateFor(rateData.rates, o.currency)
      const lines = o.lines.map((l) => ({
        id: l.id,
        brand: l.brand,
        sku: l.sku,
        description: l.description,
        qty: l.qty,
        status: l.status,
        isNewSku: l.isNewSku,
        priceLocked: l.priceLocked,
        estRetailZAR: Math.round(lineEstRetailZAR(l, rate, account) * 100) / 100,
      }))
      const total = lines
        .filter((l) => l.status !== 'rejected')
        .reduce((s, l) => s + l.qty * l.estRetailZAR, 0)
      return {
        id: o.id,
        ref: o.ref,
        supplierName: o.supplierName,
        status: o.status,
        notes: o.notes,
        quoteNumber: o.quoteNumber,
        createdAt: o.createdAt,
        submittedAt: o.submittedAt,
        lines,
        totalZAR: Math.round(total * 100) / 100,
      }
    })

    return NextResponse.json(safe)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

/**
 * POST — submit a sheet.
 * Body: { lines: [{ catalogueItemId?, brand, sku, description, qty }], notes, phone }
 *
 * Prices are recomputed server-side from the catalogue; whatever the browser
 * sent as a price is ignored. Lines are split into one pre-order per supplier so
 * each can be pushed to that supplier's order independently.
 */
export async function POST(request: NextRequest) {
  const decoded = await requireCustomer()
  if (!decoded) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await request.json()
    const incoming: any[] = Array.isArray(body.lines) ? body.lines : []
    const usable = incoming.filter((l) => (l?.sku || '').trim() && Number(l?.qty) > 0)
    if (usable.length === 0) {
      return NextResponse.json({ error: 'Add at least one item with a quantity' }, { status: 400 })
    }

    // Resolve every submitted SKU against Inventory + the wholesale catalogue in
    // one pass. Prices are recomputed here; whatever the browser sent is ignored.
    const [matches, suppliers, savedAccounts, existing, rateData] = await Promise.all([
      findBySkus(usable.map((l) => String(l.sku || ''))),
      blobRead<SupplierContact[]>('data/supplier-contacts.json', []),
      blobRead<CostingAccount[]>('data/costing-accounts.json', []),
      blobRead<SupplierPreOrder[]>(KEY, []),
      getRates(),
    ])
    const accounts = savedAccounts.length > 0 ? savedAccounts : DEFAULT_COSTING_ACCOUNTS
    const supplierById = new Map(suppliers.map((s) => [s.id, s]))
    // A client-typed SKU carries no supplier, so fall back to whoever owns the brand.
    const supplierByBrand = new Map<string, SupplierContact>()
    for (const s of suppliers) {
      for (const b of s.brands || []) supplierByBrand.set(b.toLowerCase(), s)
    }

    const now = new Date().toISOString()
    const groups = new Map<string, SupplierPreOrderLine[]>()

    for (const raw of usable) {
      const sku = String(raw.sku || '').trim().toUpperCase()
      const match = matches.get(sku)
      const brand = (match?.brand || raw.brand || '').trim()
      const supplier =
        (match?.supplierId ? supplierById.get(match.supplierId) : undefined) ||
        supplierByBrand.get(brand.toLowerCase())
      const supplierId = match?.supplierId || supplier?.id || ''
      const currency = (match?.currency || supplier?.preferredCurrency || 'EUR').toUpperCase()
      const account = accountById(accounts, supplier?.defaultAccount)
      const rate = rateFor(rateData.rates, currency)
      const wholesale = match?.wholesalePrice || 0

      // A wholesale price prices through the calculator; an Inventory item with
      // none — or any local supplier, who incurred no shipping or customs —
      // keeps the retail we already sell it for. Neither means admin prices it
      // by hand, and the client sees "On request".
      const calculated = isLocalSupplierCurrency(currency)
        ? 0
        : calcEstRetailZAR(wholesale, rate, account)
      const estRetailZAR =
        calculated > 0 ? calculated : match?.estRetailZAR || 0

      const line: SupplierPreOrderLine = {
        id: `spl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        catalogueItemId: match && !match.id.startsWith('p:') ? match.id : undefined,
        brand,
        sku: match?.sku || sku,
        description: (match?.description || raw.description || '').trim(),
        qty: Math.max(1, Math.floor(Number(raw.qty) || 1)),
        wholesalePrice: wholesale,
        currency,
        estRetailZAR: Math.round(estRetailZAR * 100) / 100,
        exRateAtSubmit: rate,
        priceLocked: false,
        status: 'active',
        isNewSku: !match,
      }

      const key = supplierId || `__unassigned__${brand.toLowerCase()}`
      const bucket = groups.get(key)
      if (bucket) bucket.push(line)
      else groups.set(key, [line])
    }

    let seq = nextRef(existing)
    const created: SupplierPreOrder[] = []

    for (const [key, lines] of groups) {
      const supplierId = key.startsWith('__unassigned__') ? '' : key
      const supplier = supplierById.get(supplierId)
      created.push({
        id: `spo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        ref: `SPO${String(seq++).padStart(4, '0')}`,
        customerId: decoded.id || '',
        clientName: [decoded.firstName, decoded.lastName].filter(Boolean).join(' ') || decoded.email || '',
        clientEmail: decoded.email || '',
        clientPhone: (body.phone || decoded.phone || '').trim(),
        supplierId,
        supplierName: supplier?.name || lines[0]?.brand || 'Unassigned',
        currency: lines[0]?.currency || 'EUR',
        account: supplier?.defaultAccount || 'JDM',
        status: 'submitted',
        lines,
        notes: (body.notes || '').trim(),
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
      })
    }

    await blobAppendArrayItems(KEY, created)

    return NextResponse.json(
      { success: true, orders: created.map((o) => ({ id: o.id, ref: o.ref, supplierName: o.supplierName, lines: o.lines.length })) },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to submit' }, { status: 500 })
  }
}
