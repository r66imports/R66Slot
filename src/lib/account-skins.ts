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
  /** Accent used as text on cards, when the accent itself is too light or dark
   *  to read there (≥ 4.5:1). Falls back to accent. */
  accentText?: string
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
      faint: '#5B6678',
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
      faint: '#706B68',
      accent: '#F2B01E',
      accentFg: '#1C1917',
      accentDark: '#D4930A',
      accentText: '#7A5B1A',
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
      muted: '#386250',
      faint: '#507364',
      accent: '#04845C',
      accentFg: '#FFFFFF',
      accentDark: '#047857',
      accentText: '#066E4C',
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
      accent: '#D43737',
      accentFg: '#FFFFFF',
      accentDark: '#B92727',
      accentText: '#E07F80',
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
      faint: '#8290A9',
      accent: '#3472D8',
      accentFg: '#FFFFFF',
      accentDark: '#2563EB',
      accentText: '#759FE4',
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
      accentText: '#BA79F8',
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
  // Gulf Racing — powder blue and orange livery. Stripes and swatch are in
  // account-skin-gulf.css.
  {
    id: 'gulf',
    name: 'Gulf Racing',
    blurb: 'Powder blue and orange — the classic Le Mans livery.',
    dark: false,
    colors: {
      bg: '#E3F1FA',
      surface: '#FFFFFF',
      surface2: '#EAF5FC',
      border: '#B4D9EF',
      text: '#14205A',
      muted: '#3A4C7C',
      faint: '#556692',
      accent: '#F26B1D',
      accentFg: '#14205A',
      accentDark: '#D2550C',
      accentText: '#954C37',
      strong: '#14205A',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  // Red Bull Racing — matte navy, red and yellow livery. Stripes and swatch are
  // in account-skin-redbull.css.
  {
    id: 'redbull',
    name: 'Red Bull Racing',
    blurb: 'Matte navy with a red and yellow livery.',
    dark: true,
    colors: {
      bg: '#0E1631',
      surface: '#18234A',
      surface2: '#212E5A',
      border: '#2F3D6E',
      text: '#F2F4FA',
      muted: '#B7C0D9',
      faint: '#909AB9',
      accent: '#E21B4D',
      accentFg: '#FFFFFF',
      accentDark: '#B8133C',
      accentText: '#EB90AA',
      strong: '#FFCC00',
      strongFg: '#0E1631',
      inputBg: '#152043',
    },
  },
  // Formula 1 teams (2026 grid; Red Bull Racing is above).
  {
    id: 'ferrari',
    name: 'Ferrari',
    blurb: 'Rosso red with a yellow flash.',
    dark: false,
    colors: {
      bg: '#FBF3F2',
      surface: '#FFFFFF',
      surface2: '#F8E6E4',
      border: '#EDCFCB',
      text: '#1A0A0A',
      muted: '#5A3A38',
      faint: '#7A6361',
      accent: '#DC0000',
      accentFg: '#FFFFFF',
      accentDark: '#A80000',
      accentText: '#B90202',
      strong: '#1A0A0A',
      strongFg: '#FFEB00',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'mercedes',
    name: 'Mercedes',
    blurb: 'Black and silver with a teal edge.',
    dark: true,
    colors: {
      bg: '#0B0C0E',
      surface: '#17191C',
      surface2: '#22252A',
      border: '#33373D',
      text: '#F2F4F5',
      muted: '#B8BEC4',
      faint: '#888F97',
      accent: '#00D2BE',
      accentFg: '#04201D',
      accentDark: '#00A896',
      strong: '#C8CDD2',
      strongFg: '#0B0C0E',
      inputBg: '#1D2024',
    },
  },
  {
    id: 'mclaren',
    name: 'McLaren',
    blurb: 'Papaya orange on anthracite.',
    dark: true,
    colors: {
      bg: '#101318',
      surface: '#1A1F27',
      surface2: '#252B35',
      border: '#353D4A',
      text: '#F5F6F8',
      muted: '#BCC3CE',
      faint: '#8C95A4',
      accent: '#FF8000',
      accentFg: '#101318',
      accentDark: '#DB6A00',
      strong: '#47C7FC',
      strongFg: '#101318',
      inputBg: '#202631',
    },
  },
  {
    id: 'astonmartin',
    name: 'Aston Martin',
    blurb: 'Racing green with a lime accent.',
    dark: true,
    colors: {
      bg: '#04201A',
      surface: '#0B2E26',
      surface2: '#123B31',
      border: '#1E4D41',
      text: '#EEF7F3',
      muted: '#A9C9BD',
      faint: '#83A69B',
      accent: '#CEDC00',
      accentFg: '#04201A',
      accentDark: '#AEBB00',
      strong: '#EEF7F3',
      strongFg: '#04201A',
      inputBg: '#0F352C',
    },
  },
  {
    id: 'alpine',
    name: 'Alpine',
    blurb: 'French blue with a pink accent.',
    dark: true,
    colors: {
      bg: '#071A33',
      surface: '#0E2545',
      surface2: '#163056',
      border: '#234169',
      text: '#EEF3FA',
      muted: '#AABBD3',
      faint: '#8A9BB6',
      accent: '#FF87BC',
      accentFg: '#2A0A1A',
      accentDark: '#F062A3',
      strong: '#0090FF',
      strongFg: '#111111',
      inputBg: '#12294C',
    },
  },
  {
    id: 'williams',
    name: 'Williams',
    blurb: 'Bright blue on navy, light and clean.',
    dark: false,
    colors: {
      bg: '#EAF3FF',
      surface: '#FFFFFF',
      surface2: '#DDEBFC',
      border: '#BDD6F5',
      text: '#041E42',
      muted: '#2F4A73',
      faint: '#52698B',
      accent: '#005AFF',
      accentFg: '#FFFFFF',
      accentDark: '#0046C7',
      accentText: '#014ED9',
      strong: '#041E42',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'racingbulls',
    name: 'Racing Bulls',
    blurb: 'White and blue with a red touch.',
    dark: false,
    colors: {
      bg: '#F2F5FC',
      surface: '#FFFFFF',
      surface2: '#E6ECF8',
      border: '#CCD6EC',
      text: '#0A1640',
      muted: '#3B4A78',
      faint: '#58678D',
      accent: '#2B4BDB',
      accentFg: '#FFFFFF',
      accentDark: '#1E38B0',
      strong: '#D7182A',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'haas',
    name: 'Haas',
    blurb: 'White, black and a sharp red.',
    dark: false,
    colors: {
      bg: '#F4F4F5',
      surface: '#FFFFFF',
      surface2: '#EAEAEC',
      border: '#D4D4D8',
      text: '#111113',
      muted: '#4A4A50',
      faint: '#67676D',
      accent: '#E6002D',
      accentFg: '#FFFFFF',
      accentDark: '#B80024',
      accentText: '#BB0328',
      strong: '#111113',
      strongFg: '#FFFFFF',
      inputBg: '#FFFFFF',
    },
  },
  {
    id: 'audi',
    name: 'Audi',
    blurb: 'Titanium grey with a red accent.',
    dark: true,
    colors: {
      bg: '#121314',
      surface: '#1D1F21',
      surface2: '#282A2D',
      border: '#3A3D41',
      text: '#F1F1F1',
      muted: '#BDBFC2',
      faint: '#8F9297',
      accent: '#E60534',
      accentFg: '#FFFFFF',
      accentDark: '#C70029',
      accentText: '#EC8096',
      strong: '#C9CCD0',
      strongFg: '#121314',
      inputBg: '#222427',
    },
  },
  {
    id: 'cadillac',
    name: 'Cadillac',
    blurb: 'Black and white, nothing loud.',
    dark: true,
    colors: {
      bg: '#0A0A0A',
      surface: '#161616',
      surface2: '#222222',
      border: '#343434',
      text: '#F5F5F5',
      muted: '#BDBDBD',
      faint: '#8A8A8A',
      accent: '#F5F5F5',
      accentFg: '#0A0A0A',
      accentDark: '#D4D4D4',
      strong: '#F5F5F5',
      strongFg: '#0A0A0A',
      inputBg: '#1C1C1C',
    },
  },
  // slot-only:start — this block is exempt from the mirror check; do not copy it
  // to R66Emporium. The lanes and chequered swatch are in account-skin-slotcar.css.
  {
    id: 'slotcar',
    name: 'Slotcar',
    blurb: 'Asphalt, silver rails and a racing yellow.',
    dark: true,
    colors: {
      bg: '#26282C',
      surface: '#32353A',
      surface2: '#3D4046',
      border: '#5A5F67',
      text: '#F5F5F2',
      muted: '#C9CCD1',
      faint: '#ABB1B9',
      accent: '#FFD21F',
      accentFg: '#111111',
      accentDark: '#E5B800',
      strong: '#F5F5F2',
      strongFg: '#1A1B1E',
      inputBg: '#2B2E33',
    },
  },
  // slot-only:end
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
    '--skin-accent-text': c.accentText || c.accent,
    '--skin-strong': c.strong,
    '--skin-strong-fg': c.strongFg,
    '--skin-input-bg': c.inputBg,
  } as CSSProperties
}
