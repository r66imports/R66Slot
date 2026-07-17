import { NextResponse } from 'next/server'
import { r2Upload } from '@/lib/r2-storage'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'text/csv': 'csv',
}

export async function POST(request: Request) {
  try {
    const missingVars = [
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_BUCKET_NAME',
    ].filter(v => !process.env[v])
    if (missingVars.length > 0) {
      return NextResponse.json({ error: `Missing R2 config: ${missingVars.join(', ')}` }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplierCode = (formData.get('supplierCode') as string || 'UNKNOWN').replace(/[^A-Za-z0-9_-]/g, '_')

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const mimeType = file.type || 'application/octet-stream'
    const ext = ALLOWED_TYPES[mimeType]
    if (!ext) {
      return NextResponse.json(
        { error: `File type not allowed. Upload PDF, Excel (.xlsx/.xls), ODS, or CSV.` },
        { status: 400 }
      )
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_')
    const r2Key = `supplier-sheets/${supplierCode}/${Date.now()}-${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const url = await r2Upload(r2Key, buffer, mimeType)

    return NextResponse.json({ success: true, url, r2Key, fileSize: file.size, fileType: ext })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Upload failed' }, { status: 500 })
  }
}
