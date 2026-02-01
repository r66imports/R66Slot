'use client'

import { useState, useEffect } from 'react'

interface MediaFile {
  id: string
  name: string
  url: string
  type: string
  size: number
  folder: string
  uploadedAt: string
}

interface MediaLibrary {
  files: MediaFile[]
  folders: string[]
}

interface MediaLibraryPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (url: string) => void
}

export function MediaLibraryPicker({ open, onClose, onSelect }: MediaLibraryPickerProps) {
  const [library, setLibrary] = useState<MediaLibrary | null>(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFolder, setSelectedFolder] = useState('All Files')

  useEffect(() => {
    if (open && !library) {
      loadLibrary()
    }
  }, [open])

  const loadLibrary = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setLibrary(data)
      }
    } catch (err) {
      console.error('Failed to load media library:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const imageFiles = (library?.files || []).filter((f) => {
    const isImage = f.type?.startsWith('image/') || f.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
    if (!isImage) return false
    if (selectedFolder !== 'All Files' && f.folder !== selectedFolder) return false
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold font-play">Media Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Search + Folder Filter */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search images..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-play focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          />
          {library && library.folders.length > 1 && (
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-play"
            >
              {library.folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          )}
          <button
            onClick={loadLibrary}
            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-play font-medium"
          >
            Refresh
          </button>
        </div>

        {/* Image Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-sm text-gray-500 font-play">Loading media...</span>
            </div>
          ) : imageFiles.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-sm text-gray-500 font-play">
                {search ? 'No images match your search' : 'No images in media library'}
              </p>
              <p className="text-xs text-gray-400 font-play mt-1">
                Upload images at <a href="/admin/media" target="_blank" className="text-blue-500 hover:underline">/admin/media</a>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {imageFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => {
                    onSelect(file.url)
                    onClose()
                  }}
                  className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-blue-500 transition-all focus:outline-none focus:border-blue-500"
                >
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                    <span className="w-full px-2 py-1 text-[10px] text-white bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity truncate font-play">
                      {file.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-play">
            {imageFiles.length} image{imageFiles.length !== 1 ? 's' : ''} available
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-play"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
