import { NextResponse } from 'next/server'
import { blobRead } from '@/lib/blob-storage'

async function getPosters() {
  return await blobRead<any[]>('data/slotcar-orders.json', [])
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const posters = await getPosters()
    const poster = posters.find((p: any) => p.shortCode === code)

    if (!poster) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 })
    }

    return NextResponse.json(poster)
  } catch (error) {
    console.error('Error fetching poster by code:', error)
    return NextResponse.json({ error: 'Failed to fetch poster' }, { status: 500 })
  }
}
