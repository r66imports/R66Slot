import { blobRead, blobWrite } from '@/lib/blob-storage'
import { SiteSettings, defaultSettings } from './schema'

const SETTINGS_KEY = 'data/site-settings.json'

export async function getSettings(): Promise<SiteSettings> {
  return await blobRead<SiteSettings>(SETTINGS_KEY, defaultSettings)
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
