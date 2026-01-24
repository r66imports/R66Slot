import { NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/lib/site-settings/storage'

// GET /api/admin/settings - Get current settings
export async function GET() {
  try {
    const settings = await getSettings()
    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST /api/admin/settings - Update settings
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const updated = await updateSettings(body)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
