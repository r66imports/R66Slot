import { NextResponse } from 'next/server'
import { blobUploadFile } from '@/lib/blob-storage'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`

    // Try Vercel Blob first, fall back to local public/uploads for dev
    let publicUrl: string
    try {
      publicUrl = await blobUploadFile(
        `uploads/${fileName}`,
        bytes,
        file.type || 'application/octet-stream'
      )
    } catch (blobError) {
      console.warn('Blob upload failed, falling back to local storage:', blobError)
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(path.join(uploadsDir, fileName), Buffer.from(bytes))
      publicUrl = `/uploads/${fileName}`
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
