'use client'

/**
 * Admin Themes — themes for the back office, chosen from Settings → Themes.
 * Mirrored verbatim between R66Slot and R66Emporium.
 *
 * The themes are the account skins (src/lib/account-skins.ts) and use the same
 * stylesheet (account-skins.css works on any [data-skin] element), but admin
 * offers only a subset:
 * • Default — the standard look the back office was built with. It sets no
 *   data-skin at all, so it is exactly the original admin.
 * • Every skin not in ADMIN_EXCLUDED_SKINS. The original client colour skins
 *   (and Slotcar) are excluded; any skin added from now on appears here
 *   automatically. To keep a new skin off admin, add its id to the list.
 *
 * Scope is the admin <main> content only — the header and its menus keep the
 * site's brand colours. The choice is per admin user, per browser
 * (localStorage keyed by username); nothing is stored on the server.
 */

import { useContext, useEffect, useState } from 'react'
import {
  ACCOUNT_SKINS,
  DEFAULT_SKIN_ID,
  SKIN_STORAGE_KEY,
  getSkin,
  skinStyle,
  type AccountSkin,
} from '@/lib/account-skins'
import { AdminAuthContext } from '@/lib/admin-auth-context'

/** Client skins that are never offered on admin. */
const ADMIN_EXCLUDED_SKINS = ['chrome', 'pitlane', 'emerald', 'carbon', 'midnight', 'plum', 'mono', 'slotcar']

const DEFAULT_THEME = {
  ...getSkin(DEFAULT_SKIN_ID),
  name: 'Default',
  blurb: 'The standard admin look.',
}

export const ADMIN_THEMES: AccountSkin[] = [
  DEFAULT_THEME,
  ...ACCOUNT_SKINS.filter((s) => s.id !== DEFAULT_SKIN_ID && !ADMIN_EXCLUDED_SKINS.includes(s.id)),
]

const isAdminTheme = (id: unknown): id is string =>
  typeof id === 'string' && ADMIN_THEMES.some((t) => t.id === id)

const storageKey = (username: string | null) => `${SKIN_STORAGE_KEY}.admin.${username || 'default'}`

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

/** Keeps the content area and the Themes pop-up in step without a provider. */
const EVENT = 'r66-admin-skin'

function useAdminThemeId(): [string, (id: string) => void] {
  const { username } = useContext(AdminAuthContext)
  const [themeId, setThemeIdState] = useState(DEFAULT_SKIN_ID)

  useEffect(() => {
    const stored = readLocal(storageKey(username))
    // A retired or excluded theme falls back to Default.
    setThemeIdState(isAdminTheme(stored) ? stored : DEFAULT_SKIN_ID)
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      if (isAdminTheme(id)) setThemeIdState(id)
    }
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [username])

  const setThemeId = (id: string) => {
    if (!isAdminTheme(id)) return
    writeLocal(storageKey(username), id)
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }))
  }

  return [themeId, setThemeId]
}

/** Replaces the admin layout's <main>; applies the theme to the content only. */
export function AdminSkinMain({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [themeId] = useAdminThemeId()
  const skin = getSkin(themeId)

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
 * Settings → Themes pop-up. A pick saves straight away; the pop-up closes on
 * the × button, a click outside the box, or Escape. Colours are inline on
 * purpose: it sits outside the skinned area and must look the same whatever
 * theme is on.
 */
export function AdminThemesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [themeId, setThemeId] = useAdminThemeId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: 'rgba(17, 24, 39, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Themes"
        data-skin-swatches
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#FFFFFF',
          color: '#111827',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Themes</div>
            <div style={{ fontSize: 12, color: '#6B7280' }}>Saved as soon as you pick one.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 0,
              background: '#F3F4F6',
              color: '#374151',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ADMIN_THEMES.map((t) => {
            const selected = t.id === themeId
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => setThemeId(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setThemeId(t.id)
                  }
                }}
                aria-pressed={selected}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: `2px solid ${selected ? t.colors.accent : '#E5E7EB'}`,
                  background: selected ? '#F9FAFB' : '#FFFFFF',
                }}
              >
                {/* aria-label matches the livery swatch rules in account-skin-*.css */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={`${t.name} theme`}
                  style={{
                    flexShrink: 0,
                    width: 34,
                    height: 34,
                    borderRadius: 9999,
                    padding: 0,
                    border: `1px solid ${t.colors.border}`,
                    background: `linear-gradient(135deg, ${t.colors.surface} 0 50%, ${t.colors.accent} 50% 100%)`,
                    pointerEvents: 'none',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{t.blurb}</div>
                </div>
                {selected && (
                  <span aria-hidden style={{ color: t.colors.accent, fontWeight: 700, fontSize: 16 }}>
                    ✓
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
