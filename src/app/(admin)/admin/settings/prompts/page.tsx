'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { PromptEntry } from '@/app/api/admin/prompts/route'

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/admin/prompts')
      if (res.ok) setPrompts(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [])

  const handleAdd = async () => {
    if (!text.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (res.ok) {
        const entry = await res.json()
        setPrompts((prev) => [entry, ...prev])
        setText('')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
    await fetch('/api/admin/prompts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 block mb-1">&larr; Site Settings</Link>
        <h1 className="text-2xl font-bold text-gray-900">Prompts</h1>
        <p className="text-sm text-gray-500 mt-0.5">Accepted prompts are saved here. (Will organize later)</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or write a prompt to save…"
          rows={4}
          className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-y"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleAdd}
            disabled={saving || !text.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Prompt'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-gray-400 text-sm">Loading prompts…</div>
      ) : prompts.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">No prompts saved yet.</div>
      ) : (
        <div className="space-y-3">
          {prompts.map((p) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{p.text}</p>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-gray-300 hover:text-red-500 flex-shrink-0 text-xs font-semibold"
                  title="Delete prompt"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                {new Date(p.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
