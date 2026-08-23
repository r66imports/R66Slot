import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/task-list.json'

export type TaskPriority = 'high' | 'medium' | 'low'

// 'tasks' = the general Task List. 'sku-photo' = the SKU Photo Task List,
// fed by the automated "product has no image" scan.
export type TaskListName = 'tasks' | 'sku-photo'

export interface Task {
  id: string
  list: TaskListName
  title: string
  date: string // YYYY-MM-DD — the task line this item belongs to
  priority: TaskPriority
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

const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

function toDateKey(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function coercePriority(value: unknown): TaskPriority {
  return value === 'high' || value === 'low' || value === 'medium' ? value : 'medium'
}

function coerceList(value: unknown): TaskListName | null {
  return value === 'tasks' || value === 'sku-photo' ? value : null
}

// Backfill fields added after the original task-list shipped. Tasks created by the
// no-image scan belong to the SKU Photo Task List; everything else is a general task.
function normalize(t: any): Task {
  return {
    ...t,
    list: coerceList(t?.list) ?? (t?.source === 'auto-no-image' ? 'sku-photo' : 'tasks'),
    title: t?.title || t?.productTitle || '',
    date: t?.date || toDateKey(t?.createdAt),
    priority: coercePriority(t?.priority),
  }
}

async function getTasks(): Promise<Task[]> {
  const raw = await blobRead<any[]>(KEY, [])
  return raw.map(normalize)
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

function sortTasks(tasks: Task[]): Task[] {
  return tasks.sort((a, b) => {
    // Newest task line (date) first
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    // Outstanding before completed inside the same date
    if (!!a.completedAt !== !!b.completedAt) return a.completedAt ? 1 : -1
    // High → Medium → Low
    const w = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]
    if (w !== 0) return w
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

// GET /api/admin/task-list?list=tasks|sku-photo  (omit list for every task)
export async function GET(request: Request) {
  try {
    const listFilter = coerceList(new URL(request.url).searchParams.get('list'))
    const raw = await getTasks()
    const tasks = pruneTasks(raw)
    // Save pruned list back if any were removed
    if (tasks.length !== raw.length) await saveTasks(tasks)
    const visible = listFilter ? tasks.filter((t) => t.list === listFilter) : tasks
    return NextResponse.json(sortTasks(visible))
  } catch (error) {
    console.error('Error fetching task list:', error)
    return NextResponse.json([], { status: 200 })
  }
}

// POST /api/admin/task-list — add a manual task, or flag a product
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sku, productId, productTitle, brand, imageUrl } = body
    const title = (body.title || productTitle || '').trim()

    if (!productId && !title) {
      return NextResponse.json({ error: 'title or productId is required' }, { status: 400 })
    }

    const source = body.source === 'auto-no-image' ? 'auto-no-image' : 'manual'
    const list = coerceList(body.list) ?? (source === 'auto-no-image' ? 'sku-photo' : 'tasks')
    const tasks = await getTasks()

    // Product-linked tasks are deduped per list — a product can only be pending once
    if (productId) {
      const existing = tasks.find((t) => t.productId === productId && t.list === list && !t.completedAt)
      if (existing) {
        return NextResponse.json({ task: existing, alreadyExists: true })
      }
    }

    const now = new Date()
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      list,
      title,
      date: typeof body.date === 'string' && body.date ? body.date : toDateKey(now.toISOString()),
      priority: coercePriority(body.priority),
      sku: sku || '',
      productId: productId || '',
      productTitle: productTitle || '',
      brand: brand || '',
      supplier: body.supplier || '',
      imageUrl: imageUrl || '',
      note: body.note || '',
      source,
      createdAt: now.toISOString(),
      completedAt: null,
    }
    tasks.unshift(task)
    await saveTasks(sortTasks(tasks))
    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('Error adding task:', error)
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 })
  }
}
