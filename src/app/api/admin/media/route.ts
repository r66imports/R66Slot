import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

interface MediaFile {
  id: string
  name: string
  url: string
  type: string
  size: number
  folder: string
  uploadedAt: string
}

interface MediaLibrary {
  files: MediaFile[]
  folders: string[]
}

const MEDIA_KEY = 'data/media-library.json'
const DEFAULT_LIBRARY: MediaLibrary = { files: [], folders: ['All Files'] }

// GET /api/admin/media - Get all media files
export async function GET() {
  // Try blob first
  try {
    const library = await blobRead<MediaLibrary>(MEDIA_KEY, DEFAULT_LIBRARY)
    if (library.files.length > 0) return NextResponse.json(library)
  } catch {
    // blob failed
  }

  // Fallback: read from Supabase media_files table
  try {
    const sb = getSupabaseAdmin()
    const { data, error } = await sb
      .from('media_files')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (error) throw error

    const files: MediaFile[] = (data ?? []).map((row: any) => ({
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
    console.error('[media] Supabase fallback failed:', err?.message)
    return NextResponse.json(DEFAULT_LIBRARY)
  }
}

// PUT /api/admin/media - Save media library state
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    // Dual-write
    try { await blobWrite(MEDIA_KEY, body) } catch {}
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving media:', error)
    return NextResponse.json({ error: 'Failed to save media' }, { status: 500 })
  }
}
