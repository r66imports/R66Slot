'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  CARRIER_HEADINGS,
  SHIPPING_OPTIONS,
  getShippingOption,
  shippingBranchLabel,
  shippingBranchPlaceholder,
  shippingRequiresBranch,
} from '@/lib/shipping-options'

type Status = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Preferred Shipping picker for the customer's own back office. Autosaves —
 * there is no Save button. The chosen method is mirrored onto the admin contact
 * record and prefills the invoice shipping line (Rule 54).
 */
export default function PreferredShipping() {
  const [selected, setSelected] = useState('')
  const [branch, setBranch] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const branchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/account/shipping-preference')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data) {
          setSelected(data.preferredShipping || '')
          setBranch(data.courierGuyBranch || '')
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const save = useCallback(async (preferredShipping: string, courierGuyBranch: string) => {
    setStatus('saving')
    setError('')
    try {
      const res = await fetch('/api/account/shipping-preference', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredShipping, courierGuyBranch }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error || 'Could not save — please try again')
        setStatus('error')
        return
      }
      setStatus('saved')
    } catch {
      setError('Could not save — please try again')
      setStatus('error')
    }
  }, [])

  function chooseOption(id: string) {
    setSelected(id)
    // A PostNet branch is not a Courier Guy branch — carrying one across would
    // print the wrong depot on the invoice, so drop it when the field changes.
    const keep = shippingBranchLabel(id) === shippingBranchLabel(selected) ? branch : ''
    if (keep !== branch) setBranch(keep)
    // A branch option is incomplete without the branch — wait for it rather
    // than saving something the invoice can't use.
    if (shippingRequiresBranch(id) && !keep.trim()) {
      if (branchTimer.current) clearTimeout(branchTimer.current)
      setStatus('idle')
      setError('')
      return
    }
    save(id, keep)
  }

  function changeBranch(value: string) {
    setBranch(value)
    if (branchTimer.current) clearTimeout(branchTimer.current)
    if (!selected || !shippingRequiresBranch(selected) || !value.trim()) return
    branchTimer.current = setTimeout(() => save(selected, value), 800)
  }

  useEffect(() => () => { if (branchTimer.current) clearTimeout(branchTimer.current) }, [])

  const needsBranch = shippingRequiresBranch(selected)
  const carriers = ['RAM', 'Courier Guy'] as const

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-xl font-bold">Preferred Shipping</h3>
          <span className="text-xs mt-1 whitespace-nowrap">
            {status === 'saving' && <span className="text-gray-400">Saving…</span>}
            {status === 'saved'  && <span className="text-green-600 font-semibold">✓ Saved</span>}
            {status === 'error'  && <span className="text-red-600 font-semibold">Not saved</span>}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-5">
          Choose how you'd like your orders shipped. Your choice saves automatically and appears on your invoice.
        </p>

        {!loaded ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <div className="space-y-5">
            {carriers.map(carrier => (
              <div key={carrier}>
                <div className="mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{CARRIER_HEADINGS[carrier].title}</p>
                  {CARRIER_HEADINGS[carrier].note && (
                    <p className="text-xs text-gray-500 mt-0.5">{CARRIER_HEADINGS[carrier].note}</p>
                  )}
                </div>
                <div className="space-y-2">
                  {SHIPPING_OPTIONS.filter(o => o.carrier === carrier).map(o => {
                    const active = selected === o.id
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => chooseOption(o.id)}
                        className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
                          active ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              active ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            {active && <span className="w-2 h-2 rounded-full bg-red-500" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900">{o.label}</span>
                            {o.note && <span className="block text-xs text-amber-600 font-medium mt-0.5">⚠ {o.note}</span>}
                            {o.requiresBranch && (
                              <span className="block text-xs text-gray-500 mt-0.5">
                                Requires your {(o.branchLabel || 'branch').toLowerCase()}
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* The branch belongs to the option that asks for it — keep it in
                    that carrier's group rather than stranded below both lists. */}
                {needsBranch && getShippingOption(selected)?.carrier === carrier && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium mb-1.5">
                      {shippingBranchLabel(selected)} <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={branch}
                      onChange={e => changeBranch(e.target.value)}
                      placeholder={`e.g. ${shippingBranchPlaceholder(selected)}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {branch.trim()
                        ? 'This branch is printed on your invoice with the shipping method.'
                        : `Enter your ${shippingBranchLabel(selected).toLowerCase()} to finish saving this option.`}
                    </p>
                  </div>
                )}
              </div>
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
