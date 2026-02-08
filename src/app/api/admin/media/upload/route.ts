import { NextResponse } from 'next/server'
import { blobUploadFile } from '@/lib/blob-storage'

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

    const publicUrl = await blobUploadFile(
      `uploads/${fileName}`,
      buffer,
      contentType
    )

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
