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
 *   are excluded; any skin added from now on appears here automatically. To
 *   keep a new skin off admin, add its id to the list. Slotcar is offered, but
 *   only R66Slot defines it, so it shows on Slot admin alone.
 *
 * Font sizes — each theme has its own (the ⚙ on a theme row). The settings
 * panel lists every text size used on the page being viewed and changes apply
 * live; Save keeps them, × goes back to the theme list and drops anything
 * unsaved. They resize text in the admin <main> only (the header has its own
 * autofit), as a <style> tag rendered by AdminSkinMain.
 *
 * Scope is the admin <main> content only — the header and its menus keep the
 * site's brand colours. Theme and font choices are per admin user, per browser
 * (localStorage keyed by username); nothing is stored on the server.
 */

import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ACCOUNT_SKINS,
  DEFAULT_SKIN_ID,
  SKIN_STORAGE_KEY,
  getSkin,
  skinStyle,
  type AccountSkin,
} from '@/lib/account-skins'
import { AdminAuthContext } from '@/lib/admin-auth-context'
import AdminPopupMover from '@/components/admin/AdminPopupMover'

/** Client skins that are never offered on admin. */
const ADMIN_EXCLUDED_SKINS = ['chrome', 'pitlane', 'emerald', 'carbon', 'midnight', 'plum', 'mono']

const DEFAULT_THEME = {
  ...getSkin(DEFAULT_SKIN_ID),
  name: 'Default',
  blurb: 'The standard admin look.',
}

export const ADMIN_THEMES: AccountSkin[] = [
  DEFAULT_THEME,
  ...ACCOUNT_SKINS.filter((s) => s.id !== DEFAULT_SKIN_ID && !ADMIN_EXCLUDED_SKINS.includes(s.id)),
]

const themeName = (id: string) => ADMIN_THEMES.find((t) => t.id === id)?.name || 'Default'

const isAdminTheme = (id: unknown): id is string =>
  typeof id === 'string' && ADMIN_THEMES.some((t) => t.id === id)

const storageKey = (username: string | null) => `${SKIN_STORAGE_KEY}.admin.${username || 'default'}`
const fontsKey = (username: string | null, themeId: string) => `${storageKey(username)}.fonts.${themeId}`

function readLocal(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* private browsing — the choice just won't be remembered */
  }
}

/** Keeps the content area and the Themes pop-up in step without a provider. */
const EVENT = 'r66-admin-skin'
const FONT_EVENT = 'r66-admin-fonts'

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

// ── Font sizes ──────────────────────────────────────────────────────────────

/** Size token → px. Keys are Tailwind size classes, plus 'base' for text with
 *  no size class (it inherits the <main> font size). */
type FontMap = Record<string, number>

const NAMED_PX: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
  'text-6xl': 60,
}
const NAMED_LABEL: Record<string, string> = {
  'text-xs': 'Extra small',
  'text-sm': 'Small',
  'text-base': 'Normal',
  'text-lg': 'Large',
  'text-xl': 'Extra large',
  'text-2xl': 'Heading',
  'text-3xl': 'Big heading',
  'text-4xl': 'Title',
  'text-5xl': 'Big title',
  'text-6xl': 'Huge',
}
const SIZE_TOKEN = /^text-(?:xs|sm|base|lg|xl|[2-6]xl|\[\d+(?:\.\d+)?(?:px|rem)\])$/
const MIN_PX = 8
const MAX_PX = 40

function defaultPx(token: string): number {
  if (token === 'base') return 16
  if (NAMED_PX[token]) return NAMED_PX[token]
  const m = token.match(/\[(\d+(?:\.\d+)?)(px|rem)\]/)
  if (!m) return 16
  return m[2] === 'rem' ? Math.round(parseFloat(m[1]) * 16) : parseFloat(m[1])
}

function sizeLabel(token: string): string {
  if (token === 'base') return 'Body text'
  if (NAMED_LABEL[token]) return NAMED_LABEL[token]
  const px = defaultPx(token)
  return px <= 10 ? 'Tiny' : px <= 11 ? 'Fine print' : 'Custom'
}

