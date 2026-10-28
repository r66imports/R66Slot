'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { compareSku, formatZAR } from '@/lib/preorder-pricing'
import { documentTotal, settledAmount, balanceDue, MONEY_EPSILON } from '@/lib/payment-math'
import { SkuPreviewModal, SkuThumb, type SkuPreviewItem } from '@/components/supplier/SkuPreview'
import type { CostingAccount, SupplierPreOrder, SupplierPreOrderLine } from '@/types/supplier-preorder'

/** Lines as the GET returns them — priced against the live rate and stock on hand. */
type PricedLine = SupplierPreOrderLine & { quoteZAR: number; quoteBasis: 'retail' | 'estimate' }
type Order = Omit<SupplierPreOrder, 'lines'> & {
  lines: PricedLine[]
  totalZAR: number
  exRate: number
}

type Tab = 'open' | 'archived' | 'bin'

const OPEN_DOC_STATUSES = ['draft', 'sent', 'accepted', 'pending', 'processing', 'active']

const DOC_LABEL: Record<string, string> = {
  quote: 'Quote',
  invoice: 'Invoice',
  salesorder: 'Sales Order',
}

/** Same split as extractSku in order-helpers (server-only, so not importable here). */
const skuOf = (description: string) =>
  (description || '').split(/\s*–\s*|\s+-\s+/)[0]?.trim().toUpperCase() || ''

/** The one price a line is charged at — what the client is shown (clientQuoteZAR). */
const unitPriceOf = (l: PricedLine) => l.quoteZAR || l.estRetailZAR || 0

interface OpenSupplierOrder {
  ref: string
  name: string
  supplierName: string
  lines: number
  /** Raised by us rather than gathered from clients — the merge targets. */
  fromClients: boolean
}

const STATUS_STYLES: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-indigo-100 text-indigo-800',
  quoted: 'bg-purple-100 text-purple-800',
  ordered: 'bg-amber-100 text-amber-800',
  'deposit-paid': 'bg-teal-100 text-teal-800',
  paid: 'bg-green-100 text-green-800',
  archived: 'bg-gray-200 text-gray-700',
}

