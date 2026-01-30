import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const POSTERS_KEY = 'data/slotcar-orders.json'

async function getPosters() {
  return await blobRead<any[]>(POSTERS_KEY, [])
}

async function savePosters(posters: any[]) {
  await blobWrite(POSTERS_KEY, posters)
}

// GET single poster
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const posters = await getPosters()
    const poster = posters.find((p: any) => p.id === id)

    if (!poster) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 })
    }

    return NextResponse.json(poster)
  } catch (error) {
    console.error('Error fetching poster:', error)
    return NextResponse.json({ error: 'Failed to fetch poster' }, { status: 500 })
  }
}

// DELETE poster
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const posters = await getPosters()
    const filteredPosters = posters.filter((p: any) => p.id !== id)

    if (filteredPosters.length === posters.length) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 })
    }

    await savePosters(filteredPosters)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting poster:', error)
    return NextResponse.json({ error: 'Failed to delete poster' }, { status: 500 })
  }
}
