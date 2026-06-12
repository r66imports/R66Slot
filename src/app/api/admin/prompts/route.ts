import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/prompts.json'

export interface PromptEntry {
  id: string
  text: string
  createdAt: string
}

export async function GET() {
  const prompts = await blobRead<PromptEntry[]>(KEY, [])
  return NextResponse.json(prompts)
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Prompt text is required' }, { status: 400 })
    }
    const prompts = await blobRead<PromptEntry[]>(KEY, [])
    const entry: PromptEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      createdAt: new Date().toISOString(),
    }
    const updated = [entry, ...prompts]
    await blobWrite(KEY, updated)
    return NextResponse.json(entry)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    const prompts = await blobRead<PromptEntry[]>(KEY, [])
    const updated = prompts.filter((p) => p.id !== id)
    await blobWrite(KEY, updated)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
