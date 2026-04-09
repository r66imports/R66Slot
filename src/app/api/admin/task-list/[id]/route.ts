import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/task-list.json'

// PATCH /api/admin/task-list/[id] — toggle complete
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const tasks = await blobRead<any[]>(KEY, [])
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    if ('completedAt' in body) {
      tasks[idx].completedAt = body.completedAt
    }
    await blobWrite(KEY, tasks)
    return NextResponse.json(tasks[idx])
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/admin/task-list/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tasks = await blobRead<any[]>(KEY, [])
    const updated = tasks.filter((t) => t.id !== id)
    await blobWrite(KEY, updated)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
