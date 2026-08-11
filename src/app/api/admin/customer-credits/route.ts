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

function clientKey(name: string): string {
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const qClientName = searchParams.get('clientName')
    const transactionId = searchParams.get('transactionId')

    // Per-transaction delete: query params clientName + transactionId. Removes a single
    // erroneous entry without wiping genuine credits the client also holds.
    if (qClientName && transactionId) {
      const store = await getStore()
      const key = clientKey(qClientName)
      const record = store[key]
      if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const removed = record.transactions.find((t) => t.id === transactionId)
      record.transactions = record.transactions.filter((t) => t.id !== transactionId)
      record.balance = Math.max(0, record.transactions.reduce((s, t) => s + t.amount, 0))
      await blobWrite(KEY, store)

      // Clear the stale overpaymentCredit on the source document too, or the field survives
      // on the doc, keeps rendering a Credit badge, and can resurrect the balance.
      if (removed && removed.type === 'overpayment' && removed.invoiceNumber) {
        try {
          const docs: any[] = await blobRead<any[]>('data/order-documents.json', [])
          let changed = false
          for (const doc of docs) {
            if (doc.docNumber === removed.invoiceNumber && (doc.overpaymentCredit || 0) > 0) {
              doc.overpaymentCredit = 0
              doc.showCreditOnInvoice = false
              doc.updatedAt = new Date().toISOString()
              changed = true
            }
          }
          if (changed) await blobWrite('data/order-documents.json', docs)
        } catch { /* non-fatal */ }
      }
      return NextResponse.json(record)
    }

    // Full balance reset: body contains { clientName }
    const { clientName } = await request.json().catch(() => ({ clientName: qClientName }))
    if (!clientName) return NextResponse.json({ error: 'clientName required' }, { status: 400 })
    const store = await getStore()
    const key = clientKey(clientName)
    if (store[key]) {
      store[key].balance = 0
      store[key].transactions = []
      await blobWrite(KEY, store)
    }
    // Also zero overpaymentCredit on every document for this client — quotes and sales
    // orders included, not just invoices. Deposit-mode quotes are where phantom credits
    // are minted, so skipping them left the stale field behind to resurrect the balance
    // and to keep showing a Credit badge on the doc after the ledger was cleared.
    try {
      const docs: any[] = await blobRead<any[]>('data/order-documents.json', [])
      let changed = false
      for (const doc of docs) {
        if (
          clientKey(doc.clientName || '') === key &&
          (doc.overpaymentCredit || 0) > 0
        ) {
          doc.overpaymentCredit = 0
          doc.showCreditOnInvoice = false
          doc.updatedAt = new Date().toISOString()
          changed = true
        }
      }
      if (changed) await blobWrite('data/order-documents.json', docs)
    } catch { /* non-fatal */ }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
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
      // Only write if there is something to record — prevents accidental zero-balance record creation
      if (creditApplied <= 0 && overpayment <= 0) {
        return NextResponse.json(record)
      }
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
