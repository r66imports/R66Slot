import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'slotcar-orders.json')

function getPosters() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return []
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function savePosters(posters: any[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posters, null, 2), 'utf-8')
}

// GET single poster
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const posters = getPosters()
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
    const posters = getPosters()
    const filteredPosters = posters.filter((p: any) => p.id !== id)

    if (filteredPosters.length === posters.length) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 })
    }

    savePosters(filteredPosters)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting poster:', error)
    return NextResponse.json({ error: 'Failed to delete poster' }, { status: 500 })
  }
}
