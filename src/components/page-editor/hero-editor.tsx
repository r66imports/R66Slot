'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePageEditor } from '@/contexts/PageEditorContext'
import { useHero } from '@/contexts/HeroContext'

export default function HeroEditor() {
  const { page, addComponent, updateComponent } = usePageEditor()
  const { hero, updateHero } = useHero()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(hero.title || '')
  const [subtitle, setSubtitle] = useState(hero.subtitle || '')
  const [ctaLabel, setCtaLabel] = useState(hero.cta?.label || '')
  const [ctaUrl, setCtaUrl] = useState(hero.cta?.url || '')

  useEffect(() => {
    setTitle(hero.title || '')
    setSubtitle(hero.subtitle || '')
    setCtaLabel(hero.cta?.label || '')
    setCtaUrl(hero.cta?.url || '')
  }, [hero])

  const findHeroComponent = () => page?.components.find((c) => c.type === 'hero')

  const handleSave = () => {
    const newHero = {
      title,
      subtitle,
      cta: ctaLabel || ctaUrl ? { label: ctaLabel, url: ctaUrl } : undefined,
    }

    // Update shared context so runtime components reflect changes
    updateHero(newHero)

    // Persist into page components: update existing hero component or add one
    const existing = findHeroComponent()
    if (existing) {
      updateComponent(existing.id, {
        content: newHero.title,
        settings: { ...(existing.settings || {}), subtitle: newHero.subtitle, cta: newHero.cta },
      })
    } else if (page) {
      // add a hero component at the top
      addComponent('hero', 0)
      // Note: addComponent creates a default hero; editor user should edit it in properties panel if needed
    }

    setOpen(false)
  }

  return (
    <div>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="hover:bg-gray-50">
        ✏️ Edit Hero
      </Button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpen(false)}
        >
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Edit Hero</h3>

            <label className="block mb-2 text-sm">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mb-4" />

            <label className="block mb-2 text-sm">Subtitle</label>
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="mb-4" />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm">CTA Label</label>
                <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
              </div>
              <div>
                <label className="block mb-2 text-sm">CTA URL</label>
                <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
