import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { r2Upload } from '@/lib/r2-storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif']
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type "${file.type}" not allowed` }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`
    const contentType = file.type || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`

    // Upload to Cloudflare R2
    const publicUrl = await r2Upload(`uploads/${fileName}`, buffer, contentType)

    // Register in media_files table (best-effort)
    try {
      await db.query(
        `INSERT INTO media_files (id, name, url, type, size, folder, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (id) DO UPDATE SET url = $3, name = $2`,
        [fileName, file.name || fileName, publicUrl, contentType, file.size, 'All Files']
      )
    } catch (dbErr: any) {
      console.error('[media/upload] media_files index failed:', dbErr?.message)
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error: any) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to upload file' },
      { status: 500 }
    )
  }
}
