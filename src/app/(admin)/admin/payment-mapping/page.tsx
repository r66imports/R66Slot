'use client'

// Payment Mapping — reference documentation for how a recorded payment becomes money on the
// books. Static page: no data fetching, no state. It exists so the deposit-mode trap that
// minted R6 886.36 of phantom customer credit stays visible to whoever touches this code next.

// Site rule numbers differ between R66Slot and R66Emporium — keep these pointing at this
// project's own registry (/admin/settings/site-rules).
const RULES = {
  credits: 'Rule 44',
  deleteTxn: 'Rule 44',
  recordPayment: 'Rule 44',
  carryOver: 'Rule 45',
  totalsBlock: 'Rule 46',
}

/** Distinct rule names in registry order — R66Slot maps several keys onto one rule, so the
 *  same number must not be listed twice in a sentence. */
function rulesSentence(...keys: (keyof typeof RULES)[]): string {
  const names = Array.from(new Set(keys.map((k) => RULES[k])))
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

const FIELDS: { field: string; meaning: React.ReactNode; writer: string }[] = [
  { field: 'amountPaid', meaning: 'Total money received against the document, cumulative', writer: 'Record Payment · inline panel' },
  { field: 'payments[]', meaning: 'Payment history — date, amount, method, notes. The source of truth', writer: 'Record Payment · inline panel' },
  { field: 'creditApplied', meaning: 'Existing customer credit used to offset this document', writer: 'Record Payment' },
  { field: 'depositPaid', meaning: <><strong className="font-semibold text-red-600">Deposit due</strong> when depositMode is on; <strong className="font-semibold">deposit received</strong> when it is off</>, writer: 'Edit modal, from Deposit %' },
  { field: 'depositMode', meaning: 'Switches the meaning of depositPaid. Quotes only', writer: 'Edit modal' },
  { field: 'overpaymentCredit', meaning: 'Credit this document created. Mirrors a ledger transaction', writer: 'Record Payment · inline panel' },
  { field: 'showCreditOnInvoice', meaning: 'Whether the customer sees the credit line on their copy', writer: 'Record Payment' },
  { field: 'status', meaning: 'Flips to paid once settled reaches the document total', writer: 'Record Payment · inline panel' },
  { field: 'balance', meaning: 'Customer credit balance — sum of their ledger transactions', writer: 'customer-credits API' },
]

const KEEP_FIXED: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Never hand-roll settlement maths',
    body: <>No <Mono>Math.max(amountPaid, depositPaid)</Mono> at a call site, ever. Import from <Mono>src/lib/payment-math.ts</Mono> — that module exists so the meaning of <Mono>depositPaid</Mono> is decided in exactly one place.</>,
  },
  {
    title: 'Measure overpayment cumulatively',
    body: <>Total received against document total, never the incoming payment against the pre-payment balance. The marginal form silently sums a deposit twice.</>,
  },
  {
    title: 'Credit is never minted silently',
    body: <>Any payment that would create credit requires a confirmation naming the customer and the amount. If a change makes credit appear without one, the change is wrong.</>,
  },
  {
    title: 'Clear both records',
    body: <>Removing a credit means the ledger transaction <em>and</em> the source document&apos;s <Mono>overpaymentCredit</Mono>. One without the other leaves it alive.</>,
  },
  {
    title: 'Deposit mode is quotes-only',
    body: <>New invoices carry <Mono>depositMode: false</Mono>. A deposit-mode invoice reintroduces the ambiguity on a document that also takes real payments.</>,
  },
  {
    title: 'Check the site rules first',
    body: <>{rulesSentence('credits', 'deleteTxn', 'recordPayment', 'carryOver')} describe how payments and credits are meant to behave. Where code and rule disagree, the rule is the spec.</>,
  },
]

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="font-mono text-[0.86em] bg-gray-100 text-gray-700 px-1 py-0.5 rounded">{children}</code>
}

