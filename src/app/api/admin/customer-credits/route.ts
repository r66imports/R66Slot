import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/customer-credits.json'

export interface CreditTransaction {
  id: string
  type: 'overpayment' | 'credit_applied' | 'refund'
  invoiceNumber: string
  amount: number  // positive = added, negative = deducted
  notes?: string
  date: string
}

export interface ClientCreditRecord {
  clientName: string
  balance: number
  transactions: CreditTransaction[]
}

export type CreditStore = Record<string, ClientCreditRecord>

export function clientKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_')
}

async function getStore(): Promise<CreditStore> {
  return await blobRead<CreditStore>(KEY, {})
}

export async function GET() {
  try {
    return NextResponse.json(await getStore())
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, clientName, invoiceNumber, amountPaid = 0, creditApplied = 0, overpayment = 0, notes } = body

    if (!action || !clientName || !invoiceNumber) {
      return NextResponse.json({ error: 'action, clientName and invoiceNumber are required' }, { status: 400 })
    }

    const store = await getStore()
    const key = clientKey(clientName)
    if (!store[key]) store[key] = { clientName, balance: 0, transactions: [] }
    const record = store[key]
    const now = new Date().toISOString()

    const mkId = () => `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

    if (action === 'record_payment') {
      if (creditApplied > 0) {
        record.balance = Math.max(0, record.balance - creditApplied)
        record.transactions.push({ id: mkId(), type: 'credit_applied', invoiceNumber, amount: -creditApplied, notes, date: now })
      }
      if (overpayment > 0) {
        record.balance += overpayment
        record.transactions.push({ id: mkId(), type: 'overpayment', invoiceNumber, amount: overpayment, notes: notes ?? `Overpayment on ${invoiceNumber}`, date: now })
      }
    } else if (action === 'apply_credit' || action === 'refund') {
      record.balance = Math.max(0, record.balance - creditApplied)
      record.transactions.push({ id: mkId(), type: action === 'refund' ? 'refund' : 'credit_applied', invoiceNumber, amount: -creditApplied, notes, date: now })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await blobWrite(KEY, store)
    return NextResponse.json(record)
  } catch (err: any) {
    console.error('[customer-credits]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
