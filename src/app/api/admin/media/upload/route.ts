import { NextResponse } from 'next/server'
import { blobUploadFile } from '@/lib/blob-storage'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Generate unique filename
    const bytes = await file.arrayBuffer()
    const fileExtension = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExtension}`

    // Upload to Vercel Blob
    const publicUrl = await blobUploadFile(
      `uploads/${fileName}`,
      bytes,
      file.type || 'application/octet-stream'
    )

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
