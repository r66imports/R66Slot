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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const key = path.join('/')

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
        'Cache-Control': 'public, max-age=86400, must-revalidate',
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
