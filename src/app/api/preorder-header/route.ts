import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

export async function GET() {
  const data = await blobRead<any>('data/preorder-header.json', [])
  const logos: any[] = Array.isArray(data) ? data : (data?.logos ?? [])
  const defaultTheme: string = Array.isArray(data) ? 'dark' : (data?.theme ?? 'dark')
  const headerLogo: string = Array.isArray(data) ? '' : (data?.headerLogo ?? '')
  const active = logos.filter((l: any) => l.active)
  return NextResponse.json({ logos: active, theme: defaultTheme, headerLogo })
}
