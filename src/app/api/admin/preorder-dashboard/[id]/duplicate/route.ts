import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { invalidateCache } from '../../route'
import type { PreOrderDashboardItem } from '../../route'

const KEY = 'data/preorder-dashboard.json'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await db.query(
      `SELECT elem FROM json_store, jsonb_array_elements(value::jsonb) elem
       WHERE key = $1 AND elem->>'id' = $2`,
      [KEY, id]
    )
    if (!result.rows.length) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }
    const original: PreOrderDashboardItem = result.rows[0].elem

    const now = new Date().toISOString()
    const duplicate: PreOrderDashboardItem = {
      ...original,
      id: `pod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      customers: [],
      published: false,
      orderPlaced: false,

      createdAt: now,
      updatedAt: now,
    }

    const items = await blobRead<PreOrderDashboardItem[]>(KEY, [])
    items.unshift(duplicate)
    await blobWrite(KEY, items)
    invalidateCache()

    return NextResponse.json(duplicate, { status: 201 })
  } catch (err: any) {
    console.error('[duplicate]', err?.message)
    return NextResponse.json({ error: 'Failed to duplicate' }, { status: 500 })
  }
}