export default function SupplierPreOrdersAdminPage() {
  const [tab, setTab] = useState<Tab>('open')
  const [orders, setOrders] = useState<Order[]>([])
  const [binCount, setBinCount] = useState(0)
  const [accounts, setAccounts] = useState<CostingAccount[]>([])
  /** Photo + on-hand qty by SKU. Derived server-side, never written back. */
  const [skuInfo, setSkuInfo] = useState<
    Record<
      string,
      {
        imageUrl: string
        qtyAvailable: number
        retailZAR: number
        qtyOnOrder: number
        inInventory: boolean
      }
    >
  >(
    {}
  )
  const [preview, setPreview] = useState<SkuPreviewItem | null>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [supplierOrders, setSupplierOrders] = useState<OpenSupplierOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [mergeRef, setMergeRef] = useState('')
  const [quoteTarget, setQuoteTarget] = useState<Record<string, string>>({})

  /** Returns the freshly priced orders so a caller can act on them straight away. */
  const load = useCallback(async (): Promise<Order[] | null> => {
    setLoading(true)
    let fresh: Order[] | null = null
    try {
      const [poRes, docRes, soRes] = await Promise.all([
        fetch(`/api/admin/supplier-preorders?status=${tab}`),
        fetch('/api/admin/orders/documents'),
        fetch('/api/admin/supplier-orders'),
      ])
      if (poRes.ok) {
        const data = await poRes.json()
        fresh = data.orders || []
        setOrders(fresh || [])
        setAccounts(data.accounts || [])
        setSkuInfo(data.skuInfo || {})
        setBinCount(data.binCount || 0)
      }
      if (docRes.ok) setDocs(await docRes.json())
      if (soRes.ok) {
        const lines: any[] = await soRes.json()
        const map = new Map<string, OpenSupplierOrder>()
        for (const l of lines) {
          const ref = l.supplierOrderRef
          if (!ref) continue
          const cur = map.get(ref)
          const fromClient = (l.source || '').startsWith('supplier-preorder:')
          if (cur) {
            cur.lines++
            cur.fromClients = cur.fromClients && fromClient
          } else {
            map.set(ref, {
              ref,
              name: l.supplierOrderName || ref,
              supplierName: l.supplierName || '',
              lines: 1,
              fromClients: fromClient,
            })
          }
        }
        setSupplierOrders([...map.values()])
      }
    } finally {
      setLoading(false)
    }
    return fresh
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const docById = useMemo(() => new Map(docs.map((d) => [d.id, d])), [docs])

  /** A stored line plus whatever Inventory currently knows about that SKU. */
  const previewFor = (l: SupplierPreOrderLine): SkuPreviewItem => {
    const info = skuInfo[l.sku.trim().toUpperCase()]
    return {
      sku: l.sku,
      brand: l.brand,
      description: l.description,
      imageUrl: info?.imageUrl || '',
      qtyAvailable: info?.qtyAvailable || 0,
      estRetailZAR: l.estRetailZAR,
    }
  }

  /** Saves, reloads, and hands back the fresh orders — null if the save failed. */
  const patchOrder = async (id: string, patch: Partial<SupplierPreOrder>) => {
    const res = await fetch('/api/admin/supplier-preorders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      setNote({ kind: 'err', text: e?.error || 'Could not save' })
      return null
    }
    return (await load()) || []
  }

  const patchLine = (order: Order, lineId: string, patch: Partial<SupplierPreOrderLine>) => {
    const lines = order.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, lines } : o)))
    return lines
  }

  /** Strips the derived price fields so they are never persisted into the request. */
  const toStored = (lines: SupplierPreOrderLine[]): SupplierPreOrderLine[] =>
    lines.map(({ quoteZAR, quoteBasis, ...l }: any) => l)

  /**
   * Keeps the linked quote in step with the request: every quote line whose SKU
   * belongs to this pre order is replaced, in place, by the request's current
   * qty and price, or dropped if that line is now rejected, deleted or invoiced.
   * Lines on the quote from anywhere else are left alone.
   *
   * Quotes only. Once the linked document has become an invoice or sales order
   * it holds stock, and is edited from Orders, never from here.
   */
  const resyncQuote = async (order: Order, goneSkus: string[] = []): Promise<string> => {
    if (!order.quoteId) return ''
    const all: any[] = await fetch('/api/admin/orders/documents')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
    const doc = all.find((d) => d.id === order.quoteId)
    if (!doc) return ` ${order.quoteNumber || 'The linked quote'} was not found — not updated.`
    if (doc.type !== 'quote' || !OPEN_DOC_STATUSES.includes(doc.status)) {
      return ` ${doc.docNumber} is no longer an open quote — not updated.`
    }

    const mine = new Set([...order.lines.map((l) => l.sku.trim().toUpperCase()), ...goneSkus])
    const wanted = new Map<string, PricedLine>()
    for (const l of order.lines) {
      const k = l.sku.trim().toUpperCase()
      if (l.status !== 'rejected' && !wanted.has(k)) wanted.set(k, l)
    }
    const used = new Set<string>()
    const next: any[] = []
    for (const li of doc.lineItems || []) {
      const k = skuOf(li.description)
      if (!mine.has(k)) {
        next.push(li)
        continue
      }
      const l = wanted.get(k)
      if (!l || used.has(k)) continue
      used.add(k)
      next.push({
        ...li,
        description: `${l.sku} – ${l.description || l.brand}`,
        qty: l.qty,
        unitPrice: unitPriceOf(l),
      })
    }
    for (const [k, l] of wanted) {
      if (used.has(k)) continue
      next.push({
        id: `li_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        description: `${l.sku} – ${l.description || l.brand}`,
        qty: l.qty,
        unitPrice: unitPriceOf(l),
      })
    }

    const res = await fetch(`/api/admin/orders/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // A quote never moves stock; both flags make sure it cannot (Rule 59).
      body: JSON.stringify({ lineItems: next, stockAlreadyReserved: true, skipStockAdjust: true }),
    })
    if (!res.ok) return ` Could not update ${doc.docNumber}.`
    await load()
    return ` ${doc.docNumber} updated to match.`
  }

  /** Any save that can move a price or qty — the linked quote follows it. */
  const saveAndResync = async (
    order: Order,
    patch: Partial<SupplierPreOrder>,
    goneSkus: string[] = []
  ) => {
    const fresh = await patchOrder(order.id, patch)
    if (!fresh) return
    const updated = fresh.find((o) => o.id === order.id)
    if (updated?.quoteId) {
      const msg = await resyncQuote(updated, goneSkus)
      setNote({ kind: msg.includes('updated to match') ? 'ok' : 'err', text: `Saved.${msg}` })
    }
  }

  const saveLines = (order: Order, lines: SupplierPreOrderLine[], goneSkus: string[] = []) =>
    saveAndResync(order, { lines: toStored(lines) }, goneSkus)

  const deleteLine = (order: Order, l: PricedLine) => {
    if (
      !confirm(
        `Remove ${l.sku} from ${order.ref}?${order.quoteNumber ? `\n\nIt comes off ${order.quoteNumber} too.` : ''}`
      )
    )
      return
    const lines = order.lines.filter((x) => x.id !== l.id)
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, lines } : o)))
    saveLines(order, lines, [l.sku.trim().toUpperCase()])
  }

  /**
   * Corrects Inventory's on-hand qty for a SKU. A shelf count, logged as
   * 'stocktake' server-side — never intake, never a sale.
   */
  const correctStock = async (sku: string, current: number, raw: string) => {
    const q = parseInt(raw, 10)
    if (!Number.isInteger(q) || q < 0 || q === current) return false
    if (
      !confirm(
        `Change In Stock for ${sku} from ${current} to ${q}?\n\nThis changes Inventory and is logged as a stocktake.`
      )
    )
      return false
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/admin/supplier-preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setStock', sku, quantity: q }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not update stock')
      setNote({ kind: 'ok', text: `${sku} In Stock ${data.before} → ${data.after}.` })
      await load()
      return true
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Could not update stock' })
      return false
    } finally {
      setBusy(false)
    }
  }

  const toggleSelect = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const refsFor = (ids: string[]) => orders.filter((o) => ids.includes(o.id)).map((o) => o.ref)

  /**
   * Delete → the Bin. The client reads the same store, so a binned request
   * disappears from their account straight away; there is no separate
   * client-side copy to clean up. It stays recoverable here until an admin
   * empties the Bin — nothing expires on a timer — which is why this does not
   * need the dire warning a real delete does.
   */
  const binOrders = async (ids: string[]) => {
    if (ids.length === 0) return
    const refs = refsFor(ids)
    const what = refs.length === 1 ? refs[0] : `${refs.length} pre orders (${refs.join(', ')})`
    if (
      !confirm(
        `Move ${what} to the Bin?\n\nIt disappears from the client's account immediately. You can restore it from the Bin at any time — nothing goes for good until you empty the Bin.`
      )
    )
      return

    setBusy(true)
    setNote(null)
    try {
      const res = await fetch(
        `/api/admin/supplier-preorders?ids=${ids.map(encodeURIComponent).join(',')}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not move to the Bin')
      setNote({
        kind: 'ok',
        text: `${(data.refs || refs).join(', ')} moved to the Bin and removed from the client's account. Restorable until you empty the Bin.`,
      })
      setSelected((prev) => prev.filter((x) => !ids.includes(x)))
      setExpanded(null)
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Could not move to the Bin' })
    } finally {
      await load()
      setBusy(false)
    }
  }

  const restoreOrders = async (ids: string[]) => {
    if (ids.length === 0) return
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/admin/supplier-preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', ids }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Restore failed')
      setNote({
        kind: 'ok',
        text: `Restored ${(data.restored || []).join(', ')} — back where it was, and visible to the client again.`,
      })
      setSelected((prev) => prev.filter((x) => !ids.includes(x)))
      setExpanded(null)
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Restore failed' })
    } finally {
      await load()
      setBusy(false)
    }
  }

  /** Permanent. Nothing brings these back. */
  const purgeOrders = async (ids: string[]) => {
    if (ids.length === 0) return
    const refs = refsFor(ids)
    const what = refs.length === 1 ? refs[0] : `${refs.length} pre orders (${refs.join(', ')})`
    if (
      !confirm(
        `Permanently delete ${what}?\n\nThis cannot be undone — there is no further bin to recover it from.`
      )
    )
      return

    setBusy(true)
    setNote(null)
    try {
      const res = await fetch(
        `/api/admin/supplier-preorders?ids=${ids.map(encodeURIComponent).join(',')}&permanent=true`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Delete failed')
      setNote({ kind: 'ok', text: `${(data.refs || refs).join(', ')} deleted for good.` })
      setSelected((prev) => prev.filter((x) => !ids.includes(x)))
      setExpanded(null)
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Delete failed' })
    } finally {
      await load()
      setBusy(false)
    }
  }

  const emptyBin = async () => {
    if (!confirm(`Empty the Bin?\n\nAll ${binCount} binned pre orders are deleted for good. This cannot be undone.`))
      return
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/admin/supplier-preorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'empty' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Could not empty the Bin')
      setNote({ kind: 'ok', text: `Bin emptied — ${(data.purged || []).length} removed for good.` })
      setSelected([])
      setExpanded(null)
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Could not empty the Bin' })
    } finally {
      await load()
      setBusy(false)
    }
  }

  // Selection must stay within one supplier — a supplier order goes to one supplier.
  const selectedOrders = orders.filter((o) => selected.includes(o.id))
  const selectedSuppliers = [...new Set(selectedOrders.map((o) => o.supplierId))]
  const mixedSuppliers = selectedSuppliers.length > 1
  const sendableSupplier = selectedOrders[0]?.supplierName || ''

  const mergeCandidates = supplierOrders.filter(
    (so) => !so.fromClients && (!sendableSupplier || so.supplierName === sendableSupplier)
  )

  const sendToSupplierOrder = async (mode: 'new' | 'existing') => {
    if (selected.length === 0) return
    if (mixedSuppliers) {
      setNote({ kind: 'err', text: 'Those pre orders are for different suppliers. Send one at a time.' })
      return
    }
    if (mode === 'existing' && !mergeRef) {
      setNote({ kind: 'err', text: 'Pick an order to merge into.' })
      return
    }
    setBusy(true)
    setNote(null)
    try {
      const res = await fetch('/api/admin/supplier-preorders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selected, mode, supplierOrderRef: mode === 'existing' ? mergeRef : '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Send failed')
      setNote({
        kind: 'ok',
        text: data.merged
          ? `Merged ${data.linesAdded} lines into ${data.supplierOrderRef}.`
          : `Created ${data.supplierOrderRef} with ${data.linesAdded} lines.`,
      })
      setSelected([])
      setMergeRef('')
      await load()
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Send failed' })
    } finally {
      setBusy(false)
    }
  }

  /**
   * Send to Quote, done from here rather than server-side because that is how
   * the rest of the admin raises documents.
   *
   * stockAlreadyReserved:true is doing real work — without it the documents API
   * runs autoCreateMissingProducts and every client-typed SKU on the request
   * becomes a draft Inventory product, which Rule 59 forbids. A quote is not
   * stockable either way, so the flag only suppresses the product creation.
   */
  const sendToQuote = async (order: Order, mode: 'new' | 'existing') => {
    const active = order.lines.filter((l) => l.status !== 'rejected')
    if (active.length === 0) {
      setNote({ kind: 'err', text: 'Every line on that pre order is rejected.' })
      return
    }
    const unpriced = active.filter((l) => unitPriceOf(l) <= 0)
    if (unpriced.length > 0) {
      setNote({ kind: 'err', text: `Price these first: ${unpriced.map((l) => l.sku).join(', ')}` })
      return
    }

    setBusy(true)
    setNote(null)
    try {
      const lineItems = active.map((l, i) => ({
        id: `li_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        description: `${l.sku} – ${l.description || l.brand}`,
        qty: l.qty,
        // What the client is shown: shelf price for stock on hand, else the estimate.
        unitPrice: unitPriceOf(l),
      }))

      if (mode === 'existing') {
        const targetId = quoteTarget[order.id]
        if (!targetId) throw new Error('Pick a document to add to.')
        const target = docById.get(targetId)
        if (target?.type !== 'quote') throw new Error('That document is not a quote.')
        // appendLineItems merges against the document as it stands on the server.
        // Building the array here from a stale copy is what used to drop lines
        // when two sends raced each other.
        const res = await fetch(`/api/admin/orders/documents/${targetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          // Both flags, though the target is always a quote and so not stockable:
          // stockAlreadyReserved skips the shortfall check, skipStockAdjust stops
          // any stock movement. If the target list is ever widened beyond quotes,
          // these are what keep a pre-order off Inventory (Rule 59).
          body: JSON.stringify({
            appendLineItems: lineItems,
            stockAlreadyReserved: true,
            skipStockAdjust: true,
          }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not update')
        await patchOrder(order.id, {
          status: 'quoted',
          quoteId: targetId,
          quoteNumber: target?.docNumber,
        })
        setNote({ kind: 'ok', text: `Added ${lineItems.length} lines to ${target?.docNumber}.` })
        return
      }

      const nums = docs.map((d) => {
        const m = /^QR66(\d+)$/i.exec(d?.docNumber || '')
        return m ? parseInt(m[1], 10) : 0
      })
      const docNumber = `QR66${Math.max(0, ...nums) + 1}`

      const res = await fetch('/api/admin/orders/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'quote',
          docNumber,
          date: new Date().toISOString().slice(0, 10),
          clientName: order.clientName,
          clientEmail: order.clientEmail || '',
          clientPhone: order.clientPhone || '',
          lineItems,
          notes: [`Supplier Pre Order ${order.ref} — ${order.supplierName}`, order.notes]
            .filter(Boolean)
            .join('\n'),
          status: 'draft',
          depositMode: false,
          stockAlreadyReserved: true,
        }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not create quote')
      const doc = await res.json()
      // A quote that came back without its lines must not badge the pre-order —
      // an unlinked request can be retried, a wrongly-linked one strands the client.
      if (!doc?.id || (doc.lineItems || []).length === 0) {
        throw new Error(`${doc?.docNumber || 'The quote'} was created without lines — check it.`)
      }
      await patchOrder(order.id, { status: 'quoted', quoteId: doc.id, quoteNumber: doc.docNumber })
      setNote({ kind: 'ok', text: `Created ${doc.docNumber} with ${lineItems.length} lines.` })
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Send to quote failed' })
    } finally {
      setBusy(false)
    }
  }

  /** Kept lines the shelf can cover in full — the only ones that may be invoiced. */
  const stockSplit = (order: Order) => {
    const active = order.lines.filter((l) => l.status !== 'rejected')
    const inStock: PricedLine[] = []
    const short: PricedLine[] = []
    for (const l of active) {
      const inf = skuInfo[l.sku.trim().toUpperCase()]
      if (inf?.inInventory && inf.qtyAvailable >= l.qty && l.qty > 0) inStock.push(l)
      else short.push(l)
    }
    return { inStock, short }
  }

  /**
   * Invoice or Sales Order, straight from the request — for what is ON THE SHELF
   * only. Lines short of stock stay on the request to go to the supplier.
   *
   * No stock flags are sent, deliberately: these are real sales of goods we
   * hold, so the documents API takes the stock (and refuses an invoice the shelf
   * cannot cover). The lines that went leave the request and are recorded in
   * `fulfilled`; a linked quote is re-synced so they are not billed twice.
   */
  const sendToStockDoc = async (
    order: Order,
    type: 'invoice' | 'salesorder',
    targetId?: string
  ) => {
    const { inStock, short } = stockSplit(order)
    if (inStock.length === 0) {
      setNote({
        kind: 'err',
        text: `Nothing on ${order.ref} is in stock — a ${DOC_LABEL[type]} cannot be raised. Send it to the supplier or a quote instead.`,
      })
      return
    }
    const target = targetId ? docById.get(targetId) : null
    const what = target ? target.docNumber : `a new ${DOC_LABEL[type]}`
    const list = (ls: PricedLine[]) => ls.map((l) => `• ${l.sku} × ${l.qty}`).join('\n')
    if (
      !confirm(
        `Put these in-stock lines on ${what}?\n\n${list(inStock)}${
          short.length ? `\n\nNot in stock — staying on ${order.ref}:\n${list(short)}` : ''
        }\n\nStock is deducted from Inventory.`
      )
    )
      return

    setBusy(true)
    setNote(null)
    try {
      const lineItems = inStock.map((l, i) => ({
        id: `li_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
        description: `${l.sku} – ${l.description || l.brand}`,
        qty: l.qty,
        unitPrice: unitPriceOf(l),
      }))

      let doc: any
      if (target) {
        const res = await fetch(`/api/admin/orders/documents/${target.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appendLineItems: lineItems }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not update')
        doc = await res.json()
      } else {
        const re = type === 'invoice' ? /^INV(\d+)$/ : /^SO(\d+)$/
        const nums = docs
          .filter((d) => d.type === type)
          .map((d) => {
            const m = re.exec(d?.docNumber || '')
            return m ? parseInt(m[1], 10) : 0
          })
        // Same numbering as Orders: INV0026 onwards, SO001 onwards.
        const docNumber =
          type === 'invoice'
            ? `INV${String(Math.max(25, ...nums) + 1).padStart(4, '0')}`
            : `SO${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
        const res = await fetch('/api/admin/orders/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type,
            docNumber,
            date: new Date().toISOString().slice(0, 10),
            clientName: order.clientName,
            clientEmail: order.clientEmail || '',
            clientPhone: order.clientPhone || '',
            lineItems,
            notes: [`Supplier Pre Order ${order.ref} — ${order.supplierName}`, order.notes]
              .filter(Boolean)
              .join('\n'),
            status: 'draft',
            depositMode: false,
          }),
        })
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Could not create')
        doc = await res.json()
        if (!doc?.id || (doc.lineItems || []).length === 0) {
          throw new Error(`${doc?.docNumber || 'The document'} was created without lines — check it.`)
        }
      }

      const now = new Date().toISOString()
      const movedIds = new Set(inStock.map((l) => l.id))
      const fulfilled = [
        ...(order.fulfilled || []),
        ...inStock.map((l) => ({
          sku: l.sku,
          description: l.description,
          qty: l.qty,
          unitPrice: unitPriceOf(l),
          docId: doc.id,
          docNumber: doc.docNumber,
          docType: doc.type as 'invoice' | 'salesorder',
          at: now,
        })),
      ]
      const fresh = await patchOrder(order.id, {
        lines: toStored(order.lines.filter((l) => !movedIds.has(l.id))),
        fulfilled,
      })
      if (!fresh) {
        throw new Error(
          `${doc.docNumber} has the lines, but ${order.ref} could not be updated — remove them from it by hand.`
        )
      }
      let msg = ''
      const updated = fresh.find((o) => o.id === order.id)
      if (updated?.quoteId) {
        msg = await resyncQuote(updated, inStock.map((l) => l.sku.trim().toUpperCase()))
      }
      setNote({
        kind: 'ok',
        text: `${inStock.length} line${inStock.length === 1 ? '' : 's'} on ${doc.docNumber}.${
          short.length ? ` ${short.length} not in stock — still on ${order.ref}.` : ''
        }${msg}`,
      })
    } catch (e: any) {
      setNote({ kind: 'err', text: e?.message || 'Could not send' })
    } finally {
      setBusy(false)
    }
  }

  /** Payment state read off the linked document — never hand-rolled (payment-math.ts). */
  const paymentState = (order: Order) => {
    const doc = order.quoteId ? docById.get(order.quoteId) : null
    if (!doc) return null
    const total = documentTotal(doc)
    const settled = settledAmount(doc)
    const balance = balanceDue(doc)
    if (settled <= MONEY_EPSILON) return { label: 'Unpaid', tone: 'text-gray-500', total, settled, balance, doc }
    if (balance <= MONEY_EPSILON) {
      return { label: doc.type === 'invoice' ? 'Invoice Paid' : 'Paid', tone: 'text-green-700', total, settled, balance, doc }
    }
    return { label: 'Deposit Paid', tone: 'text-teal-700', total, settled, balance, doc }
  }

  /**
   * Open quotes, invoices and sales orders for this client.
   *
   * A quote takes every kept line and never moves stock. An invoice or sales
   * order is stockable, so it is only ever handed the lines the shelf can cover
   * (sendToStockDoc) — appending a not-yet-ordered line to one would deduct
   * inventory for goods that do not exist, which Rule 59 forbids.
   */
  const openDocsFor = (order: Order) => {
    const email = (order.clientEmail || '').toLowerCase()
    return docs.filter(
      (d) =>
        ['quote', 'invoice', 'salesorder'].includes(d.type) &&
        OPEN_DOC_STATUSES.includes(d.status) &&
        (d.clientEmail?.toLowerCase() === email ||
          d.clientName?.toLowerCase() === order.clientName?.toLowerCase())
    )
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Order[]>()
    for (const o of orders) {
      const key = o.supplierName || 'Unassigned'
      const cur = map.get(key)
      if (cur) cur.push(o)
      else map.set(key, [o])
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [orders])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supplier Pre Orders</h1>
        <p className="text-sm text-gray-600 mt-1">
          What clients have asked us to order. Gathered separately from our own supplier orders and
          merged into one only when you send them. <strong>Requests, not stock</strong> — only
          New Invoice / New Sales Order (in-stock lines only) and correcting In Stock touch
          Inventory.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <strong>Archived</strong> is history — requests that were created and sent to a supplier
          order, kept as a record. <strong>Bin</strong> is deleted: hidden from the client straight
          away, restorable at any time, and cleared only when you empty the Bin.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {(['open', 'archived'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t)
              setSelected([])
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              tab === t ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-700'
            }`}
          >
            {t === 'open' ? 'Open' : 'Archived'}
          </button>
        ))}

        <button
          type="button"
          onClick={() => {
            setTab('bin')
            setSelected([])
          }}
          title="Bin — deleted pre orders, kept until you empty it"
          aria-label={`Bin (${binCount})`}
          className={`ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${
            tab === 'bin'
              ? 'bg-gray-900 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
          }`}
        >
          <span className="text-base leading-none">🗑</span>
          <span>Bin</span>
          {binCount > 0 && (
            <span
              className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                tab === 'bin' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
              }`}
            >
              {binCount}
            </span>
          )}
        </button>
      </div>

      {tab === 'bin' && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <p className="text-sm text-gray-600">
            Deleted pre orders. Already hidden from the client. Restore anything here, or empty the
            Bin when you are sure.
          </p>
          {orders.length > 0 && (
            <button
              type="button"
              onClick={emptyBin}
              disabled={busy}
              className="px-3 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40"
            >
              Empty Bin
            </button>
          )}
        </div>
      )}

      {note && (
        <div
          className={`text-sm rounded-md px-3 py-2 ${
            note.kind === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {note.text}
        </div>
      )}

      {/* Selection bar — sending is open-tab only, deleting works on both */}
      {selected.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-amber-900">
            {selected.length} selected
            {sendableSupplier && !mixedSuppliers ? ` · ${sendableSupplier}` : ''}
          </span>
          {tab === 'open' && mixedSuppliers ? (
            <span className="text-sm text-red-700">
              Different suppliers selected — send one supplier at a time.
            </span>
          ) : tab === 'open' ? (
            <>
              <button
                type="button"
                onClick={() => sendToSupplierOrder('new')}
                disabled={busy}
                className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white disabled:opacity-40"
              >
                New Supplier Order
              </button>
              <span className="text-sm text-amber-900">or merge into</span>
              <select
                value={mergeRef}
                onChange={(e) => setMergeRef(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Select an order…</option>
                {mergeCandidates.map((so) => (
                  <option key={so.ref} value={so.ref}>
                    {so.ref} — {so.name} ({so.lines})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => sendToSupplierOrder('existing')}
                disabled={busy || !mergeRef}
                className="px-3 py-2 text-sm font-medium rounded-md bg-amber-600 text-white disabled:opacity-40"
              >
                Merge
              </button>
            </>
          ) : null}

          <div className="flex items-center gap-3 ml-auto">
            {tab === 'bin' ? (
              <>
                <button
                  type="button"
                  onClick={() => restoreOrders(selected)}
                  disabled={busy}
                  className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white disabled:opacity-40"
                >
                  Restore selected
                </button>
                <button
                  type="button"
                  onClick={() => purgeOrders(selected)}
                  disabled={busy}
                  className="px-3 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40"
                >
                  Delete forever
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => binOrders(selected)}
                disabled={busy}
                className="px-3 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 bg-white hover:bg-red-50 disabled:opacity-40"
              >
                Delete selected
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-sm text-amber-800 underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 py-10 text-center">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-10 text-center">
          <p className="text-sm text-gray-500">
            {tab === 'open'
              ? 'No client pre orders yet.'
              : tab === 'archived'
                ? 'Nothing archived yet.'
                : 'The Bin is empty.'}
          </p>
        </div>
      ) : (
        grouped.map(([supplierName, group]) => (
          <div key={supplierName} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{supplierName}</h2>
              <span className="text-xs text-gray-500">
                {group.length} request{group.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="divide-y divide-gray-100">
              {group.map((order) => {
                const pay = paymentState(order)
                const isOpen = expanded === order.id
                const account = accounts.find((a) => a.id === order.account)
                return (
                  <div key={order.id} className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="w-4 h-4"
                        aria-label={`Select ${order.ref}`}
                      />
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : order.id)}
                        className="flex-1 flex items-center justify-between gap-4 text-left min-w-0"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900">{order.ref}</span>
                          <span className="ml-2 text-sm text-gray-700">{order.clientName}</span>
                          <span className="ml-2 text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString('en-ZA')} ·{' '}
                            {order.lines.length} line{order.lines.length === 1 ? '' : 's'}
                          </span>
                          {order.supplierOrderRef && (
                            <span className="ml-2 text-xs text-amber-700">
                              → {order.supplierOrderRef}
                            </span>
                          )}
                          {order.quoteNumber && (
                            <span className="ml-2 text-xs text-purple-700">{order.quoteNumber}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 whitespace-nowrap">
                          {pay && <span className={`text-xs font-medium ${pay.tone}`}>{pay.label}</span>}
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {order.status.replace('-', ' ')}
                          </span>
                          <span className="font-semibold">{formatZAR(order.totalZAR)}</span>
                          <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>
                    </div>

                    {isOpen && (
                      <div className="mt-4 pl-1 space-y-4">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-3 text-sm">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Costing account</label>
                            <select
                              value={order.account}
                              onChange={(e) => saveAndResync(order, { account: e.target.value as any })}
                              disabled={tab === 'archived'}
                              className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                            >
                              {accounts.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Currency</label>
                            <input
                              defaultValue={order.currency}
                              onBlur={(e) =>
                                e.target.value.toUpperCase() !== order.currency &&
                                saveAndResync(order, { currency: e.target.value.toUpperCase() })
                              }
                              disabled={tab === 'archived'}
                              className="w-20 px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="text-xs text-gray-500 pb-2">
                            1 {order.currency} ={' '}
                            {order.exRate > 0 ? formatZAR(order.exRate) : 'no rate'}
                            {account && (
                              <span className="ml-2">
                                · {account.shippingPct + account.customsPct + account.handlingPct}%
                                landed · {account.markupPct}% markup · {account.vatPct}% VAT
                              </span>
                            )}
                          </div>
                          <div className="ml-auto text-xs text-gray-500 pb-2">
                            {order.clientEmail}
                            {order.clientPhone ? ` · ${order.clientPhone}` : ''}
                          </div>
                        </div>

                        {/* Lines */}
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                                <th className="py-2 pr-3 font-medium">Brand</th>
                                <th className="py-2 pr-2 font-medium sr-only">Photo</th>
                                <th className="py-2 pr-3 font-medium">SKU</th>
                                <th className="py-2 pr-3 font-medium">Description</th>
                                <th className="py-2 pr-3 font-medium text-center whitespace-nowrap">
                                  In Stock
                                </th>
                                <th
                                  className="py-2 pr-3 font-medium text-center whitespace-nowrap"
                                  title="Qty already placed with the supplier, across every client"
                                >
                                  Qty Ordered
                                </th>
                                <th className="py-2 pr-3 font-medium text-center">Qty</th>
                                <th className="py-2 pr-3 font-medium text-right">
                                  Wholesale ({order.currency})
                                </th>
                                <th
                                  className="py-2 pr-3 font-medium text-right whitespace-nowrap"
                                  title="What this sells for on the site today"
                                >
                                  Retail
                                </th>
                                <th className="py-2 pr-3 font-medium text-right">Est. Retail</th>
                                <th
                                  className="py-2 pr-3 font-medium text-right whitespace-nowrap"
                                  title="Qty × the price the client is quoted"
                                >
                                  Line Total
                                </th>
                                <th className="py-2 pr-3 font-medium text-center">Keep</th>
                                <th className="py-2 font-medium sr-only">Remove</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {[...order.lines]
                                .sort((a, b) => compareSku(a.sku, b.sku))
                                .map((l) => (
                                  <tr
                                    key={l.id}
                                    className={l.status === 'rejected' ? 'opacity-40' : undefined}
                                  >
                                    <td className="py-2 pr-3 text-gray-600">{l.brand}</td>
                                    <td className="py-2 pr-2">
                                      <SkuThumb
                                        item={previewFor(l)}
                                        onClick={() => setPreview(previewFor(l))}
                                        size={36}
                                      />
                                    </td>
                                    <td className="py-2 pr-3 font-mono text-xs">
                                      <button
                                        type="button"
                                        onClick={() => setPreview(previewFor(l))}
                                        className="hover:underline"
                                      >
                                        {l.sku}
                                      </button>
                                      {l.isNewSku && (
                                        <span className="ml-1 text-[10px] uppercase bg-yellow-100 text-yellow-800 px-1 rounded">
                                          new
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-3">
                                      <button
                                        type="button"
                                        onClick={() => setPreview(previewFor(l))}
                                        className="mr-1 text-gray-400 hover:text-gray-700"
                                        aria-label={`View ${l.sku}`}
                                        title="View item"
                                      >
                                        🔍
                                      </button>
                                      <input
                                        defaultValue={l.description}
                                        onBlur={(e) =>
                                          e.target.value !== l.description &&
                                          saveLines(
                                            order,
                                            patchLine(order, l.id, { description: e.target.value })
                                          )
                                        }
                                        disabled={tab === 'archived'}
                                        className="w-[calc(100%-1.5rem)] px-2 py-1 border border-transparent hover:border-gray-300 focus:border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="py-2 pr-3 text-center whitespace-nowrap">
                                      {tab === 'open' &&
                                      skuInfo[l.sku.trim().toUpperCase()]?.inInventory ? (
                                        <input
                                          // Re-keyed on the stored figure so a cancelled or
                                          // refused change snaps back to what Inventory holds.
                                          key={`${l.id}-${skuInfo[l.sku.trim().toUpperCase()].qtyAvailable}`}
                                          type="number"
                                          min={0}
                                          defaultValue={skuInfo[l.sku.trim().toUpperCase()].qtyAvailable}
                                          onBlur={async (e) => {
                                            const cur = skuInfo[l.sku.trim().toUpperCase()].qtyAvailable
                                            const ok = await correctStock(l.sku, cur, e.target.value)
                                            if (!ok) e.target.value = String(cur)
                                          }}
                                          disabled={busy}
                                          title="Correct the Inventory count — logged as a stocktake"
                                          className={`w-14 px-1 py-1 border border-transparent hover:border-gray-300 focus:border-gray-300 rounded text-sm text-center font-semibold ${
                                            skuInfo[l.sku.trim().toUpperCase()].qtyAvailable > 0
                                              ? 'text-green-700'
                                              : 'text-gray-400'
                                          }`}
                                        />
                                      ) : (skuInfo[l.sku.trim().toUpperCase()]?.qtyAvailable || 0) > 0 ? (
                                        <span className="text-green-700 font-semibold">
                                          {skuInfo[l.sku.trim().toUpperCase()].qtyAvailable}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400" title="Not in Inventory">0</span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-3 text-center whitespace-nowrap">
                                      {(skuInfo[l.sku.trim().toUpperCase()]?.qtyOnOrder || 0) > 0 ? (
                                        <span className="text-amber-700 font-semibold">
                                          {skuInfo[l.sku.trim().toUpperCase()].qtyOnOrder}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">0</span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-3 text-center">
                                      <input
                                        type="number"
                                        min={1}
                                        defaultValue={l.qty}
                                        onBlur={(e) => {
                                          const q = Math.max(1, parseInt(e.target.value, 10) || 1)
                                          if (q !== l.qty)
                                            saveLines(order, patchLine(order, l.id, { qty: q }))
                                        }}
                                        disabled={tab === 'archived'}
                                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                                      />
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        defaultValue={l.wholesalePrice}
                                        onBlur={(e) => {
                                          const w = Number(e.target.value) || 0
                                          if (w !== l.wholesalePrice)
                                            saveLines(
                                              order,
                                              patchLine(order, l.id, { wholesalePrice: w })
                                            )
                                        }}
                                        disabled={tab === 'archived' || l.priceLocked}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right disabled:bg-gray-100"
                                      />
                                    </td>
                                    <td className="py-2 pr-3 text-right text-gray-600 whitespace-nowrap">
                                      {(skuInfo[l.sku.trim().toUpperCase()]?.retailZAR || 0) > 0
                                        ? formatZAR(skuInfo[l.sku.trim().toUpperCase()].retailZAR)
                                        : '—'}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-semibold">
                                      {l.estRetailZAR > 0 ? formatZAR(l.estRetailZAR) : '—'}
                                      {l.priceLocked && (
                                        <span className="ml-1 text-[10px] uppercase text-green-700">
                                          locked
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                                      {l.status === 'rejected'
                                        ? '—'
                                        : unitPriceOf(l) > 0
                                          ? formatZAR(l.qty * unitPriceOf(l))
                                          : '—'}
                                    </td>
                                    <td className="py-2 pr-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={l.status !== 'rejected'}
                                        onChange={(e) =>
                                          saveLines(
                                            order,
                                            patchLine(order, l.id, {
                                              status: e.target.checked ? 'active' : 'rejected',
                                            })
                                          )
                                        }
                                        disabled={tab === 'archived'}
                                        className="w-4 h-4"
                                        aria-label={`Keep ${l.sku}`}
                                      />
                                    </td>
                                    <td className="py-2 text-center">
                                      {tab === 'open' && (
                                        <button
                                          type="button"
                                          onClick={() => deleteLine(order, l)}
                                          disabled={busy}
                                          title={`Remove ${l.sku} from this pre order`}
                                          aria-label={`Remove ${l.sku}`}
                                          className="text-gray-400 hover:text-red-600 disabled:opacity-40"
                                        >
                                          🗑
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>

                        {(order.fulfilled || []).length > 0 && (
                          <div className="text-xs bg-green-50 border border-green-200 rounded px-3 py-2 text-green-900">
                            <span className="font-medium">Supplied from stock: </span>
                            {(order.fulfilled || [])
                              .map((f) => `${f.sku} × ${f.qty} → ${f.docNumber}`)
                              .join(' · ')}
                          </div>
                        )}

                        {order.notes && (
                          <p className="text-xs text-gray-600 italic">Client note: {order.notes}</p>
                        )}

                        {/* Payment */}
                        {pay && (
                          <div className="text-xs bg-gray-50 border border-gray-200 rounded px-3 py-2 flex flex-wrap gap-4">
                            <span>
                              {pay.doc.docNumber} total{' '}
                              <strong>{formatZAR(pay.total)}</strong>
                            </span>
                            <span>
                              settled <strong>{formatZAR(pay.settled)}</strong>
                            </span>
                            <span>
                              balance <strong>{formatZAR(pay.balance)}</strong>
                            </span>
                            <span className={pay.tone}>{pay.label}</span>
                          </div>
                        )}

                        {/* Actions */}
                        {tab === 'open' && (
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => sendToQuote(order, 'new')}
                              disabled={busy}
                              className="px-3 py-2 text-sm font-medium rounded-md bg-purple-600 text-white disabled:opacity-40"
                            >
                              New Quote
                            </button>
                            <button
                              type="button"
                              onClick={() => sendToStockDoc(order, 'invoice')}
                              disabled={busy || stockSplit(order).inStock.length === 0}
                              title={
                                stockSplit(order).inStock.length === 0
                                  ? 'Nothing on this pre order is in stock'
                                  : 'In-stock lines only — the rest stay here for the supplier'
                              }
                              className="px-3 py-2 text-sm font-medium rounded-md bg-blue-600 text-white disabled:opacity-40"
                            >
                              New Invoice
                            </button>
                            <button
                              type="button"
                              onClick={() => sendToStockDoc(order, 'salesorder')}
                              disabled={busy || stockSplit(order).inStock.length === 0}
                              title={
                                stockSplit(order).inStock.length === 0
                                  ? 'Nothing on this pre order is in stock'
                                  : 'In-stock lines only — the rest stay here for the supplier'
                              }
                              className="px-3 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white disabled:opacity-40"
                            >
                              New Sales Order
                            </button>
                            <select
                              value={quoteTarget[order.id] || ''}
                              onChange={(e) =>
                                setQuoteTarget((p) => ({ ...p, [order.id]: e.target.value }))
                              }
                              className="px-2 py-2 border border-gray-300 rounded-md text-sm"
                            >
                              <option value="">Add to existing…</option>
                              {(['quote', 'invoice', 'salesorder'] as const).map((t) => {
                                const list = openDocsFor(order).filter((d) => d.type === t)
                                if (list.length === 0) return null
                                const noStock = t !== 'quote' && stockSplit(order).inStock.length === 0
                                return (
                                  <optgroup
                                    key={t}
                                    label={`${DOC_LABEL[t]}s${t === 'quote' ? '' : ' — in-stock lines only'}`}
                                  >
                                    {list.map((d) => (
                                      <option key={d.id} value={d.id} disabled={noStock}>
                                        {d.docNumber}
                                      </option>
                                    ))}
                                  </optgroup>
                                )
                              })}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                const t = docById.get(quoteTarget[order.id])
                                if (t?.type === 'invoice' || t?.type === 'salesorder')
                                  sendToStockDoc(order, t.type, t.id)
                                else sendToQuote(order, 'existing')
                              }}
                              disabled={busy || !quoteTarget[order.id]}
                              className="px-3 py-2 text-sm font-medium rounded-md border border-purple-300 text-purple-700 disabled:opacity-40"
                            >
                              Add
                            </button>

                            <span className="mx-1 text-gray-300">|</span>

                            {order.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => patchOrder(order.id, { status: 'paid' })}
                                disabled={busy}
                                className="px-3 py-2 text-sm font-medium rounded-md bg-green-600 text-white disabled:opacity-40"
                              >
                                Mark as Paid
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Archive ${order.ref}? It becomes a read-only record and cannot be edited or sent again.`
                                  )
                                )
                                  patchOrder(order.id, { status: 'archived' })
                              }}
                              disabled={busy}
                              className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 disabled:opacity-40"
                            >
                              Archive
                            </button>
                            <button
                              type="button"
                              onClick={() => binOrders([order.id])}
                              disabled={busy}
                              className="px-3 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 ml-auto"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        )}
                        {tab === 'archived' && (
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs text-gray-500 italic">
                              Archived{' '}
                              {order.archivedAt
                                ? new Date(order.archivedAt).toLocaleDateString('en-ZA')
                                : ''}
                              {order.supplierOrderRef
                                ? ` — sent to ${order.supplierOrderRef}.`
                                : ' — history of what was created.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => binOrders([order.id])}
                              disabled={busy}
                              className="px-3 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
                            >
                              🗑 Delete
                            </button>
                          </div>
                        )}
                        {tab === 'bin' && (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-gray-500 italic">
                              Deleted{' '}
                              {order.deletedAt
                                ? new Date(order.deletedAt).toLocaleDateString('en-ZA')
                                : ''}
                              {order.statusBeforeDelete && (
                                <span> · was {order.statusBeforeDelete.replace('-', ' ')}</span>
                              )}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => restoreOrders([order.id])}
                                disabled={busy}
                                className="px-3 py-2 text-sm font-medium rounded-md bg-gray-900 text-white disabled:opacity-40"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => purgeOrders([order.id])}
                                disabled={busy}
                                className="px-3 py-2 text-sm font-medium rounded-md border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
                              >
                                Delete forever
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      <SkuPreviewModal item={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
