'use client'

import { use } from 'react'
import { TrueWixEditor } from '@/components/page-editor/true-wix-editor'

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)

  return <TrueWixEditor pageId={resolvedParams.id} />
}
