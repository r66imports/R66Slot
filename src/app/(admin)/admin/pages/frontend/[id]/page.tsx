'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function FrontendPageRedirect() {
  const params = useParams()
  const router = useRouter()
  const pageId = params.id as string

  useEffect(() => {
    // Redirect to the visual editor with the frontend page ID
    router.replace(`/admin/pages/editor/frontend-${pageId}`)
  }, [pageId, router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="text-4xl mb-4">✏️</div>
        <p className="text-gray-600">Loading editor...</p>
      </div>
    </div>
  )
}
