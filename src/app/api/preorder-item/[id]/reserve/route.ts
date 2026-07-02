import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { db } from '@/lib/db'
import { invalidateCache } from '@/app/api/admin/preorder-dashboard/route'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const DASHBOARD_KEY = 'data/preorder-dashboard.json'
const CUSTOMERS_KEY = 'data/customers.json'

async function getItem(id: string): Promise<any | null> {
  const result = await db.query(
    `SELECT elem FROM json_store, jsonb_array_elements(value::jsonb) elem
     WHERE key = $1 AND elem->>'id' = $2`,
    [DASHBOARD_KEY, id]
  )
  return result.rows.length ? result.rows[0].elem : null
}

async function saveItem(id: string, item: any) {
  await db.query(
    `UPDATE json_store
     SET value = (
       SELECT jsonb_agg(
         CASE WHEN elem->>'id' = $2::text THEN $3::jsonb ELSE elem END
       )
       FROM jsonb_array_elements(value::jsonb) elem
     ), updated_at = NOW()
     WHERE key = $1`,
    [DASHBOARD_KEY, id, JSON.stringify(item)]
  )
  invalidateCache()
}

async function getCustomer(id: string): Promise<any | null> {
  const result = await db.query('SELECT value FROM json_store WHERE key = $1', [CUSTOMERS_KEY])
  if (!result.rows.length) return null
  const v = result.rows[0].value
  const customers = Array.isArray(v) ? v : (typeof v === 'string' ? JSON.parse(v) : [])
  return customers.find((c: any) => c.id === id) || null
}

function isLocked(item: any): { locked: boolean; reason: string } {
  if (item.orderPlaced) return { locked: true, reason: 'Order has been placed with the supplier' }
  if (item.cutoffDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const cutoff = new Date(item.cutoffDate); cutoff.setHours(0, 0, 0, 0)
    if (cutoff.getTime() <= today.getTime()) return { locked: true, reason: 'Cut-off date has passed' }
  }
  return { locked: false, reason: '' }
}

async function getAuthCustomer(_request: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('customer_token')?.value
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) as any } catch { return null }
}

// ── POST — reserve (add qty) ───────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decoded = await getAuthCustomer(request)
    if (!decoded) return NextResponse.json({ error: 'Login required' }, { status: 401 })

    const body = await request.json()
    const isReseller = body.source === 'reseller'

    const customer = await getCustomer(decoded.id)
    if (!customer) return NextResponse.json({ error: 'Account not found' }, { status: 404 })

    const item = await getItem(id)
    if (!item) return NextResponse.json({ error: 'Pre-order not found' }, { status: 404 })
    if (!item.published) return NextResponse.json({ error: 'Pre-order not available' }, { status: 404 })

    const customers = item.customers || []
    const existing = customers.findIndex((c: any) => c.email === customer.email || c.id === customer.id)
    const existingQty = existing !== -1 ? (customers[existing].qty || 0) : 0
    const resellerMoq = Math.max(1, parseInt(String(body.resellerMoq ?? 1)) || 1)
    // Once a reseller has already met the MOQ on a prior reservation, additional
    // top-up reservations can be any desired qty — the minimum no longer applies.
    const resellerMin = isReseller && existingQty < resellerMoq ? resellerMoq : 1
    const qtyNum = Math.max(resellerMin, parseInt(body.qty) || resellerMin)

    const lock = isLocked(item)
    const totalReserved = customers.reduce((s: number, c: any) => s + c.qty, 0)
    const moq = item.minOrderQty || 0
    const available = moq > 0 ? Math.max(0, moq - totalReserved) : (item.extraQty || 0)

    if (lock.locked && available <= 0) {
      return NextResponse.json({ error: lock.reason }, { status: 403 })
    }

    const finalQty = lock.locked ? Math.min(qtyNum, available) : qtyNum
    const custName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username || customer.email

    if (existing !== -1) {
      customers[existing].qty += finalQty
      customers[existing].isNew = true
      customers[existing].reservedAt = new Date().toISOString()
    } else {
      customers.push({ id: customer.id, name: custName, email: customer.email, phone: customer.phone || '', qty: finalQty, depositPaid: false, isNew: true, reservedAt: new Date().toISOString() })
    }

    const newTotalReserved = customers.reduce((s: number, c: any) => s + c.qty, 0)
    // Only auto-unpublish when Supplier Order (minOrderQty) is set and fully booked
    const soldOut = moq > 0 && newTotalReserved >= moq

    const updated = {
      ...item,
      customers,
      updatedAt: new Date().toISOString(),
      ...(soldOut ? { published: false, soldOutAt: new Date().toISOString() } : {}),
    }
    await saveItem(id, updated)

    const newTotalQty = existing !== -1 ? customers[existing].qty : finalQty
    return NextResponse.json({ ok: true, totalQty: newTotalQty, customerName: custName, soldOut })
  } catch (err: any) {
    console.error('[reserve POST] error:', err?.message)
    return NextResponse.json({ error: 'Failed to reserve' }, { status: 500 })
  }
}

// ── PATCH — qty adjustment blocked; contact admin to change ──────────────────
export async function PATCH() {
  return NextResponse.json(
    { error: 'Reservations are locked. Please contact us to make changes.' },
    { status: 403 }
  )
}

// ── DELETE — cancel reservation ───────────────────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const decoded = await getAuthCustomer(request)
    if (!decoded) return NextResponse.json({ error: 'Login required' }, { status: 401 })

    const item = await getItem(id)
    if (!item) return NextResponse.json({ error: 'Pre-order not found' }, { status: 404 })

    const lock = isLocked(item)
    if (lock.locked) return NextResponse.json({ error: lock.reason }, { status: 403 })

    const customers = (item.customers || []).filter(
      (c: any) => c.email?.toLowerCase() !== decoded.email?.toLowerCase() && c.id !== decoded.id
    )
    if (customers.length === (item.customers || []).length) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    await saveItem(id, { ...item, customers, updatedAt: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[reserve DELETE] error:', err?.message)
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 })
  }
}
