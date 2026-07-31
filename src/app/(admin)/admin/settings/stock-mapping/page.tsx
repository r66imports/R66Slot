'use client'

import { useState } from 'react'
import Link from 'next/link'

type Impact = 'neutral' | 'deduct' | 'add' | 'source'

const IMPACT_STYLE: Record<Impact, { border: string; bg: string; badgeBg: string; badgeText: string; label: string }> = {
  neutral: { border: 'border-gray-300', bg: 'bg-white', badgeBg: 'bg-gray-100', badgeText: 'text-gray-600', label: 'No stock impact' },
  deduct:  { border: 'border-red-300',  bg: 'bg-red-50', badgeBg: 'bg-red-100', badgeText: 'text-red-700', label: 'Deducts stock' },
  add:     { border: 'border-green-300', bg: 'bg-green-50', badgeBg: 'bg-green-100', badgeText: 'text-green-700', label: 'Adds / restores stock' },
  source:  { border: 'border-purple-400', bg: 'bg-purple-50', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', label: 'Source of truth' },
}

function Node({ impact, icon, title, subtitle, children, defaultOpen }: {
  impact: Impact; icon: string; title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const s = IMPACT_STYLE[impact]
  return (
    <div className={`rounded-2xl border-2 ${s.border} ${s.bg} shadow-sm overflow-hidden`}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-black/[0.02] transition-colors">
        <span className="text-2xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{title}</h3>
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${s.badgeBg} ${s.badgeText}`}>{s.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <span className={`text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-5 pb-4 pt-0 text-sm text-gray-700 space-y-1.5 border-t border-black/5 mt-0 [&>ul]:mt-2">{children}</div>}
    </div>
  )
}

function Arrow({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-4 bg-gray-300" />
      <span className="text-gray-300 text-lg leading-none -my-1">▼</span>
      {label && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1">{label}</span>}
      <div className="w-0.5 h-4 bg-gray-300" />
    </div>
  )
}

export default function StockMappingPage() {
  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 block mb-1">&larr; Site Settings</Link>
        <h1 className="text-2xl font-bold text-gray-900">Stock Flow Mapping</h1>
        <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
          How a unit of stock actually moves through Route 66 Imports — from a customer reservation on the Pre-Order Dashboard,
          through Quotes, Sales Orders, Invoices and the Worksheet, to a real quantity sitting in Inventory. Click any card to expand it.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-8">
        {(Object.keys(IMPACT_STYLE) as Impact[]).map(k => {
          const s = IMPACT_STYLE[k]
          return (
            <span key={k} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.badgeBg} ${s.badgeText} border ${s.border}`}>
              {s.label}
            </span>
          )
        })}
      </div>

      {/* ── Flow diagram ── */}
      <div className="space-y-0">

        <Node impact="neutral" icon="🗂️" title="Pre-Order Dashboard" subtitle="Customer reservations against a SKU — not real stock yet" defaultOpen>
          <ul className="list-disc pl-5 space-y-1">
            <li>A dashboard item just tracks a SKU, price, supplier and a list of customers with a reserved qty each — it never touches Product quantity.</li>
            <li>Customers accumulate against the item until it hits its <strong>Supplier Order qty</strong> (minOrderQty), at which point it auto-unpublishes.</li>
            <li>Three ways an item leaves this stage — shown below.</li>
          </ul>
        </Node>

        <Arrow />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Node impact="neutral" icon="📤" title="Send To (per customer)" subtitle="Create / append a Quote, SO or Invoice">
            <ul className="list-disc pl-5 space-y-1">
              <li>Per-customer &ldquo;Send to&rdquo; action — <em>Create New</em> makes a fresh document, <em>Add to Existing</em> appends to an open one.</li>
              <li>The dashboard customer row is tagged with <code>linkedDocId</code> so it can be traced back later.</li>
            </ul>
          </Node>
          <Node impact="neutral" icon="📋" title="Send to SO (bulk)" subtitle="Posts total qty to Back Orders / Supplier Orders">
            <ul className="list-disc pl-5 space-y-1">
              <li>Uses the Supplier Order qty (or summed customer qty) and the item&rsquo;s wholesale price/currency.</li>
              <li>Creates a Back Order record — no <code>linkedDocId</code> tagging, this path is for ordering stock from the supplier, not billing a customer.</li>
            </ul>
          </Node>
          <Node impact="neutral" icon="🧮" title="Send to Worksheet" subtitle="Links the item to a costing Worksheet">
            <ul className="list-disc pl-5 space-y-1">
              <li>Creates/links a Worksheet row and stamps <code>linkedWsId</code> on the dashboard item.</li>
              <li>The item shows a &ldquo;🧮 WS&rdquo; shortcut back to that sheet.</li>
            </ul>
          </Node>
        </div>

        <Arrow />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <div className="space-y-0">
            <Node impact="neutral" icon="📄" title="Quote" subtitle="Never touches stock">
              <p>Quotes are pure paperwork — creating, editing or deleting one has zero effect on Product quantity.</p>
            </Node>
            <Arrow label="Send to SO / Invoice" />
            <Node impact="deduct" icon="🧾" title="Sales Order → Invoice" subtitle="Deducts stock the moment it&rsquo;s created">
              <ul className="list-disc pl-5 space-y-1">
                <li>Creating a Sales Order or Invoice immediately subtracts the line-item qty from <code>Product.quantity</code> — gated by Site Rule <em>Invoice Stock Deduction</em>.</li>
                <li>Editing quantities reverses the old qty and applies the new one. Archiving, cancelling or deleting <strong>restores</strong> the stock.</li>
                <li>If stock hits 0 after a deduction, Site Rule <em>Auto Pre-Order on OOS</em> can auto-flag that product as pre-order — a separate mechanism from the Pre-Order Dashboard above.</li>
              </ul>
            </Node>
          </div>
          <div className="space-y-0">
            <Node impact="neutral" icon="🏭" title="Back Order / Supplier Order" subtitle="Organises what to order from each supplier">
              <p>Holds phase flags (Quote / Sales Order / Invoice numbers) that mirror progress on the Orders page, and feeds the Worksheet for costing.</p>
            </Node>
            <Arrow label="costed in" />
            <Node impact="neutral" icon="📊" title="Worksheet — Update Products" subtitle="Writes metadata only, never quantity">
              <p>Pushes Category (Brand), Item Category (Unit) and Sales/Purchase Account onto the matching Product record. New SKUs are created quietly with qty 0. <strong>Quantity is never touched here.</strong></p>
            </Node>
          </div>
        </div>

        <Arrow label="Send to Inventory" />

        <Node impact="add" icon="📦" title="Worksheet — Send to Inventory" subtitle="This is where stock actually arrives">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Existing SKU:</strong> overwrites <code>Product.quantity</code> with the Worksheet qty (a shipment arriving) — this replaces the number, it does not add to it.</li>
            <li><strong>New SKU:</strong> opens a confirmation modal, then creates the Product with that starting quantity.</li>
          </ul>
        </Node>

        <Arrow />

        <Node impact="source" icon="🏷️" title="Inventory / Products" subtitle="The single source of truth for stock">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Total</strong> = the real <code>Product.quantity</code> in the database — only Invoice/SO deduction and Worksheet &ldquo;Send to Inventory&rdquo; ever change this number.</li>
            <li><strong>Reserved</strong> (amber badge) = sum of qty across currently-open <em>Sales Orders only</em> — Invoices, Quotes and Pre-Order Dashboard reservations are <em>not</em> counted here.</li>
            <li><strong>Shop</strong> = Total − Reserved.</li>
          </ul>
        </Node>
      </div>

      {/* ── Deletion callout ── */}
      <div className="mt-10 rounded-2xl border-2 border-amber-400 bg-amber-50 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🗑️</span>
          <h2 className="text-lg font-bold text-amber-900">What happens when you delete a Pre-Order Dashboard item directly</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-700 mb-1.5">✓ Safe — untouched</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Product / Inventory quantity — the dashboard item never held real stock, so there is nothing to reverse.</li>
              <li>Any Quotes, Sales Orders or Invoices already created from it — they keep existing exactly as they are.</li>
              <li>Any Back Orders or Worksheet rows already created from it.</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-red-700 mb-1.5">✕ Lost — no undo</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>The dashboard tracking row itself (SKU, price, supplier, ETA, notes).</li>
              <li>Every customer reservation on that item that has <em>not yet</em> been converted into a Quote/SO/Invoice — they simply disappear with the item.</li>
              <li>The <code>linkedDocId</code> / <code>linkedWsId</code> trail back to any documents already created — those documents become orphaned from the dashboard (still fine on their own, just no longer visible from here).</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-amber-800 mt-4 bg-white/60 border border-amber-200 rounded-lg px-3 py-2">
          In short: deleting a Pre-Order Dashboard item is safe for stock and accounting — it can never desync Inventory or an existing invoice. The only real risk is losing track of reservations that hadn&rsquo;t been billed yet, so double-check the customer list before deleting an item that still shows unconverted names.
        </p>
      </div>
    </div>
  )
}
