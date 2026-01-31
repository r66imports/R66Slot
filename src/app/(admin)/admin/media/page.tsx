'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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

type SortBy = 'name' | 'date' | 'size' | 'type'
type SortDir = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'

export default function MediaLibraryPage() {
  const [library, setLibrary] = useState<MediaLibrary>({ files: [], folders: ['All Files'] })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [activeFolder, setActiveFolder] = useState('All Files')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load media library on mount
  useEffect(() => {
    loadLibrary()
  }, [])

  const loadLibrary = async () => {
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        setLibrary({
          files: data.files || [],
          folders: data.folders?.length ? data.folders : ['All Files'],
        })
      }
    } catch (err) {
      console.error('Failed to load media library:', err)
    }
  }

  const saveLibrary = useCallback(async (lib: MediaLibrary) => {
    setSaving(true)
    try {
      await fetch('/api/admin/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lib),
      })
      setIsDirty(false)
    } catch (err) {
      console.error('Failed to save media library:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  const updateLibrary = (update: Partial<MediaLibrary>) => {
    const updated = { ...library, ...update }
    setLibrary(updated)
    setIsDirty(true)
  }

  const handleSave = () => saveLibrary(library)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return
    setUploading(true)

    const newFiles: MediaFile[] = []
    for (const file of Array.from(selectedFiles)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          newFiles.push({
            id: `media-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: file.name,
            url: data.url,
            type: file.type,
            size: file.size,
            folder: activeFolder === 'All Files' ? 'All Files' : activeFolder,
            uploadedAt: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error('Upload failed:', err)
      }
    }

    if (newFiles.length > 0) {
      const updated = { ...library, files: [...newFiles, ...library.files] }
      setLibrary(updated)
      await saveLibrary(updated)
    }

    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (id: string) => {
    const updated = { ...library, files: library.files.filter((f) => f.id !== id) }
    setLibrary(updated)
    setSelectedFiles((prev) => { const n = new Set(prev); n.delete(id); return n })
    await saveLibrary(updated)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return
    const updated = { ...library, files: library.files.filter((f) => !selectedFiles.has(f.id)) }
    setLibrary(updated)
    setSelectedFiles(new Set())
    await saveLibrary(updated)
  }

  const handleBulkMove = async (folder: string) => {
    const updated = {
      ...library,
      files: library.files.map((f) => selectedFiles.has(f.id) ? { ...f, folder } : f),
    }
    setLibrary(updated)
    setSelectedFiles(new Set())
    setMoveTarget(null)
    await saveLibrary(updated)
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const handleRename = (id: string, newName: string) => {
    updateLibrary({
      files: library.files.map((f) => f.id === id ? { ...f, name: newName } : f),
    })
  }

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name || library.folders.includes(name)) return
    const updated = { ...library, folders: [...library.folders, name] }
    setLibrary(updated)
    setNewFolderName('')
    setShowNewFolder(false)
    saveLibrary(updated)
  }

  const handleDeleteFolder = (folder: string) => {
    if (folder === 'All Files') return
    if (!confirm(`Delete folder "${folder}"? Files will be moved to "All Files".`)) return
    const updated = {
      ...library,
      folders: library.folders.filter((f) => f !== folder),
      files: library.files.map((f) => f.folder === folder ? { ...f, folder: 'All Files' } : f),
    }
    setLibrary(updated)
    if (activeFolder === folder) setActiveFolder('All Files')
    saveLibrary(updated)
  }

  const toggleFileSelect = (id: string) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Filter and sort files
  const filteredFiles = library.files
    .filter((f) => {
      if (activeFolder !== 'All Files' && f.folder !== activeFolder) return false
      if (filter && !f.name.toLowerCase().includes(filter.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'date') cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()
      else if (sortBy === 'size') cmp = a.size - b.size
      else if (sortBy === 'type') cmp = a.type.localeCompare(b.type)
      return sortDir === 'asc' ? cmp : -cmp
    })

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalSize = library.files.reduce((s, f) => s + f.size, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-gray-600 mt-1">
            {library.files.length} files &middot; {formatSize(totalSize)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.mp4,.webm,.svg,.gif,.webp"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        <div className="w-52 flex-shrink-0">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Folders</h3>
              <button
                onClick={() => setShowNewFolder(!showNewFolder)}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium"
              >
                + New
              </button>
            </div>

            {showNewFolder && (
              <div className="mb-3 flex gap-1">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="Folder name"
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                  autoFocus
                />
                <button
                  onClick={handleCreateFolder}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded"
                >
                  Add
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {library.folders.map((folder) => {
                const count = folder === 'All Files'
                  ? library.files.length
                  : library.files.filter((f) => f.folder === folder).length
                return (
                  <div
                    key={folder}
                    className={`flex items-center justify-between group rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                      activeFolder === folder
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() => setActiveFolder(folder)}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{folder === 'All Files' ? '📁' : '📂'}</span>
                      <span className="truncate">{folder}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">{count}</span>
                      {folder !== 'All Files' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder) }}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs ml-1"
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Toolbar */}
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search files..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="date">Sort: Date</option>
              <option value="name">Sort: Name</option>
              <option value="size">Sort: Size</option>
              <option value="type">Sort: Type</option>
            </select>
            <button
              onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>

            {/* View mode */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm border-l border-gray-300 ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
              >
                List
              </button>
            </div>

            {/* Bulk actions */}
            {selectedFiles.size > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">{selectedFiles.size} selected</span>
                <div className="relative">
                  <button
                    onClick={() => setMoveTarget(moveTarget ? null : 'open')}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100"
                  >
                    Move to...
                  </button>
                  {moveTarget && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-40">
                      {library.folders.filter((f) => f !== 'All Files').map((folder) => (
                        <button
                          key={folder}
                          onClick={() => handleBulkMove(folder)}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          📂 {folder}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleBulkDelete}
                  className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Files */}
          {filteredFiles.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="text-6xl mb-4">🖼️</div>
                <h3 className="text-xl font-semibold mb-2">
                  {library.files.length === 0 ? 'No Media Files' : 'No files match'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {library.files.length === 0
                    ? 'Upload images, documents, or other media to use across your site.'
                    : 'Try a different search or folder.'}
                </p>
                {library.files.length === 0 && (
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Upload Your First File
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className={`overflow-hidden group cursor-pointer transition-all ${
                    selectedFiles.has(file.id)
                      ? 'ring-2 ring-blue-500 shadow-md'
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => toggleFileSelect(file.id)}
                >
                  <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                    {selectedFiles.has(file.id) && (
                      <div className="absolute top-2 left-2 z-10 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    {file.type.startsWith('image/') ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <div className="text-4xl mb-2">
                          {file.type.includes('pdf') ? '📕' : file.type.includes('video') ? '🎬' : '📄'}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{file.name}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url) }}
                        className="px-2 py-1 bg-white text-gray-800 text-xs rounded shadow"
                      >
                        Copy URL
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(file.id) }}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded shadow"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                      {file.folder !== 'All Files' && (
                        <p className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">{file.folder}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-[auto,1fr,100px,100px,120px,80px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <div className="w-5"></div>
                <div>Name</div>
                <div>Type</div>
                <div>Size</div>
                <div>Date</div>
                <div>Actions</div>
              </div>
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => toggleFileSelect(file.id)}
                  className={`grid grid-cols-[auto,1fr,100px,100px,120px,80px] gap-3 px-4 py-2.5 items-center border-b border-gray-100 cursor-pointer transition-colors ${
                    selectedFiles.has(file.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="w-5 h-5">
                    <div className={`w-4 h-4 rounded border ${selectedFiles.has(file.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'} flex items-center justify-center`}>
                      {selectedFiles.has(file.id) && <span className="text-white text-[10px]">✓</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    {file.type.startsWith('image/') ? (
                      <img src={file.url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0 text-sm">
                        {file.type.includes('pdf') ? '📕' : '📄'}
                      </div>
                    )}
                    <span className="text-sm truncate">{file.name}</span>
                    {file.folder !== 'All Files' && (
                      <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">{file.folder}</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">{file.type.split('/')[1]?.toUpperCase() || file.type}</div>
                  <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
                  <div className="text-xs text-gray-500">{formatDate(file.uploadedAt)}</div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopyUrl(file.url) }}
                      className="text-[10px] text-blue-600 hover:underline"
                    >
                      URL
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id) }}
                      className="text-[10px] text-red-600 hover:underline"
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
