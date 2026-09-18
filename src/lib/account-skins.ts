/**
 * Account Skins — client-chosen colour schemes for the customer back office
 * (My Account, including the Supplier Pre Orders sheet).
 *
 * A skin is nothing but a set of CSS custom properties. The rules that consume
 * them live in src/styles/account-skins.css, which remaps the grayscale/primary
 * Tailwind utilities used inside the account area onto these variables. That is
 * deliberate: a skin must never require a page to be rewritten, so adding a new
 * skin is a few colours added here and nothing else.
 *
 * The 'classic' skin reproduces the account area exactly as it looked before
 * skins existed, so a client who never picks one sees no change at all.
 */

import type { CSSProperties } from 'react'

export interface SkinColors {
  /** Page canvas behind the cards. */
  bg: string
  /** Card / panel surface. */
  surface: string
  /** Subtle fill: hover rows, chips, inputs. */
  surface2: string
  /** Hairlines and dividers. */
  border: string
  /** Headings and body copy. */
  text: string
  /** Secondary copy. */
  muted: string
  /** Tertiary copy: timestamps, counts, placeholders. */
  faint: string
  /** Brand/action colour — active nav, primary buttons, selected chips. */
  accent: string
  /** Text drawn on top of accent. */
  accentFg: string
  /** Pressed/hover state of accent. */
  accentDark: string
  /** The heavy neutral button (Tailwind bg-gray-900 in the source). */
  strong: string
  /** Text drawn on top of strong. */
  strongFg: string
  /** Form control fill. */
  inputBg: string
}

export interface AccountSkin {
  id: string
  name: string
  /** One line shown under the name in the picker. */
  blurb: string
  /** True for skins with a dark canvas — drives the tinted-badge rules. */
  dark: boolean
  colors: SkinColors
}

export const ACCOUNT_SKINS: AccountSkin[] = [
  {
    id: 'classic',
    name: 'Route 66',
    blurb: 'The original — white cards, racing red.',
    dark: false,
    colors: {
      bg: '#F9FAFB',
      surface: '#FFFFFF',
      surface2: '#F3F4F6',
      border: '#E5E7EB',
      text: '#111827',
      muted: '#4B5563',
      faint: '#9CA3AF',
      accent: '#DC2626',
      accentFg: '#000000',
      accentDark: '#991B1B',
      strong: '#111827',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'chrome',
    name: 'Chrome',
    blurb: 'Cool steel and slate. Quiet and businesslike.',
    dark: false,
    colors: {
      bg: '#EEF1F5',
      surface: '#FFFFFF',
      surface2: '#E3E8EF',
      border: '#D3DAE3',
      text: '#0F172A',
      muted: '#475569',
      faint: '#8A96A8',
      accent: '#334155',
      accentFg: '#FFFFFF',
      accentDark: '#1E293B',
      strong: '#0F172A',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'pitlane',
    name: 'Pit Lane',
    blurb: 'Warm paper with a chrome-yellow stripe.',
    dark: false,
    colors: {
      bg: '#FAF9F4',
      surface: '#FFFFFF',
      surface2: '#F4F0E4',
      border: '#E6E0CE',
      text: '#1C1917',
      muted: '#57534E',
      faint: '#A8A29E',
      accent: '#F2B01E',
      accentFg: '#1C1917',
      accentDark: '#D4930A',
      strong: '#1C1917',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    blurb: 'Soft green — easy on the eyes for long lists.',
    dark: false,
    colors: {
      bg: '#F2FAF6',
      surface: '#FFFFFF',
      surface2: '#E6F4EC',
      border: '#CFE7DA',
      text: '#0B2E20',
      muted: '#3F6B58',
      faint: '#87A99A',
      accent: '#059669',
      accentFg: '#FFFFFF',
      accentDark: '#047857',
      strong: '#0B2E20',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'carbon',
    name: 'Carbon',
    blurb: 'Dark graphite with the racing red kept.',
    dark: true,
    colors: {
      bg: '#0B0B0D',
      surface: '#17181B',
      surface2: '#212329',
      border: '#2E3138',
      text: '#F3F4F6',
      muted: '#B6BBC4',
      faint: '#868D99',
      accent: '#E23B3B',
      accentFg: '#FFFFFF',
      accentDark: '#B92727',
      strong: '#E5E7EB',
      strongFg: '#111827',
      inputBg: '#1F2126',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    blurb: 'Deep navy with a clear blue accent.',
    dark: true,
    colors: {
      bg: '#0A101E',
      surface: '#131C2E',
      surface2: '#1C2740',
      border: '#28344C',
      text: '#E8EEF8',
      muted: '#A9B6CC',
      faint: '#7E8CA6',
      accent: '#3B82F6',
      accentFg: '#FFFFFF',
      accentDark: '#2563EB',
      strong: '#E8EEF8',
      strongFg: '#0A101E',
      inputBg: '#1A2438',
    },
  },
  {
    id: 'plum',
    name: 'Plum',
    blurb: 'Dark violet. Loud without being red.',
    dark: true,
    colors: {
      bg: '#120C18',
      surface: '#1D1426',
      surface2: '#281B34',
      border: '#382747',
      text: '#F4EDFA',
      muted: '#C3B4D1',
      faint: '#94849F',
      accent: '#A855F7',
      accentFg: '#17091F',
      accentDark: '#8B37DC',
      strong: '#F4EDFA',
      strongFg: '#17091F',
      inputBg: '#251830',
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    blurb: 'Black, white and nothing else. Maximum contrast.',
    dark: false,
    colors: {
      bg: '#FFFFFF',
      surface: '#FFFFFF',
      surface2: '#F1F1F1',
      border: '#C9C9C9',
      text: '#000000',
      muted: '#333333',
      faint: '#6B6B6B',
      accent: '#000000',
      accentFg: '#FFFFFF',
      accentDark: '#333333',
      strong: '#000000',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
]

export const DEFAULT_SKIN_ID = 'classic'

/** localStorage key — the skin is applied from here before the API answers. */
export const SKIN_STORAGE_KEY = 'r66slot.accountSkin'

export function getSkin(id: string | null | undefined): AccountSkin {
  return ACCOUNT_SKINS.find((s) => s.id === id) || ACCOUNT_SKINS[0]
}

export function isSkinId(id: unknown): id is string {
  return typeof id === 'string' && ACCOUNT_SKINS.some((s) => s.id === id)
}

/** The inline custom-property block applied to the account wrapper. */
export function skinStyle(skin: AccountSkin): CSSProperties {
  const c = skin.colors
  return {
    '--skin-bg': c.bg,
    '--skin-surface': c.surface,
    '--skin-surface-2': c.surface2,
    '--skin-border': c.border,
    '--skin-text': c.text,
    '--skin-muted': c.muted,
    '--skin-faint': c.faint,
    '--skin-accent': c.accent,
    '--skin-accent-fg': c.accentFg,
    '--skin-accent-dark': c.accentDark,
    '--skin-strong': c.strong,
    '--skin-strong-fg': c.strongFg,
    '--skin-input-bg': c.inputBg,
  } as CSSProperties
}
