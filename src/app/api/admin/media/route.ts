import { NextResponse } from 'next/server'
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

const DEFAULT_LIBRARY: MediaLibrary = {
  files: [],
  folders: ['All Files'],
}

// GET /api/admin/media - Get all media files
export async function GET() {
  try {
    const library = await blobRead<MediaLibrary>(MEDIA_KEY, DEFAULT_LIBRARY)
    return NextResponse.json(library)
  } catch (error) {
    console.error('Error fetching media:', error)
    return NextResponse.json(DEFAULT_LIBRARY)
  }
}

// PUT /api/admin/media - Save media library state
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    await blobWrite(MEDIA_KEY, body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving media:', error)
    return NextResponse.json({ error: 'Failed to save media' }, { status: 500 })
  }
}
