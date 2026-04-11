import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED' as any,
  responseChecksumValidation: 'WHEN_REQUIRED' as any,
})

// GET /api/admin/media/proxy?url=...
// Fetches an R2 image server-side and returns it with permissive CORS headers
// so the client can draw it to <canvas> without security errors.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  try {
    // Extract R2 key from URL:
    // /api/media/uploads/file.jpg  → uploads/file.jpg
    // https://example.com/api/media/uploads/file.jpg  → uploads/file.jpg
    // https://pub-xxx.r2.dev/uploads/file.jpg  → uploads/file.jpg
    let key = url
    const apiMediaMatch = url.match(/\/api\/media\/(.+)$/)
    if (apiMediaMatch) {
      key = apiMediaMatch[1]
    } else {
      // Strip protocol + host for absolute R2 public URLs
      try {
        const parsed = new URL(url)
        key = parsed.pathname.replace(/^\//, '')
      } catch {
        // url is already a relative path — strip leading slash
        key = url.replace(/^\//, '')
      }
    }

    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: key,
    })

    const response = await r2.send(command)
    const bytes = await response.Body!.transformToByteArray()
    const buffer = Buffer.from(bytes)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store',
      },
    })
  } catch (err: any) {
    console.error('[media/proxy] Error:', err?.message)
    return NextResponse.json({ error: err?.message || 'Failed to fetch image' }, { status: 500 })
  }
}
