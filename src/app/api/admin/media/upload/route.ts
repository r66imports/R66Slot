import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { blobUploadFile, blobRead, blobWrite } from '@/lib/blob-storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif']
    if (file.type && !allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: `File type "${file.type}" not allowed` }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExtension}`
    const contentType = file.type || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`

    let publicUrl = ''

    // Primary: Upload to Supabase Storage
    try {
      const sb = getSupabaseAdmin()
      const { error: uploadError } = await sb.storage
        .from('uploads')
        .upload(fileName, buffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) throw uploadError

      const { data: urlData } = sb.storage.from('uploads').getPublicUrl(fileName)
      publicUrl = urlData.publicUrl
    } catch (supaErr: any) {
      console.error('[media/upload] Supabase Storage failed:', supaErr?.message)
    }

    // Fallback: Upload to Vercel Blob if Supabase failed
    if (!publicUrl) {
      try {
        publicUrl = await blobUploadFile(`uploads/${fileName}`, buffer, contentType)
      } catch (blobErr: any) {
        console.error('[media/upload] Vercel Blob also failed:', blobErr?.message)
        return NextResponse.json(
          { error: 'Upload failed: both storage backends unavailable' },
          { status: 500 }
        )
      }
    }

    // Return relative URL so it works via the /uploads/ rewrite in next.config.js
    // This ensures portability — the rewrite proxies to Supabase Storage
    const relativeUrl = `/uploads/${fileName}`

    // Register in Supabase media_files table (best-effort)
    try {
      const sb = getSupabaseAdmin()
      await sb.from('media_files').upsert({
        id: fileName,
        name: file.name || fileName,
        url: relativeUrl,
        type: contentType,
        size: file.size,
        folder: 'All Files',
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    } catch (dbErr: any) {
      console.error('[media/upload] media_files index failed:', dbErr?.message)
    }

    // Also try blob media library index (best-effort dual-write)
    try {
      const MEDIA_KEY = 'data/media-library.json'
      const library = await blobRead<{ files: any[]; folders: string[] }>(MEDIA_KEY, { files: [], folders: ['All Files'] })
      library.files.unshift({
        id: fileName,
        name: file.name || fileName,
        url: relativeUrl,
        type: contentType,
        size: file.size,
        folder: 'All Files',
        uploadedAt: new Date().toISOString(),
      })
      await blobWrite(MEDIA_KEY, library)
    } catch {
      // Blob index update is optional
    }

    return NextResponse.json({
      success: true,
      url: relativeUrl,
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
