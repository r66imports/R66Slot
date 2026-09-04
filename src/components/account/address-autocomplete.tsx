'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'

export interface ParsedAddress {
  address1: string
  address2: string
  city: string
  state: string
  zip: string
  country: string
  formatted: string
}

interface Suggestion {
  id: string
  mainText: string
  secondaryText: string
  /** Photon returns the parsed address with the suggestion, so picking is instant. */
  address: ParsedAddress
}

interface Props {
  /** Current Address Line 1 text — this stays a normal controlled field. */
  value: string
  /** Fired on every keystroke, so the user can always type an address OSM does not know. */
  onChange: (value: string) => void
  /** Fired once, when a suggestion is picked, with every field already parsed out. */
  onSelect: (address: ParsedAddress) => void
  /** Country currently chosen in the form — filters and biases results. */
  country?: string
  label?: string
  placeholder?: string
  required?: boolean
  name?: string
  id?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  country,
  label = 'Address Line 1 *',
  placeholder = 'Start typing your street address...',
  required,
  name = 'address1',
  id,
}: Props) {
  const reactId = useId()
  const inputId = id || `addr-${reactId}`
  const listId = `${inputId}-listbox`

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [loading, setLoading] = useState(false)

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abort = useRef<AbortController | null>(null)
  // Set right after a pick so the resulting value change does not re-open the list.
  const justPicked = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  // Clicking anywhere outside dismisses the list (mousedown, so it beats the blur).
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onDocDown)
    return () => document.removeEventListener('mousedown', onDocDown)
  }, [close])

  useEffect(() => () => {
    if (debounce.current) clearTimeout(debounce.current)
    abort.current?.abort()
  }, [])

  const fetchSuggestions = useCallback(async (input: string) => {
    abort.current?.abort()   // a newer keystroke wins; drop the in-flight request
    const controller = new AbortController()
    abort.current = controller
    setLoading(true)
    try {
      const res = await fetch('/api/address/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, country }),
        signal: controller.signal,
      })
      const data = await res.json()
      const list: Suggestion[] = data.suggestions || []
      setSuggestions(list)
      setOpen(list.length > 0)
      setActiveIndex(-1)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') console.error('Address lookup failed', error)
    } finally {
      setLoading(false)
    }
  }, [country])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value
    onChange(next)

    if (debounce.current) clearTimeout(debounce.current)
    if (justPicked.current) {
      justPicked.current = false
      return
    }

    if (next.trim().length < 3) {
      setSuggestions([])
      close()
      return
    }
    // 300ms is long enough to skip most intermediate keystrokes without feeling
    // laggy, and keeps us well inside Photon's fair-use expectations.
    debounce.current = setTimeout(() => fetchSuggestions(next), 300)
  }

  const pick = (s: Suggestion) => {
    justPicked.current = true
    close()
    setSuggestions([])
    onSelect(s.address)   // already parsed — no second request
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault()   // keep Enter from submitting the form mid-pick
        pick(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    } else if (e.key === 'Tab') {
      close()
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <label htmlFor={inputId} className="block text-sm font-medium mb-1.5">{label}</label>

      <Input
        id={inputId}
        name={name}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setOpen(true) }}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined}
      />

      {loading && (
        <span className="absolute right-3 top-9 text-xs text-gray-400" aria-hidden="true">...</span>
      )}

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <ul
            id={listId}
            role="listbox"
            aria-label="Address suggestions"
            className="max-h-72 overflow-auto py-1"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                // mousedown, not click: the input's blur would otherwise close the list first
                onMouseDown={(e) => { e.preventDefault(); pick(s) }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`cursor-pointer px-4 py-2.5 text-sm ${i === activeIndex ? 'bg-primary/10' : 'hover:bg-gray-50'}`}
              >
                <span className="block font-medium text-gray-900">{s.mainText}</span>
                {s.secondaryText && <span className="block text-xs text-gray-500">{s.secondaryText}</span>}
              </li>
            ))}
          </ul>
          {/* OSM data requires attribution, and a role="listbox" may only contain
              options — so this sits outside the list. */}
          <div className="border-t border-gray-100 px-4 py-1 text-[10px] text-gray-400" aria-hidden="true">
            © OpenStreetMap contributors
          </div>
        </div>
      )}

      {/* Screen readers get the result count without the list having to steal focus. */}
      <span className="sr-only" role="status" aria-live="polite">
        {open && suggestions.length > 0 ? `${suggestions.length} address suggestions available` : ''}
      </span>

      <p className="text-xs text-gray-500 mt-1">
        Start typing and pick your address — City, Province and Postal Code fill in automatically.
      </p>
    </div>
  )
}
