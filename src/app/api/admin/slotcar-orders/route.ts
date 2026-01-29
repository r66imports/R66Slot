import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_FILE = path.join(process.cwd(), 'data', 'slotcar-orders.json')

function getPosters() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8')
      return []
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function savePosters(posters: any[]) {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(posters, null, 2), 'utf-8')
}

// GET all posters
export async function GET() {
  try {
    const posters = getPosters()
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

    const posters = getPosters()

    // Add the new poster
    posters.push({
      ...posterData,
      createdAt: new Date().toISOString(),
    })

    savePosters(posters)

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

    const posters = getPosters()
    const index = posters.findIndex((p: any) => p.id === posterData.id)

    if (index === -1) {
      return NextResponse.json({ error: 'Poster not found' }, { status: 404 })
    }

    posters[index] = {
      ...posters[index],
      ...posterData,
      updatedAt: new Date().toISOString(),
    }

    savePosters(posters)

    return NextResponse.json(posters[index])
  } catch (error) {
    console.error('Error updating poster:', error)
    return NextResponse.json({ error: 'Failed to update poster' }, { status: 500 })
  }
}
