import { blobRead, blobWrite } from '@/lib/blob-storage'
import { SiteSettings, defaultSettings } from './schema'

const SETTINGS_KEY = 'data/site-settings.json'

const CURRENT_NAV = [
  { label: 'New Arrivals', href: '/collections/new-arrivals' },
  { label: 'Pre Order', href: '/book' },
]
const STALE_NAV_LABELS = new Set(['Shop All', 'Brands', 'Blog', 'Pre-Orders'])

export async function getSettings(): Promise<SiteSettings> {
  const settings = await blobRead<SiteSettings>(SETTINGS_KEY, defaultSettings)
  // Migrate nav: if stored nav still contains removed items, replace with current nav
  const storedNav = settings?.header?.navItems ?? []
  const hasStale = storedNav.some((item: any) => STALE_NAV_LABELS.has(item.label))
  if (hasStale) {
    const updated = {
      ...settings,
      header: { ...settings.header, navItems: CURRENT_NAV },
    }
    await blobWrite(SETTINGS_KEY, updated)
    return updated
  }
  return settings
}

export async function updateSettings(
  settings: Partial<SiteSettings>
): Promise<SiteSettings> {
  const current = await getSettings()
  const updated = { ...current, ...settings }
  await blobWrite(SETTINGS_KEY, updated)
  return updated
}

export async function resetSettings(): Promise<SiteSettings> {
  await blobWrite(SETTINGS_KEY, defaultSettings)
  return defaultSettings
}
