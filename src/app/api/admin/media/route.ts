import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const FOLDERS_KEY = 'data/media-folders.json'

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

    // Merge stored custom folder names with folders derived from DB file data
    const storedFolders = await blobRead<string[]>(FOLDERS_KEY, [])
    const dbFolders = [...new Set(
      files.map((f: any) => f.folder).filter((f: string) => f && f !== 'All Files')
    )]
    const merged = [...new Set([...storedFolders, ...dbFolders])].sort()
    const folders = ['All Files', ...merged]

    return NextResponse.json({ files, folders })
  } catch (err: any) {
    console.error('[media] Failed to fetch media:', err?.message)
    return NextResponse.json({ files: [], folders: ['All Files'] })
  }
}

// PUT /api/admin/media — persist the folder list
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    if (Array.isArray(body.folders)) {
      const customFolders = (body.folders as string[])
        .filter((f) => f !== 'All Files')
        .sort()
      await blobWrite(FOLDERS_KEY, customFolders)
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: true })
  }
}

// PATCH /api/admin/media — move a single file to a different folder
export async function PATCH(request: Request) {
  try {
    const { url, folder } = await request.json()
    await db.query(`UPDATE media_files SET folder = $1 WHERE url = $2`, [folder, url])
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[media] PATCH failed:', err?.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