/** Every size class on the page being viewed, smallest first, with counts. */
function scanPageSizes(): { token: string; count: number }[] {
  const counts = new Map<string, number>([['base', 0]])
  document.querySelectorAll('main[data-admin-main] [class]').forEach((el) => {
    el.classList.forEach((c) => {
      if (SIZE_TOKEN.test(c)) counts.set(c, (counts.get(c) || 0) + 1)
    })
  })
  return [...counts.entries()]
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => defaultPx(a.token) - defaultPx(b.token) || a.token.localeCompare(b.token))
}

function fontsCss(fonts: FontMap | null): string {
  if (!fonts) return ''
  return Object.entries(fonts)
    .filter(([token, px]) => px !== defaultPx(token))
    .map(([token, px]) =>
      token === 'base'
        ? `main[data-admin-main]{font-size:${px}px}`
        : `main[data-admin-main] [class~="${token}"]{font-size:${px}px!important;line-height:1.35!important}`,
    )
    .join('\n')
}

function readJson<T>(key: string): T | null {
  try {
    const raw = readLocal(key)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as T) : null
  } catch {
    return null
  }
}
const readFonts = (username: string | null, themeId: string) => readJson<FontMap>(fontsKey(username, themeId))

// ── Edited items (click-to-edit) ────────────────────────────────────────────

/** One edited item. `sel` matches every element styled like the one clicked —
 *  all of its classes — on any admin page. */
type StyleRule = { sel: string; label: string; size?: number; color?: string; bold?: boolean; bg?: string }

const rulesKey = (username: string | null, themeId: string) => `${storageKey(username)}.styles.${themeId}`
const readRules = (username: string | null, themeId: string) => {
  const r = readJson<StyleRule[]>(rulesKey(username, themeId))
  return Array.isArray(r) ? r : null
}

/** Never-matching id: lifts edited items above every other !important colour
 *  rule (the readability layer's @scope rules use the same trick). */
const LIFT = ':is(*,#_edit)'

function rulesCss(rules: StyleRule[] | null): string {
  if (!rules) return ''
  const out: string[] = []
  for (const r of rules) {
    const s = r.sel + LIFT
    if (r.size) out.push(`${s}{font-size:${r.size}px!important;line-height:1.35!important}`)
    if (r.bg) out.push(`${s}{background-color:${r.bg}!important}`)
    const text = [r.color && `color:${r.color}!important`, r.bold !== undefined && `font-weight:${r.bold ? 700 : 400}!important`]
      .filter(Boolean)
      .join(';')
    if (text) out.push(`${s},${r.sel} *${LIFT}{${text}}`)
  }
  return out.join('\n')
}

/** Classes that say how an element looks; state variants (hover:, md:) and
 *  behaviour classes are left out so every matching item is caught. */
const IGNORED_CLASS = /:|^(group|peer|transition|duration-|ease-|animate-|cursor-|select-|pointer-events-|truncate$)/

function selectorFor(el: Element | null): { sel: string; el: Element } | null {
  while (el && el.matches('main[data-admin-main] *')) {
    const classes = [...el.classList].filter((c) => !IGNORED_CLASS.test(c))
    if (classes.length) return { sel: `main[data-admin-main] ${el.tagName.toLowerCase()}.${classes.map((c) => CSS.escape(c)).join('.')}`, el }
    el = el.parentElement
  }
  return null
}

function labelFor(el: Element): string {
  const t = (el.textContent || '').replace(/\s+/g, ' ').trim()
  return t ? (t.length > 40 ? t.slice(0, 40) + '…' : t) : `<${el.tagName.toLowerCase()}>`
}

/** Live preview: { themeId, fonts, rules } previews; null for both goes back
 *  to what is saved. */
type FontDetail = { themeId: string; fonts: FontMap | null; rules: StyleRule[] | null }
const announceFonts = (detail: FontDetail) => window.dispatchEvent(new CustomEvent(FONT_EVENT, { detail }))

