'use client'

import { useState } from 'react'
import Link from 'next/link'

type Kind = 'neutral' | 'money' | 'stock' | 'lock' | 'source'

const KIND_STYLE: Record<Kind, { border: string; bg: string; badgeBg: string; badgeText: string; label: string }> = {
  source:  { border: 'border-purple-400', bg: 'bg-purple-50', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', label: 'Source of truth' },
  neutral: { border: 'border-gray-300',   bg: 'bg-white',     badgeBg: 'bg-gray-100',   badgeText: 'text-gray-600',   label: 'No stock impact' },
  money:   { border: 'border-amber-300',  bg: 'bg-amber-50',  badgeBg: 'bg-amber-100',  badgeText: 'text-amber-700',  label: 'Money moves' },
  stock:   { border: 'border-red-300',    bg: 'bg-red-50',    badgeBg: 'bg-red-100',    badgeText: 'text-red-700',    label: 'Stock moves' },
  lock:    { border: 'border-blue-300',   bg: 'bg-blue-50',   badgeBg: 'bg-blue-100',   badgeText: 'text-blue-700',   label: 'Locks the item' },
}

function Node({ kind, icon, title, subtitle, children, defaultOpen }: {
  kind: Kind; icon: string; title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  const s = KIND_STYLE[kind]
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

function Stage({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mt-8 mb-3">
      <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{n}</span>
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h2>
    </div>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return <Link href="/admin/settings/site-rules" className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap">{children}</Link>
}

export default function PreOrdersFlowPage() {
  return (
    <div className="max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="mb-6">
        <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 block mb-1">&larr; Site Settings</Link>
        <h1 className="text-2xl font-bold text-gray-900">Pre-Orders Flow</h1>
        <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
          The whole journey of a pre-order &mdash; from creating the item, through customer reservations
          and deposits, ordering from the supplier, costing, goods arriving, and finally billing the
          customer. Click any card to expand it.
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {(Object.keys(KIND_STYLE) as Kind[]).map(k => {
          const s = KIND_STYLE[k]
          return (
            <span key={k} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.badgeBg} ${s.badgeText} border ${s.border}`}>
              {s.label}
            </span>
          )
        })}
      </div>

      {/* The one big idea */}
      <div className="rounded-2xl border-2 border-gray-900 bg-gray-900 text-white px-5 py-4 mt-5">
        <h3 className="font-bold mb-1">The one thing to hold on to</h3>
        <p className="text-sm text-gray-200">
          A reservation is <strong>not stock</strong>. Nothing a customer does on the storefront ever moves
          inventory. Stock only moves when a Sales Order or an Invoice is raised &mdash; everything before
          that is a promise, not a unit on the shelf.
        </p>
      </div>

      <Stage n={1} title="The item is created" />

      <Node kind="source" icon="🗂️" title="Pre-Order Dashboard item" subtitle="The record everything else hangs off" defaultOpen>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>What it holds:</strong> SKU, description, brand, supplier, ETA, cut-off date, images.</li>
          <li><strong>Pricing:</strong> wholesale price and currency, supplier SRP and discount, estimated retail. A second pricing tier can be set for larger quantities.</li>
          <li><strong>Supplier Order qty</strong> &mdash; the number that must be booked before you place the order with the supplier. This one field drives the auto-unpublish in stage 2, so leaving it at 0 means the item never closes itself off.</li>
          <li><strong>Published</strong> &mdash; the toggle that puts it in front of customers on the storefront.</li>
          <li>Creating an item touches no product and no inventory. It is a plan to buy, nothing more.</li>
        </ul>
      </Node>

      <Arrow label="published to the storefront" />

      <Stage n={2} title="Customers reserve" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <Node kind="neutral" icon="🌐" title="Customer books online" subtitle="Storefront, logged in" defaultOpen>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pre-order items route to <strong>/book</strong>, not the normal checkout &mdash; a mixed basket shows both buttons and asks the customer to check out separately. <Rule>Rule 8</Rule></li>
            <li>Login is required. The reservation lands on the item as a customer row: name, email, phone, qty.</li>
            <li>Booking again tops up the same row rather than creating a second one, and the row is flagged as new so it stands out on the dashboard.</li>
            <li>A customer <strong>cannot edit</strong> their qty afterwards &mdash; they can only cancel, and only while the item is unlocked. Changes go through you.</li>
          </ul>
        </Node>
        <Node kind="neutral" icon="✍️" title="You add them by hand" subtitle="Straight onto the dashboard item">
          <ul className="list-disc pl-5 space-y-1">
            <li>Customers who phone, WhatsApp or walk in get added directly to the item&rsquo;s customer list.</li>
            <li>Identical from here on &mdash; the flow does not care how the reservation arrived.</li>
          </ul>
        </Node>
      </div>

      <Arrow label="when the target is hit" />

      <Node kind="lock" icon="🔒" title="The item closes itself off" subtitle="Auto-unpublish, cut-off date, order placed">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Auto-unpublish</strong> happens only when Supplier Order qty is set <em>and</em> total reserved reaches it. The item unpublishes and is stamped sold out. With no Supplier Order qty set this never fires, and the item stays open until you close it.</li>
          <li><strong>Cut-off date reached</strong> or <strong>Order Placed</strong> ticked also locks the item.</li>
          <li>A locked item is not completely shut: if the target left any room, a customer can still take what remains, capped at whatever is actually left.</li>
        </ul>
      </Node>

      <Stage n={3} title="Taking a deposit (optional)" />

      <Node kind="money" icon="💰" title="Pre Order Deposit quote" subtitle="Money in before the goods exist">
        <ul className="list-disc pl-5 space-y-1">
          <li>From the customer row, <strong>Send to &rarr; Quote</strong>, then tick <strong>Pre Order Deposit</strong> on the quote.</li>
          <li>The document renames itself to PRE ORDER DEPOSIT and the Discount % field becomes <strong>Deposit %</strong>. The totals block shows Deposit to Pay, then Balance on Arrival.</li>
          <li>The deposit is only ever recorded through <strong>Record Payment</strong>, never typed straight into the document.</li>
          <li>The customer row on the dashboard carries a deposit-paid marker, so you can see at a glance who has committed.</li>
          <li>Still no stock impact. A quote is paperwork.</li>
        </ul>
      </Node>

      <Stage n={4} title="Ordering from the supplier" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <Node kind="neutral" icon="📋" title="Send to SO (bulk)" subtitle="From the dashboard, whole item at once">
          <ul className="list-disc pl-5 space-y-1">
            <li>Takes the Supplier Order qty &mdash; or the summed customer qty if none is set &mdash; and raises supplier order lines.</li>
            <li>Uses the item&rsquo;s <strong>wholesale price and currency</strong>, never the estimated retail.</li>
            <li>Lands on Suppliers Orders as back order lines grouped under that supplier.</li>
          </ul>
        </Node>
        <Node kind="neutral" icon="🧾" title="From a Quote" subtitle="Add to Supplier Order tick box">
          <ul className="list-disc pl-5 space-y-1">
            <li>On a Quote, tick <strong>Add to Supplier Order</strong>, pick the supplier, then either start a new supplier order or add to one already open.</li>
            <li>Every line on the quote is pushed at <strong>cost price</strong> where the line has one &mdash; a supplier order buys stock, so it must never carry retail.</li>
            <li>It sends once and then locks, so re-saving the quote cannot double up the order. <Rule>Rule 49</Rule></li>
          </ul>
        </Node>
        <Node kind="neutral" icon="🧮" title="Send to Worksheet" subtitle="Straight into costing">
          <ul className="list-disc pl-5 space-y-1">
            <li>Creates or appends to a costing Worksheet and links it back to the dashboard item.</li>
            <li>The item then shows a shortcut through to that sheet.</li>
          </ul>
        </Node>
      </div>

      <Arrow label="order placed with the supplier" />

      <Stage n={5} title="Costing the landed price" />

      <Node kind="neutral" icon="🧮" title="Worksheet" subtitle="Wholesale cost in, real retail price out">
        <ul className="list-disc pl-5 space-y-1">
          <li>Takes the wholesale price and applies exchange rate, shipping, customs, markup and VAT to reach a landed cost and a retail price.</li>
          <li><strong>Update Products</strong> pushes those prices onto the product records. It never touches quantity &mdash; prices and stock move separately, on purpose.</li>
          <li>This is where the estimated retail from stage 1 becomes a real one.</li>
        </ul>
      </Node>

      <Arrow label="goods land" />

      <Stage n={6} title="Stock arrives" />

      <Node kind="stock" icon="📦" title="Into Inventory" subtitle="The first moment real stock exists">
        <ul className="list-disc pl-5 space-y-1">
          <li>Receiving the goods puts a real quantity onto the product record.</li>
          <li>The storefront QTY mirrors that product quantity, so it moves now &mdash; not back when customers were reserving.</li>
          <li>Selling out later never converts a product to Pre-Order. That flag is set deliberately and stays where you put it. <Rule>Rule 30</Rule></li>
        </ul>
      </Node>

      <Stage n={7} title="Billing the customer" />

      <Node kind="neutral" icon="📤" title="Send to — per customer" subtitle="Quote, Sales Order or Invoice" defaultOpen>
        <ul className="list-disc pl-5 space-y-1">
          <li>Each customer row has its own <strong>Send to</strong>. <em>Create New</em> always starts a fresh document; <em>Add to Existing</em> lists that customer&rsquo;s open documents, and typing in the search widens it to every open document.</li>
          <li>The line is written as <strong>SKU &ndash; Title</strong> at the item&rsquo;s price, and the customer row is tagged with the document it went to, so you can trace it later.</li>
          <li>Any deposit already taken carries across when a quote becomes an invoice, and a visible note records which quote it came from when several are consolidated onto one invoice.</li>
          <li>A quote is archived automatically once it converts. <Rule>Rule 28</Rule></li>
        </ul>
      </Node>

      <Arrow />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        <Node kind="neutral" icon="📄" title="Quote" subtitle="Never touches stock">
          <p>Creating, editing or deleting a quote has zero effect on inventory. It is a price on paper.</p>
        </Node>
        <Node kind="stock" icon="🧾" title="Sales Order or Invoice" subtitle="Deducts stock immediately">
          <ul className="list-disc pl-5 space-y-1">
            <li>Raising either one subtracts the line qty from the product straight away. Editing reverses the old qty and applies the new one; archiving, cancelling or deleting restores it. <Rule>Rule 3</Rule></li>
            <li><strong>An invoice is hard-blocked if the stock is not there.</strong> The offending SKUs are named, rather than the sale silently going through against an empty product. <Rule>Rule 1</Rule></li>
            <li>This is the moment the storefront QTY drops.</li>
          </ul>
        </Node>
      </div>

      {/* Traps */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-10 mb-3">Easy things to get wrong</h2>
      <div className="rounded-2xl border-2 border-gray-300 bg-white px-5 py-4">
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
          <li><strong>Reservations are not stock.</strong> Ten people booking an item changes no quantity anywhere. Until the goods land and an invoice is raised, inventory has not moved.</li>
          <li><strong>No Supplier Order qty means no auto-close.</strong> If that field is 0, the item keeps taking reservations however many come in.</li>
          <li><strong>Supplier orders use cost, customer documents use retail.</strong> Sending a quote to a supplier order deliberately switches to cost price.</li>
          <li><strong>Selling out is not the same as going on pre-order.</strong> Stock reaching 0 shows Sold Out and nothing more &mdash; the Pre-Order flag is always a deliberate choice.</li>
          <li><strong>Deposits go through Record Payment.</strong> Typing a figure into the document is not how money gets recorded.</li>
        </ul>
      </div>

      <p className="text-xs text-gray-400 mt-6">
        The numbered rules above are the enforced ones &mdash; open <Link href="/admin/settings/site-rules" className="text-indigo-600 hover:text-indigo-800 font-semibold">Site Rules</Link> for the full wording.
        For how a unit of stock moves once it exists, see <Link href="/admin/settings/stock-mapping" className="text-indigo-600 hover:text-indigo-800 font-semibold">Stock Mapping</Link>.
      </p>
    </div>
  )
}
