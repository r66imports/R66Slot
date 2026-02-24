import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/media
export async function GET() {
  try {
    const result = await db.query(
      `SELECT id, name, url, type, size, folder, uploaded_at FROM media_files ORDER BY uploaded_at DESC`
    )
    const files = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      type: row.type,
      size: row.size,
      folder: row.folder || 'All Files',
      uploadedAt: row.uploaded_at,
    }))
    return NextResponse.json({ files, folders: ['All Files'] })
  } catch (err: any) {
    console.error('[media] Failed to fetch media:', err?.message)
    return NextResponse.json({ files: [], folders: ['All Files'] })
  }
}

// PUT /api/admin/media - no-op, media managed via uploads
export async function PUT() {
  return NextResponse.json({ success: true })
}