function useAppliedStyles(themeId: string): string {
  const { username } = useContext(AdminAuthContext)
  const [fonts, setFonts] = useState<FontMap | null>(null)
  const [rules, setRules] = useState<StyleRule[] | null>(null)

  useEffect(() => {
    setFonts(readFonts(username, themeId))
    setRules(readRules(username, themeId))
    const onChange = (e: Event) => {
      const d = (e as CustomEvent<FontDetail>).detail
      if (d.themeId !== themeId) return
      setFonts(d.fonts ?? readFonts(username, themeId))
      setRules(d.rules ?? readRules(username, themeId))
    }
    window.addEventListener(FONT_EVENT, onChange)
    return () => window.removeEventListener(FONT_EVENT, onChange)
  }, [username, themeId])

  return [fontsCss(fonts), rulesCss(rules)].filter(Boolean).join('\n')
}

// ── Content area ────────────────────────────────────────────────────────────

/** Replaces the admin layout's <main>; applies the theme and font sizes to the
 *  content only, and makes every admin pop-up movable. */
export function AdminSkinMain({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [themeId] = useAdminThemeId()
  const skin = getSkin(themeId)
  const css = useAppliedStyles(skin.id)

  const extras = (
    <>
      {css && <style data-admin-fonts>{css}</style>}
      <AdminPopupMover />
    </>
  )

  if (skin.id === DEFAULT_SKIN_ID) {
    return (
      <>
        <main className={className} data-admin-main>
          {children}
        </main>
        {extras}
      </>
    )
  }

  return (
    <>
      <main
        className={className}
        data-admin-main
        data-skin={skin.id}
        data-skin-dark={skin.dark ? '1' : '0'}
        // The livery stripes are for the client account canvas; on admin pages
        // they show between cards, so the content area keeps a plain canvas.
        style={{ ...skinStyle(skin), backgroundImage: 'none' }}
      >
        {children}
      </main>
      {extras}
    </>
  )
}

// ── Pop-up ──────────────────────────────────────────────────────────────────

const iconBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 0,
  background: '#F3F4F6',
  color: '#374151',
  fontSize: 18,
  lineHeight: 1,
  cursor: 'pointer',
  flexShrink: 0,
}
const smallBtn: React.CSSProperties = {
  minWidth: 30,
  height: 30,
  padding: '0 8px',
  borderRadius: 7,
  border: '1px solid #D1D5DB',
  background: '#FFFFFF',
  color: '#111827',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

/**
 * Settings → Themes pop-up. A theme pick saves straight away; the pop-up closes
 * on the × button, a click outside the box, or Escape. The ⚙ on a theme swaps
 * the box to that theme's font settings, which stay open while you work —
 * there is no backdrop then, so the page can be scrolled and checked. Colours
 * are inline on purpose: the box sits outside the skinned area and must look
 * the same whatever theme is on. Movable and resizable via AdminPopupMover.
 */
export function AdminThemesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [themeId, setThemeId] = useAdminThemeId()
  const [settingsFor, setSettingsFor] = useState<string | null>(null)

  useEffect(() => {
    if (open) setSettingsFor(null)
  }, [open])

  useEffect(() => {
    if (!open || settingsFor) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, settingsFor])

  if (!open) return null
  const inSettings = settingsFor !== null

  return (
    <div
      data-movable-popup
      onClick={inSettings ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: inSettings ? 'transparent' : 'rgba(17, 24, 39, 0.35)',
        // Settings stay open while the page is used: the overlay lets clicks
        // and scrolling through, only the box catches them.
        pointerEvents: inSettings ? 'none' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal={!inSettings}
        aria-label={inSettings ? 'Font settings' : 'Themes'}
        data-skin-swatches
        onClick={(e) => e.stopPropagation()}
        style={{
          pointerEvents: 'auto',
          width: 440,
          height: 'min(78vh, 640px)',
          background: '#FFFFFF',
          color: '#111827',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {inSettings ? (
          <FontSettings themeId={settingsFor} onBack={() => setSettingsFor(null)} />
        ) : (
          <ThemeList
            themeId={themeId}
            onPick={setThemeId}
            onSettings={(id) => {
              setThemeId(id)
              setSettingsFor(id)
            }}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

function PanelHeader({
  title,
  subtitle,
  onClose,
  closeLabel,
}: {
  title: string
  subtitle: string
  onClose: () => void
  closeLabel: string
}) {
  return (
    <div
      title="Drag to move · drag the bottom-right corner to resize"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #E5E7EB',
        cursor: 'move',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#4B5563' }}>{subtitle}</div>
      </div>
      <button type="button" onClick={onClose} aria-label={closeLabel} title={closeLabel} style={iconBtn}>
        ×
      </button>
    </div>
  )
}

function ThemeList({
  themeId,
  onPick,
  onSettings,
  onClose,
}: {
  themeId: string
  onPick: (id: string) => void
  onSettings: (id: string) => void
  onClose: () => void
}) {
  return (
    <>
      <PanelHeader title="Themes" subtitle="Saved as soon as you pick one. ⚙ edits the page for that theme." onClose={onClose} closeLabel="Close" />
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {ADMIN_THEMES.map((t) => {
          const selected = t.id === themeId
          return (
            <div
              key={t.id}
              role="button"
              tabIndex={0}
              onClick={() => onPick(t.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onPick(t.id)
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
                flexShrink: 0,
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
                <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                <div style={{ fontSize: 13, color: '#4B5563' }}>{t.blurb}</div>
              </div>
              {selected && (
                <span aria-hidden style={{ color: t.colors.accent, fontWeight: 700, fontSize: 16 }}>
                  ✓
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSettings(t.id)
                }}
                aria-label={`${t.name} font settings`}
                title="Theme settings — edit the page"
                style={{ ...iconBtn, fontSize: 16 }}
              >
                ⚙
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}

function FontSettings({ themeId, onBack }: { themeId: string; onBack: () => void }) {
  const { username } = useContext(AdminAuthContext)
  const [sizes, setSizes] = useState<{ token: string; count: number }[]>([])
  const [saved, setSaved] = useState<FontMap>({})
  const [draft, setDraft] = useState<FontMap>({})
  const [savedRules, setSavedRules] = useState<StyleRule[]>([])
  const [rules, setRules] = useState<StyleRule[]>([])
  const [selected, setSelected] = useState<{ sel: string; label: string } | null>(null)
  const [flash, setFlash] = useState('')

  useEffect(() => {
    const s = readFonts(username, themeId) || {}
    const r = readRules(username, themeId) || []
    setSaved(s)
    setDraft(s)
    setSavedRules(r)
    setRules(r)
    setSelected(null)
    setSizes(scanPageSizes())
  }, [username, themeId])

  const pxOf = (token: string) => draft[token] ?? defaultPx(token)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved) || JSON.stringify(rules) !== JSON.stringify(savedRules)

  const update = (next: FontMap) => {
    // Sizes back at their default are dropped, so the stored map stays small.
    const clean: FontMap = {}
    for (const [k, v] of Object.entries(next)) if (v !== defaultPx(k)) clean[k] = v
    setDraft(clean)
    announceFonts({ themeId, fonts: clean, rules })
  }

  const setRulesLive = (next: StyleRule[]) => {
    // An item with nothing left set is dropped.
    const clean = next.filter((r) => r.size || r.color || r.bg || r.bold !== undefined)
    setRules(clean)
    announceFonts({ themeId, fonts: draft, rules: clean })
  }
  const current = selected ? rules.find((r) => r.sel === selected.sel) : undefined
  const editSelected = (patch: Partial<StyleRule>) => {
    if (!selected) return
    const base: StyleRule = current || { sel: selected.sel, label: selected.label }
    const merged = { ...base, ...patch }
    for (const k of Object.keys(patch) as (keyof StyleRule)[]) if (patch[k] === undefined) delete merged[k]
    setRulesLive(current ? rules.map((r) => (r.sel === selected.sel ? merged : r)) : [...rules, merged])
  }
  const setPx = (token: string, px: number) =>
    update({ ...draft, [token]: Math.min(MAX_PX, Math.max(MIN_PX, Math.round(px))) })
  const bumpAll = (by: number) => {
    const next: FontMap = { ...draft }
    for (const { token } of sizes) next[token] = Math.min(MAX_PX, Math.max(MIN_PX, pxOf(token) + by))
    update(next)
  }
  const save = () => {
    writeLocal(fontsKey(username, themeId), Object.keys(draft).length ? JSON.stringify(draft) : null)
    writeLocal(rulesKey(username, themeId), rules.length ? JSON.stringify(rules) : null)
    setSaved(draft)
    setSavedRules(rules)
    announceFonts({ themeId, fonts: null, rules: null })
    setFlash('Saved ✓')
    window.setTimeout(() => setFlash(''), 1800)
  }
  const back = () => {
    announceFonts({ themeId, fonts: null, rules: null }) // drops anything unsaved
    onBack()
  }

  const curSize = current?.size ?? (selected ? Math.round(parseFloat(firstMatchStyle(selected.sel, 'fontSize')) || 14) : 14)

  return (
    <>
      <PanelHeader
        title={`${themeName(themeId)} — Theme settings`}
        subtitle="Click anything on the page to edit it. Save to keep; × goes back to Themes."
        onClose={back}
        closeLabel="Back to Themes"
      />
      <PageEditor selected={selected?.sel ?? null} onSelect={setSelected} />

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 16px' }}>
        {/* ── Selected item ── */}
        <div style={{ padding: '6px 0 12px', borderBottom: '1px solid #E5E7EB' }}>
          {!selected ? (
            <div style={{ fontSize: 14, color: '#4B5563', padding: '10px 12px', background: '#F3F4F6', borderRadius: 8 }}>
              👆 Click any text, row or box on the page. Everything styled the same way — on every admin page — changes with it.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    “{selected.label}”
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>{matchCount(selected.sel)} matching on this page</div>
                </div>
                <button type="button" style={smallBtn} onClick={() => setSelected(null)} title="Stop editing this item">
                  Done
                </button>
              </div>
              <Row label="Size">
                <button type="button" style={smallBtn} onClick={() => editSelected({ size: Math.max(MIN_PX, curSize - 1) })}>
                  −
                </button>
                <input
                  type="number"
                  min={MIN_PX}
                  max={MAX_PX}
                  value={curSize}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v)) editSelected({ size: Math.min(MAX_PX, Math.max(MIN_PX, Math.round(v))) })
                  }}
                  aria-label="Selected item size in px"
                  style={{ width: 56, height: 30, textAlign: 'center', border: '1px solid #D1D5DB', borderRadius: 7, fontSize: 14, color: '#111827', background: '#FFFFFF' }}
                />
                <button type="button" style={smallBtn} onClick={() => editSelected({ size: Math.min(MAX_PX, curSize + 1) })}>
                  +
                </button>
                {current?.size && (
                  <button type="button" style={smallBtn} onClick={() => editSelected({ size: undefined })} title="Back to the theme's size">
                    ↺
                  </button>
                )}
              </Row>
              <Row label="Text colour">
                <input
                  type="color"
                  value={current?.color || toHex(firstMatchStyle(selected.sel, 'color'))}
                  onChange={(e) => editSelected({ color: e.target.value })}
                  aria-label="Selected item text colour"
                  style={{ width: 44, height: 30, border: '1px solid #D1D5DB', borderRadius: 7, padding: 2, background: '#FFFFFF' }}
                />
                {['#FFFFFF', '#111827', '#FFCC00', '#E21B4D', '#22C55E', '#3B82F6'].map((c) => (
                  <button key={c} type="button" onClick={() => editSelected({ color: c })} title={c} aria-label={`Text colour ${c}`}
                    style={{ width: 24, height: 24, borderRadius: 9999, border: '1px solid #9CA3AF', background: c, cursor: 'pointer', padding: 0 }} />
                ))}
                {current?.color && (
                  <button type="button" style={smallBtn} onClick={() => editSelected({ color: undefined })} title="Back to the theme's colour">
                    ↺
                  </button>
                )}
              </Row>
              <Row label="Bold">
                {([['Theme', undefined], ['Bold', true], ['Normal', false]] as const).map(([name, v]) => (
                  <button key={name} type="button" onClick={() => editSelected({ bold: v })}
                    style={{ ...smallBtn, background: current?.bold === v ? '#2563EB' : '#FFFFFF', color: current?.bold === v ? '#FFFFFF' : '#111827', fontWeight: name === 'Bold' ? 800 : 500 }}>
                    {name}
                  </button>
                ))}
              </Row>
              <Row label="Background">
                <input
                  type="color"
                  value={current?.bg || toHex(firstMatchStyle(selected.sel, 'backgroundColor'))}
                  onChange={(e) => editSelected({ bg: e.target.value })}
                  aria-label="Selected item background colour"
                  style={{ width: 44, height: 30, border: '1px solid #D1D5DB', borderRadius: 7, padding: 2, background: '#FFFFFF' }}
                />
                {current?.bg && (
                  <button type="button" style={smallBtn} onClick={() => editSelected({ bg: undefined })} title="Back to the theme's background">
                    ↺
                  </button>
                )}
              </Row>
            </div>
          )}
          {rules.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Edited items ({rules.length})</div>
              {rules.map((r) => (
                <div key={r.sel} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                  <button type="button" onClick={() => setSelected({ sel: r.sel, label: r.label })}
                    style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'transparent', color: '#1D4ED8', fontSize: 13, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: 0 }}>
                    “{r.label}”{r.size ? ` · ${r.size}px` : ''}{r.bold !== undefined ? (r.bold ? ' · bold' : ' · normal') : ''}
                  </button>
                  {r.color && <span title="Text colour" style={{ width: 14, height: 14, borderRadius: 9999, background: r.color, border: '1px solid #9CA3AF' }} />}
                  {r.bg && <span title="Background" style={{ width: 14, height: 14, borderRadius: 3, background: r.bg, border: '1px solid #9CA3AF' }} />}
                  <button type="button" onClick={() => setRulesLive(rules.filter((x) => x.sel !== r.sel))} aria-label={`Remove edit for ${r.label}`} title="Undo this item"
                    style={{ border: 0, background: 'transparent', color: '#6B7280', cursor: 'pointer', fontSize: 15 }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 0 6px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600 }}>All sizes</span>
        <button type="button" style={smallBtn} onClick={() => bumpAll(-1)} title="Make every size 1px smaller">
          A−
        </button>
        <button type="button" style={smallBtn} onClick={() => bumpAll(1)} title="Make every size 1px bigger">
          A+
        </button>
        <button type="button" style={smallBtn} onClick={() => update({})} title="Back to the standard sizes">
          Reset sizes
        </button>
        <button
          type="button"
          style={smallBtn}
          onClick={() => setSizes(scanPageSizes())}
          title="Look again at the page — use after opening a different page"
        >
          ↻ Rescan page
        </button>
      </div>

        {sizes.map(({ token, count }) => {
          const px = pxOf(token)
          const changed = px !== defaultPx(token)
          return (
            <div
              key={token}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '4px 10px',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid #F3F4F6',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {sizeLabel(token)}{' '}
                  <span style={{ fontWeight: 400, color: '#6B7280', fontSize: 12 }}>
                    {token === 'base' ? 'no size set' : token} · standard {defaultPx(token)}px
                    {token !== 'base' && ` · ${count} on page`}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: px,
                    lineHeight: 1.3,
                    color: changed ? '#111827' : '#374151',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Sample text 123
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button type="button" style={smallBtn} onClick={() => setPx(token, px - 1)} aria-label={`Smaller ${token}`}>
                  −
                </button>
                <input
                  type="number"
                  min={MIN_PX}
                  max={MAX_PX}
                  value={px}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    if (!isNaN(v)) setPx(token, v)
                  }}
                  aria-label={`${token} size in px`}
                  style={{
                    width: 56,
                    height: 30,
                    textAlign: 'center',
                    border: `1px solid ${changed ? '#2563EB' : '#D1D5DB'}`,
                    borderRadius: 7,
                    fontSize: 14,
                    color: '#111827',
                    background: '#FFFFFF',
                  }}
                />
                <button type="button" style={smallBtn} onClick={() => setPx(token, px + 1)} aria-label={`Bigger ${token}`}>
                  +
                </button>
              </div>
              <input
                type="range"
                min={MIN_PX}
                max={MAX_PX}
                value={px}
                onChange={(e) => setPx(token, parseFloat(e.target.value))}
                aria-label={`${token} size slider`}
                style={{ gridColumn: '1 / -1', width: '100%' }}
              />
            </div>
          )
        })}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '12px 16px',
          borderTop: '1px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 13, color: flash ? '#047857' : '#6B7280', fontWeight: flash ? 600 : 400 }}>
          {flash || (dirty ? 'Unsaved changes' : 'No unsaved changes')}
        </span>
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          style={{
            height: 36,
            padding: '0 18px',
            borderRadius: 8,
            border: 0,
            background: dirty ? '#2563EB' : '#9CA3AF',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 700,
            cursor: dirty ? 'pointer' : 'default',
          }}
        >
          Save
        </button>
      </div>
    </>
  )
}

// ── Page editor helpers ─────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ width: 86, fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</span>
      {children}
    </div>
  )
}

function safeAll(sel: string): Element[] {
  try {
    return [...document.querySelectorAll(sel)]
  } catch {
    return []
  }
}
const matchCount = (sel: string) => safeAll(sel).length

function firstMatchStyle(sel: string, prop: 'fontSize' | 'color' | 'backgroundColor'): string {
  const el = safeAll(sel)[0]
  return el ? getComputedStyle(el)[prop] : ''
}

/** Computed colour (rgb(), rgba() or color(srgb …)) → #rrggbb for <input type=color>. */
function toHex(css: string): string {
  const m = css.match(/[\d.]+/g)
  if (!m || m.length < 3) return '#000000'
  const k = css.startsWith('color(') ? 255 : 1
  return '#' + m.slice(0, 3).map((v) => Math.round(parseFloat(v) * k).toString(16).padStart(2, '0')).join('')
}

/**
 * Edit mode on the page while Theme settings are open: hovering outlines what a
 * click would pick, a click selects it (and does nothing else — links and
 * buttons in the content area don't fire), and every item matching the
 * selection is outlined. Only the admin <main> is editable.
 */
function PageEditor({ selected, onSelect }: { selected: string | null; onSelect: (s: { sel: string; label: string } | null) => void }) {
  const layer = useRef<HTMLDivElement | null>(null)
  const hovered = useRef<Element | null>(null)
  const selRef = useRef(selected)
  selRef.current = selected
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const inMain = (t: EventTarget | null) => t instanceof Element && !!t.closest('main[data-admin-main]')
    const block = (e: Event) => {
      if (!inMain(e.target)) return
      e.preventDefault()
      e.stopPropagation()
    }
    const onMove = (e: PointerEvent) => {
      hovered.current = inMain(e.target) ? selectorFor(e.target as Element)?.el ?? null : null
    }
    const onClick = (e: MouseEvent) => {
      if (!inMain(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      const s = selectorFor(e.target as Element)
      if (s) onSelect({ sel: s.sel, label: labelFor(s.el) })
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSelect(null)
    }
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerdown', block, true)
    document.addEventListener('mousedown', block, true)
    document.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKey)

    // Outlines follow scrolling and live edits: redrawn every frame.
    let raf = 0
    const box = (r: DOMRect, style: string) =>
      `<div style="position:fixed;left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px;${style}"></div>`
    const draw = () => {
      const el = layer.current
      if (el) {
        let html = ''
        if (selRef.current)
          for (const m of safeAll(selRef.current).slice(0, 200)) {
            const r = m.getBoundingClientRect()
            if (r.bottom > 0 && r.top < window.innerHeight && r.width) html += box(r, 'border:2px dashed #F59E0B;border-radius:4px')
          }
        if (hovered.current) html += box(hovered.current.getBoundingClientRect(), 'border:2px solid #3B82F6;border-radius:4px;background:rgba(59,130,246,.08)')
        el.innerHTML = html
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerdown', block, true)
      document.removeEventListener('mousedown', block, true)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [onSelect])

  if (!mounted) return null
  return createPortal(
    <>
      <style>{'main[data-admin-main], main[data-admin-main] * { cursor: crosshair !important; }'}</style>
      <div ref={layer} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 59, pointerEvents: 'none' }} />
    </>,
    document.body,
  )
}
