import { NextResponse } from 'next/server'
import { getSettings, updateSettings } from '@/lib/site-settings/storage'

export const dynamic = 'force-dynamic'

// GET /api/settings - Get public site settings (no auth required)
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

// PUT /api/settings - Update settings (admin use)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const updated = await updateSettings(body)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
