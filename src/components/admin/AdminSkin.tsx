'use client'

/**
 * Admin Themes — the account skins, offered to admin and staff users for the
 * back office. Mirrored verbatim between R66Slot and R66Emporium.
 *
 * Same skins, same stylesheet (account-skins.css works on any [data-skin]
 * element), so a skin added to src/lib/account-skins.ts appears here too.
 *
 * Deliberate differences from the client account skins:
 * • Scope is the admin <main> content only. The header and its menus keep the
 *   site's brand colours under every skin.
 * • The default (Route 66) sets no data-skin at all, so an admin who never
 *   picks a theme sees the back office exactly as it was.
 * • The choice is per admin user, per browser (localStorage keyed by
 *   username). Nothing is stored on the server and nothing can change data.
 */

import { useContext, useEffect, useState } from 'react'
import {
  ACCOUNT_SKINS,
  DEFAULT_SKIN_ID,
  SKIN_STORAGE_KEY,
  getSkin,
  isSkinId,
  skinStyle,
} from '@/lib/account-skins'
import { AdminAuthContext } from '@/lib/admin-auth-context'

const storageKey = (username: string | null) => `${SKIN_STORAGE_KEY}.admin.${username || 'default'}`
const OPEN_KEY = `${SKIN_STORAGE_KEY}.admin.pickerOpen`

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private browsing — the theme just won't be remembered */
  }
}

/** Shared between the scope and the picker without a provider in the layout. */
const EVENT = 'r66-admin-skin'

function useAdminSkinId(): [string, (id: string) => void] {
  const { username } = useContext(AdminAuthContext)
  const [skinId, setSkinIdState] = useState(DEFAULT_SKIN_ID)

  useEffect(() => {
    const stored = readLocal(storageKey(username))
    setSkinIdState(isSkinId(stored) ? stored : DEFAULT_SKIN_ID)
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (isSkinId(id)) setSkinIdState(id)
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [username])

  const setSkinId = (id: string) => {
    if (!isSkinId(id)) return
    writeLocal(storageKey(username), id)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }))
  }

  return [skinId, setSkinId]
}

/** Replaces the admin layout's <main>; applies the theme to the content only. */
export function AdminSkinMain({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [skinId] = useAdminSkinId()
  const skin = getSkin(skinId)

  if (skin.id === DEFAULT_SKIN_ID) {
    return <main className={className}>{children}</main>
  }

  return (
    <main
      className={className}
      data-skin={skin.id}
      data-skin-dark={skin.dark ? '1' : '0'}
      // The livery stripes are for the client account canvas; on admin pages
      // they show between cards, so the content area keeps a plain canvas.
      style={{ ...skinStyle(skin), backgroundImage: 'none' }}
    >
      {children}
    </main>
  )
}

/**
 * The theme box, fixed bottom-left. Colours are inline on purpose: it sits
 * outside the skinned area and must look the same whatever theme is on.
 */
export function AdminSkinPicker() {
  const [skinId, setSkinId] = useAdminSkinId()
  const [open, setOpen] = useState(true)
  const current = getSkin(skinId)

  useEffect(() => {
    if (readLocal(OPEN_KEY) === '0') setOpen(false)
  }, [])

  const toggle = () => {
    setOpen((o) => {
      writeLocal(OPEN_KEY, o ? '0' : '1')
      return !o
    })
  }

  const swatch = (s: (typeof ACCOUNT_SKINS)[number], size: number) => ({
    width: size,
    height: size,
    borderRadius: 9999,
    background: `linear-gradient(135deg, ${s.colors.surface} 0 50%, ${s.colors.accent} 50% 100%)`,
    border: `1px solid ${s.colors.border}`,
  })

  return (
    <div
      data-skin-swatches
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 40,
        background: '#FFFFFF',
        color: '#111827',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontSize: 12,
        width: open ? 212 : 'auto',
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        title={open ? 'Hide themes' : 'Show themes'}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          padding: '8px 10px',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          color: '#111827',
        }}
      >
        <span aria-hidden style={swatch(current, 16)} />
        <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>
          Theme
        </span>
        <span style={{ color: '#6B7280', flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
          {current.name}
        </span>
        <span aria-hidden style={{ color: '#9CA3AF' }}>{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 10px 10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {ACCOUNT_SKINS.map((s) => {
              const selected = s.id === skinId
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSkinId(s.id)}
                  title={`${s.name} — ${s.blurb}`}
                  aria-label={`${s.name} theme`}
                  aria-pressed={selected}
                  style={{
                    ...swatch(s, 26),
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: selected ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${s.colors.accent}` : 'none',
                  }}
                />
              )
            })}
          </div>
          <p style={{ marginTop: 8, color: '#6B7280', lineHeight: 1.35, fontSize: 11 }}>{current.blurb}</p>
        </div>
      )}
    </div>
  )
}
