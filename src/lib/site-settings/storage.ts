import { promises as fs } from 'fs'
import path from 'path'
import { SiteSettings, defaultSettings } from './schema'

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'site-settings.json')

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  try {
    await fs.access(dataDir)
  } catch {
    await fs.mkdir(dataDir, { recursive: true })
  }
}

// Get current settings
export async function getSettings(): Promise<SiteSettings> {
  try {
    await ensureDataDir()
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    // If file doesn't exist, return default settings
    return defaultSettings
  }
}

// Update settings
export async function updateSettings(
  settings: Partial<SiteSettings>
): Promise<SiteSettings> {
  await ensureDataDir()

  // Get current settings
  const current = await getSettings()

  // Merge with updates
  const updated = { ...current, ...settings }

  // Save to file
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf-8')

  return updated
}

// Reset to defaults
export async function resetSettings(): Promise<SiteSettings> {
  await ensureDataDir()
  await fs.writeFile(
    SETTINGS_FILE,
    JSON.stringify(defaultSettings, null, 2),
    'utf-8'
  )
  return defaultSettings
}
