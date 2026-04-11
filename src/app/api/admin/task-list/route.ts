import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/task-list.json'

export interface Task {
  id: string
  sku: string
  productId: string
  productTitle: string
  brand: string
  supplier: string
  imageUrl: string
  note: string
  source: 'manual' | 'auto-no-image'
  createdAt: string
  completedAt: string | null
}

async function getTasks(): Promise<Task[]> {
  return blobRead<Task[]>(KEY, [])
}

async function saveTasks(tasks: Task[]): Promise<void> {
  await blobWrite(KEY, tasks)
}

function pruneTasks(tasks: Task[]): Task[] {
  const fiveDaysMs = 5 * 24 * 60 * 60 * 1000
  const now = Date.now()
  return tasks.filter((t) => {
    if (!t.completedAt) return true
    return now - new Date(t.completedAt).getTime() < fiveDaysMs
  })
}

// GET /api/admin/task-list
export async function GET() {
  try {
    const raw = await getTasks()
    const tasks = pruneTasks(raw)
    // Save pruned list back if any were removed
    if (tasks.length !== raw.length) await saveTasks(tasks)
    tasks.sort((a, b) => {
      if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching task list:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/task-list — add or re-add a task for a product
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sku, productId, productTitle, brand, imageUrl } = body
    if (!sku || !productId) {
      return NextResponse.json({ error: 'sku and productId are required' }, { status: 400 })
    }
    const tasks = await getTasks()
    // If already in list (and not completed), just return existing
    const existing = tasks.find((t) => t.productId === productId && !t.completedAt)
    if (existing) {
      return NextResponse.json({ task: existing, alreadyExists: true })
    }
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sku: sku || '',
      productId,
      productTitle: productTitle || '',
      brand: brand || '',
      supplier: body.supplier || '',
      imageUrl: imageUrl || '',
      note: body.note || '',
      source: body.source || 'manual',
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    tasks.unshift(task)
    await saveTasks(tasks)
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error adding task:', error)
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 })
  }
}
