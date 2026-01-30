import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const POSTERS_KEY = 'data/slotcar-orders.json'

async function getPosters() {
  return await blobRead<any[]>(POSTERS_KEY, [])
}

async function savePosters(posters: any[]) {
  await blobWrite(POSTERS_KEY, posters)
}

// GET all posters
export async function GET() {
  try {
    const posters = await getPosters()
    return NextResponse.json(posters)
  } catch (error) {
    console.error('Error fetching posters:', error)
    return NextResponse.json({ error: 'Failed to fetch posters' }, { status: 500 })
  }
}

// POST new poster
export async function POST(request: Request) {
  try {
    const posterData = await request.json()

    const posters = await getPosters()

    posters.push({
      ...posterData,
      createdAt: new Date().toISOString(),
    })

    await savePosters(posters)

    return NextResponse.json(posterData)
  } catch (error) {
    console.error('Error creating poster:', error)
    return NextResponse.json({ error: 'Failed to create poster' }, { status: 500 })
  }
}

// PUT update poster
export async function PUT(request: Request) {
  try {
    const posterData = await request.json()

    const posters = await getPosters()
    const index = posters.findIndex((p: any) => p.id === posterData.id)

    if (index === -1) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 })
    }

    posters[index] = {
      ...posters[index],
      ...posterData,
      updatedAt: new Date().toISOString(),
    }

    await savePosters(posters)

    return NextResponse.json(posters[index])
  } catch (error) {
    console.error('Error updating poster:', error)
    return NextResponse.json({ error: 'Failed to update poster' }, { status: 500 })
  }
}
