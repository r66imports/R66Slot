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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const posters = getPosters()
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
