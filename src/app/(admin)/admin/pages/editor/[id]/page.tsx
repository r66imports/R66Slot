'use client'

import { use } from 'react'
import { WixStyleEditor } from '@/components/page-editor/wix-style-editor'

export default function WixEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)

  return <WixStyleEditor pageId={resolvedParams.id} />
}