function Figure({ label, caption, children }: { label: string; caption: React.ReactNode; children: React.ReactNode }) {
  return (
    <figure className="bg-white border border-gray-200 rounded-2xl p-5 my-6">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">{children}</div>
      </div>
      <figcaption className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100 max-w-3xl">
        <span className="font-semibold text-gray-600 uppercase tracking-wide mr-2">{label}</span>
        {caption}
      </figcaption>
    </figure>
  )
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-3 pt-4 border-t border-gray-200">
      <p className="text-[11px] font-mono uppercase tracking-widest text-blue-600 mb-1.5">{eyebrow}</p>
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
    </div>
  )
}

export default function PaymentMappingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* ─── Masthead ─────────────────────────────────────────────────────── */}
      <header className="pb-7 mb-9 border-b-2 border-gray-800">
        <p className="text-[11px] font-mono uppercase tracking-widest text-blue-600 mb-3">Back Office · Reference</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
          How a payment becomes money on the books
        </h1>
        <p className="text-gray-500 max-w-3xl leading-relaxed">
          Every rand recorded in the back office moves through one path: two entry points, one settlement
          calculation, two places it gets written. This is that path — and the fork in it that quietly
          minted <span className="font-mono tabular-nums">R6 886.36</span> of customer credit nobody ever paid.
        </p>
      </header>

      {/* ─── Figure 1 ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeading eyebrow="Figure 1" title="The payment path" />
        <p className="text-gray-600 max-w-3xl leading-relaxed">
          A payment can be entered in two places, but both converge on the same arithmetic before anything is
          written. That convergence is the point: when four code paths each did their own maths, all four got
          the deposit wrong in a different way.
        </p>

        <Figure
          label="Figure 1"
          caption={<>Both entry points call the same module, so the meaning of <Mono>depositPaid</Mono> is decided once. Credit is written in two places — the document field and the ledger — which is why clearing only one of them leaves the credit alive.</>}
        >
          <svg viewBox="0 0 900 646" className="w-full h-auto" role="img" aria-label="Payment flow: the Record Payment modal and the inline payment panel both call payment-math.ts, whose depositAsSettled function decides whether depositPaid counts as money received; entry guards then run before writes go to the document and to the credit ledger.">
            <defs>
              <marker id="pm-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
              </marker>
              <marker id="pm-ah-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
              </marker>
            </defs>

            {/* entry */}
            <text x="90" y="16" fontSize="11.5" fontWeight="700" letterSpacing="1" fill="#6b7280">ENTRY</text>
            <rect x="90" y="24" width="280" height="56" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="230" y="48" fontSize="13.5" fontWeight="650" fill="#1f2937" textAnchor="middle">Record Payment modal</text>
            <text x="230" y="66" fontSize="11.5" fill="#6b7280" textAnchor="middle">Orders → Actions → Record Payment</text>

            <rect x="530" y="24" width="280" height="56" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="670" y="48" fontSize="13.5" fontWeight="650" fill="#1f2937" textAnchor="middle">Inline payment panel</text>
            <text x="670" y="66" fontSize="11.5" fill="#6b7280" textAnchor="middle">inside the edit modal</text>

            <path d="M 230 80 L 230 112 L 670 112 L 670 80" fill="none" stroke="#9ca3af" strokeWidth="1.5" />
            <path d="M 450 112 L 450 136" fill="none" stroke="#2563eb" strokeWidth="2" markerEnd="url(#pm-ah-a)" />

            {/* calculate */}
            <text x="90" y="132" fontSize="11.5" fontWeight="700" letterSpacing="1" fill="#6b7280">CALCULATE</text>
            <rect x="90" y="140" width="720" height="212" rx="8" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.75" />
            <text x="112" y="168" fontSize="12" fontFamily="ui-monospace, monospace" fill="#2563eb">src/lib/payment-math.ts</text>
            <text x="112" y="187" fontSize="11.5" fill="#6b7280">Single source of truth — every payment path calls these</text>
            <line x1="112" y1="199" x2="788" y2="199" stroke="#bfdbfe" strokeWidth="1.5" />

            <text x="112" y="224" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937">documentTotal()</text>
            <text x="112" y="246" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937">settledAmount()</text>
            <text x="112" y="268" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937">balanceDue()</text>
            <text x="112" y="290" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937">settledAfterPayment()</text>
            <text x="112" y="312" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937">overpaymentFor()</text>
            <text x="112" y="334" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937">isFullySettled()</text>

            <rect x="430" y="212" width="358" height="126" rx="6" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.75" />
            <text x="448" y="234" fontSize="12" fontFamily="ui-monospace, monospace" fill="#dc2626">depositAsSettled(doc)</text>
            <text x="448" y="252" fontSize="11.5" fill="#9b6b66">the fork every path used to get wrong</text>
            <line x1="448" y1="262" x2="770" y2="262" stroke="#fecaca" strokeWidth="1.5" />
            <text x="448" y="284" fontSize="12.5" fill="#1f2937"><tspan fontFamily="ui-monospace, monospace" fontSize="11.5">depositMode = true</tspan> → R0.00</text>
            <text x="448" y="300" fontSize="11.5" fill="#6b7280">deposit is DUE — nothing received yet</text>
            <text x="448" y="322" fontSize="12.5" fill="#1f2937"><tspan fontFamily="ui-monospace, monospace" fontSize="11.5">depositMode = false</tspan> → depositPaid</text>
            <text x="448" y="338" fontSize="11.5" fill="#6b7280">legacy deposit, already received</text>

            <path d="M 450 352 L 450 392" fill="none" stroke="#2563eb" strokeWidth="2" markerEnd="url(#pm-ah-a)" />

            {/* guard */}
            <text x="230" y="388" fontSize="11.5" fontWeight="700" letterSpacing="1" fill="#6b7280">GUARD</text>
            <rect x="230" y="396" width="440" height="72" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.75" />
            <text x="450" y="422" fontSize="13.5" fontWeight="650" fill="#15803d" textAnchor="middle">Entry guards</text>
            <text x="450" y="441" fontSize="11.5" fill="#4b5563" textAnchor="middle">flag amounts matching the doc number or over 2× total</text>
            <text x="450" y="458" fontSize="11.5" fill="#4b5563" textAnchor="middle">require explicit confirmation before minting credit</text>

            <path d="M 450 468 L 450 496 L 250 496 L 250 524" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm-ah)" />
            <path d="M 450 496 L 650 496 L 650 524" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm-ah)" />

            {/* write */}
            <text x="90" y="518" fontSize="11.5" fontWeight="700" letterSpacing="1" fill="#6b7280">WRITE</text>
            <rect x="90" y="528" width="320" height="104" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="250" y="552" fontSize="13.5" fontWeight="650" fill="#1f2937" textAnchor="middle">Document</text>
            <text x="250" y="574" fontSize="11.5" fontFamily="ui-monospace, monospace" fill="#374151" textAnchor="middle">amountPaid · payments[]</text>
            <text x="250" y="594" fontSize="11.5" fontFamily="ui-monospace, monospace" fill="#374151" textAnchor="middle">overpaymentCredit</text>
            <text x="250" y="616" fontSize="11.5" fill="#6b7280" textAnchor="middle">status → paid once fully settled</text>

            <rect x="490" y="528" width="320" height="104" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="650" y="552" fontSize="13.5" fontWeight="650" fill="#1f2937" textAnchor="middle">Credit ledger</text>
            <text x="650" y="574" fontSize="11.5" fontFamily="ui-monospace, monospace" fill="#374151" textAnchor="middle">customer-credits.json</text>
            <text x="650" y="594" fontSize="11.5" fontFamily="ui-monospace, monospace" fill="#374151" textAnchor="middle">overpayment transaction</text>
            <text x="650" y="616" fontSize="11.5" fill="#6b7280" textAnchor="middle">client balance</text>
          </svg>
        </Figure>
      </section>

      {/* ─── Figure 2 ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeading eyebrow="Figure 2" title="The fork: one field, two meanings" />
        <p className="text-gray-600 max-w-3xl leading-relaxed mb-2">
          <Mono>depositPaid</Mono> means different things depending on <Mono>depositMode</Mono>. On a deposit-mode
          quote it holds the deposit the customer <strong className="font-semibold">owes</strong>. On every other
          document it holds a deposit that was <strong className="font-semibold">received</strong>. The field name
          only describes the second case.
        </p>
        <p className="text-gray-600 max-w-3xl leading-relaxed">
          Reading the first case as the second is the entire bug. Here is quote <Mono>QR6671</Mono> —
          <span className="font-mono tabular-nums"> R19 899.17</span> at a 70% deposit — through the old maths and the new.
        </p>

        <Figure
          label="Figure 2"
          caption={<>The two chains are identical except for the second row. Counting a deposit that is owed as a deposit that was received collapses the balance to the balance-on-delivery, and every rand above that figure becomes credit.</>}
        >
          <svg viewBox="0 0 900 424" className="w-full h-auto" role="img" aria-label="Side by side comparison of quote QR6671. Before: the R13 929.42 deposit due was counted as already settled, showing a balance of R5 969.75, so a R7 393.12 payment minted R1 423.37 of credit. After: the deposit counts as R0.00 settled, the full R19 899.17 is outstanding, and R13 929.42 paid mints no credit.">
            <defs>
              <marker id="pm2-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
              </marker>
            </defs>

            <text x="225" y="26" fontSize="13.5" fontWeight="700" fill="#dc2626" textAnchor="middle">BEFORE</text>
            <text x="225" y="45" fontSize="11.5" fill="#6b7280" textAnchor="middle">credit minted: R1 423.37</text>
            <text x="675" y="26" fontSize="13.5" fontWeight="700" fill="#16a34a" textAnchor="middle">AFTER</text>
            <text x="675" y="45" fontSize="11.5" fill="#6b7280" textAnchor="middle">credit minted: R0.00</text>

            <rect x="26" y="58" width="398" height="348" rx="10" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="5 4" />
            <rect x="476" y="58" width="398" height="348" rx="10" fill="none" stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="5 4" />

            {/* left chain */}
            <rect x="46" y="76" width="358" height="42" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="62" y="102" fontSize="13" fill="#1f2937">Quote total</text>
            <text x="388" y="102" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937" textAnchor="end">R19 899.17</text>
            <path d="M 225 118 L 225 132" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="46" y="134" width="358" height="42" rx="6" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.75" />
            <text x="62" y="152" fontSize="13" fill="#dc2626">Deposit counted as settled</text>
            <text x="62" y="168" fontSize="11" fill="#9b6b66">but the customer had not paid it</text>
            <text x="388" y="160" fontSize="12" fontFamily="ui-monospace, monospace" fill="#dc2626" textAnchor="end">R13 929.42</text>
            <path d="M 225 176 L 225 190" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="46" y="192" width="358" height="42" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="62" y="218" fontSize="13" fill="#1f2937">Balance shown as due</text>
            <text x="388" y="218" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937" textAnchor="end">R5 969.75</text>
            <path d="M 225 234 L 225 248" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="46" y="250" width="358" height="42" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="62" y="276" fontSize="13" fill="#1f2937">Second deposit payment</text>
            <text x="388" y="276" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937" textAnchor="end">R7 393.12</text>
            <path d="M 225 292 L 225 306" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="46" y="308" width="358" height="52" rx="6" fill="#fef2f2" stroke="#dc2626" strokeWidth="1.75" />
            <text x="62" y="330" fontSize="13.5" fontWeight="650" fill="#dc2626">Credit minted</text>
            <text x="62" y="348" fontSize="11" fill="#9b6b66">7 393.12 − 5 969.75</text>
            <text x="388" y="340" fontSize="12" fontFamily="ui-monospace, monospace" fill="#dc2626" textAnchor="end">R1 423.37</text>

            <text x="225" y="386" fontSize="11.5" fill="#6b7280" textAnchor="middle">customer never overpaid a cent</text>

            {/* right chain */}
            <rect x="496" y="76" width="358" height="42" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="512" y="102" fontSize="13" fill="#1f2937">Quote total</text>
            <text x="838" y="102" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937" textAnchor="end">R19 899.17</text>
            <path d="M 675 118 L 675 132" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="496" y="134" width="358" height="42" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.75" />
            <text x="512" y="152" fontSize="13" fill="#15803d">Deposit counted as settled</text>
            <text x="512" y="168" fontSize="11" fill="#5f8b74">deposit mode — it is money still owed</text>
            <text x="838" y="160" fontSize="12" fontFamily="ui-monospace, monospace" fill="#15803d" textAnchor="end">R0.00</text>
            <path d="M 675 176 L 675 190" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="496" y="192" width="358" height="42" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="512" y="218" fontSize="13" fill="#1f2937">Balance shown as due</text>
            <text x="838" y="218" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937" textAnchor="end">R19 899.17</text>
            <path d="M 675 234 L 675 248" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="496" y="250" width="358" height="42" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="512" y="276" fontSize="13" fill="#1f2937">Paid to date, both payments</text>
            <text x="838" y="276" fontSize="12" fontFamily="ui-monospace, monospace" fill="#1f2937" textAnchor="end">R13 929.42</text>
            <path d="M 675 292 L 675 306" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm2-ah)" />

            <rect x="496" y="308" width="358" height="52" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.75" />
            <text x="512" y="330" fontSize="13.5" fontWeight="650" fill="#15803d">Credit minted</text>
            <text x="512" y="348" fontSize="11" fill="#5f8b74">13 929.42 − 19 899.17, floored at zero</text>
            <text x="838" y="340" fontSize="12" fontFamily="ui-monospace, monospace" fill="#15803d" textAnchor="end">R0.00</text>

            <text x="675" y="386" fontSize="11.5" fill="#6b7280" textAnchor="middle">still owing R5 969.75 on delivery</text>
          </svg>
        </Figure>

        <div className="border-l-4 border-red-500 bg-red-50 rounded-r-lg px-5 py-4 my-6 max-w-3xl">
          <p className="text-[11px] font-mono uppercase tracking-widest text-red-600 mb-2">Why it repeated</p>
          <p className="text-sm text-gray-700 leading-relaxed mb-2">
            Overpayment used to be measured against the balance <em>before</em> the payment. That form also
            double-counts a legacy deposit: the deposit counts as settled, then the payment that actually
            delivered it counts again on top. That is how <span className="font-mono tabular-nums">R2 395.00</span> on{' '}
            <Mono>INV0019</Mono> became a <span className="font-mono tabular-nums">R1 335.75</span> credit.
          </p>
          <p className="text-sm text-gray-700 leading-relaxed">
            It is now measured cumulatively — total received against document total — which is what{' '}
            {rulesSentence('carryOver', 'totalsBlock')} already required, and which makes the modal and the inline
            panel agree by construction.
          </p>
        </div>
      </section>

      {/* ─── Figure 3 ─────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeading eyebrow="Figure 3" title="Credit lives in two places" />
        <p className="text-gray-600 max-w-3xl leading-relaxed">
          A credit is not one record. It is a ledger transaction <em>and</em> a field on the source document.
          Both feed the customer balance, so clearing one without the other leaves the credit showing — and can
          bring the balance back.
        </p>

        <Figure
          label="Figure 3"
          caption={<>Reset previously cleared the document field on invoices only. Deposit-mode quotes are exactly where these credits originate, so the stale field survived, kept showing a Credit badge, and could resurrect the balance. Reset now clears every document type, and the per-transaction delete clears its source document too ({rulesSentence('credits', 'deleteTxn')}).</>}
        >
          <svg viewBox="0 0 900 268" className="w-full h-auto" role="img" aria-label="Credit lifecycle: an overpayment writes both a ledger transaction and a document field; the credit is either applied to a later invoice or deleted, and deleting must clear both records or the credit survives.">
            <defs>
              <marker id="pm3-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
              </marker>
            </defs>

            <rect x="20" y="86" width="188" height="86" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="114" y="120" fontSize="13.5" fontWeight="650" fill="#1f2937" textAnchor="middle">Overpayment</text>
            <text x="114" y="140" fontSize="11.5" fill="#6b7280" textAnchor="middle">customer genuinely</text>
            <text x="114" y="156" fontSize="11.5" fill="#6b7280" textAnchor="middle">paid more than the total</text>

            <path d="M 208 129 L 254 129" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm3-ah)" />

            <rect x="256" y="72" width="200" height="114" rx="6" fill="#eff6ff" stroke="#2563eb" strokeWidth="1.75" />
            <text x="356" y="98" fontSize="13.5" fontWeight="650" fill="#2563eb" textAnchor="middle">Written twice</text>
            <line x1="274" y1="108" x2="438" y2="108" stroke="#bfdbfe" strokeWidth="1.5" />
            <text x="356" y="128" fontSize="11.5" fontFamily="ui-monospace, monospace" fill="#374151" textAnchor="middle">ledger transaction</text>
            <text x="356" y="150" fontSize="11.5" fontFamily="ui-monospace, monospace" fill="#374151" textAnchor="middle">overpaymentCredit</text>
            <text x="356" y="172" fontSize="11" fill="#6b7280" textAnchor="middle">on the source document</text>

            <path d="M 456 110 L 492 110 L 492 66 L 528 66" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm3-ah)" />
            <path d="M 456 148 L 492 148 L 492 200 L 528 200" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm3-ah)" />

            <rect x="530" y="34" width="188" height="66" rx="6" fill="#f9fafb" stroke="#e5e7eb" strokeWidth="1.5" />
            <text x="624" y="60" fontSize="13.5" fontWeight="650" fill="#1f2937" textAnchor="middle">Applied</text>
            <text x="624" y="80" fontSize="11.5" fill="#6b7280" textAnchor="middle">offsets a later invoice</text>

            <rect x="530" y="168" width="188" height="66" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.75" />
            <text x="624" y="194" fontSize="13.5" fontWeight="650" fill="#15803d" textAnchor="middle">Deleted or Reset</text>
            <text x="624" y="214" fontSize="11.5" fill="#6b7280" textAnchor="middle">wrong entry removed</text>

            <path d="M 718 201 L 754 201" fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#pm3-ah)" />

            <rect x="756" y="168" width="126" height="66" rx="6" fill="#f0fdf4" stroke="#16a34a" strokeWidth="1.75" />
            <text x="819" y="194" fontSize="13" fontWeight="650" fill="#15803d" textAnchor="middle">Both cleared</text>
            <text x="819" y="214" fontSize="11" fill="#6b7280" textAnchor="middle">ledger + document</text>
          </svg>
        </Figure>
      </section>

      {/* ─── Field reference ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <SectionHeading eyebrow="Reference" title="The fields, and who writes them" />
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-2xl mt-5">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Field</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">What it means</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">Written by</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f) => (
                <tr key={f.field} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-[13px] text-gray-800 whitespace-nowrap align-top">{f.field}</td>
                  <td className="px-4 py-3 text-gray-600 align-top">{f.meaning}</td>
                  <td className="px-4 py-3 text-gray-500 text-[13px] align-top whitespace-nowrap">{f.writer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Keeping it fixed ─────────────────────────────────────────────── */}
      <section className="mb-10">
        <SectionHeading eyebrow="Rules" title="Keeping it fixed" />
        <p className="text-gray-600 max-w-3xl leading-relaxed">
          The four call sites were each individually correct-looking. What made the defect survive was that the
          arithmetic was written four times. These are the constraints that stop a fifth copy appearing.
        </p>
        <ol className="mt-6 max-w-3xl space-y-5">
          {KEEP_FIXED.map((r, i) => (
            <li key={r.title} className="relative pl-12">
              <span className="absolute left-0 top-0.5 font-mono text-[13px] font-semibold text-blue-600 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <b className="block text-gray-800 font-semibold mb-0.5">{r.title}</b>
              <span className="text-gray-600 leading-relaxed">{r.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <footer className="pt-5 border-t border-gray-200 text-xs text-gray-500 max-w-3xl">
        Covers R66Slot and R66Emporium. Traced from quote <Mono>QR6671</Mono> and verified against 12 affected
        documents and 7 genuine overpayments. Behaviour is governed by{' '}
        {rulesSentence('credits', 'deleteTxn', 'recordPayment', 'carryOver', 'totalsBlock')} — see Settings → Site Rules.
      </footer>

    </div>
  )
}
