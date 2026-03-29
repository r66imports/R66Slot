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
  const [library, setLibrary] = useState<MediaLibrary>({ files: [], folders: [] })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')
  const [currentPath, setCurrentPath] = useState('') // '' = root
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [moveTarget, setMoveTarget] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [draggedFolderPath, setDraggedFolderPath] = useState<string | null>(null)
  const [dragOverFolderPath, setDragOverFolderPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Refs so paste handler always sees current values without re-registering
  const libraryRef = useRef(library)
  const currentPathRef = useRef(currentPath)
  useEffect(() => { libraryRef.current = library }, [library])
  useEffect(() => { currentPathRef.current = currentPath }, [currentPath])

  useEffect(() => { loadLibrary() }, [])

  const loadLibrary = async () => {
    try {
      const res = await fetch('/api/admin/media')
      if (res.ok) {
        const data = await res.json()
        // Migrate old 'All Files' references to root ''
        const files = (data.files || []).map((f: MediaFile) => ({
          ...f,
          folder: f.folder === 'All Files' ? '' : (f.folder ?? ''),
        }))
        const folders = (data.folders || []).filter((f: string) => f !== 'All Files')
        setLibrary({ files, folders })
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
    } catch (err) {
      console.error('Failed to save media library:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  // Paste to upload — works anywhere on the page
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || [])
      const imageItems = items.filter(item => item.type.startsWith('image/'))
      if (imageItems.length === 0) return
      setUploading(true)
      const newFiles: MediaFile[] = []
      for (const item of imageItems) {
        const file = item.getAsFile()
        if (!file) continue
        try {
          const formData = new FormData()
          const name = `paste-${Date.now()}.png`
          formData.append('file', file, name)
          const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
          const data = await res.json()
          if (res.ok) {
            newFiles.push({
              id: `media-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              name,
              url: data.url,
              type: file.type,
              size: file.size,
              folder: currentPathRef.current,
              uploadedAt: new Date().toISOString(),
            })
          }
        } catch {}
      }
      if (newFiles.length > 0) {
        const updated = {
          ...libraryRef.current,
          files: [...newFiles, ...libraryRef.current.files],
        }
        setLibrary(updated)
        await saveLibrary(updated)
      }
      setUploading(false)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [saveLibrary])

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    setUploadError('')
    const newFiles: MediaFile[] = []
    const errors: string[] = []
    for (const file of files) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/admin/media/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.ok) {
          newFiles.push({
            id: `media-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            name: file.name,
            url: data.url,
            type: file.type,
            size: file.size,
            folder: currentPath,
            uploadedAt: new Date().toISOString(),
          })
        } else {
          errors.push(`${file.name}: ${data.error || 'Upload failed'}`)
        }
      } catch (err: any) {
        errors.push(`${file.name}: ${err?.message || 'Network error'}`)
      }
    }
    if (newFiles.length > 0) {
      const updated = { ...library, files: [...newFiles, ...library.files] }
      setLibrary(updated)
      await saveLibrary(updated)
    }
    if (errors.length > 0) setUploadError(errors.join('\n'))
    setUploading(false)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    await uploadFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDelete = async (id: string) => {
    const updated = { ...library, files: library.files.filter(f => f.id !== id) }
    setLibrary(updated)
    setSelectedFiles(prev => { const n = new Set(prev); n.delete(id); return n })
    await saveLibrary(updated)
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return
    if (!confirm(`Delete ${selectedFiles.size} file(s)?`)) return
    const updated = { ...library, files: library.files.filter(f => !selectedFiles.has(f.id)) }
    setLibrary(updated)
    setSelectedFiles(new Set())
    await saveLibrary(updated)
  }

  const handleBulkMove = async (targetFolder: string) => {
    const ids = Array.from(selectedFiles)
    const updated = { ...library, files: library.files.map(f => ids.includes(f.id) ? { ...f, folder: targetFolder } : f) }
    setLibrary(updated)
    setSelectedFiles(new Set())
    setMoveTarget(null)
    await saveLibrary(updated)
  }

  const handleCopyUrl = (url: string) => navigator.clipboard.writeText(url)

  const moveFile = async (fileId: string, targetFolder: string) => {
    const file = library.files.find(f => f.id === fileId)
    if (!file || file.folder === targetFolder) return
    const updated = { ...library, files: library.files.map(f => f.id === fileId ? { ...f, folder: targetFolder } : f) }
    setLibrary(updated)
    await saveLibrary(updated)
  }

  // Move a folder (and all its contents) into another folder
  const moveFolder = async (srcPath: string, destParent: string) => {
    if (srcPath === destParent || destParent.startsWith(srcPath + '/')) return
    const folderName = srcPath.split('/').pop()!
    const newPath = destParent ? `${destParent}/${folderName}` : folderName
    if (srcPath === newPath) return
    const newFolders = library.folders.map(f => {
      if (f === srcPath) return newPath
      if (f.startsWith(srcPath + '/')) return newPath + f.slice(srcPath.length)
      return f
    })
    const newFiles = library.files.map(f => {
      if (f.folder === srcPath) return { ...f, folder: newPath }
      if (f.folder.startsWith(srcPath + '/')) return { ...f, folder: newPath + f.folder.slice(srcPath.length) }
      return f
    })
    const updated = { ...library, folders: newFolders, files: newFiles }
    setLibrary(updated)
    await saveLibrary(updated)
  }

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const fullPath = currentPath ? `${currentPath}/${name}` : name
    if (library.folders.includes(fullPath)) return
    const newFolders = [...library.folders, fullPath].sort()
    const updated = { ...library, folders: newFolders }
    setLibrary(updated)
    setNewFolderName('')
    setShowNewFolder(false)
    saveLibrary(updated)
  }

  const handleDeleteFolder = (folderPath: string) => {
    if (!confirm(`Delete folder "${folderPath.split('/').pop()}"? Files inside will be moved to root.`)) return
    const newFolders = library.folders.filter(f => f !== folderPath && !f.startsWith(folderPath + '/'))
    const newFiles = library.files.map(f =>
      (f.folder === folderPath || f.folder.startsWith(folderPath + '/')) ? { ...f, folder: '' } : f
    )
    const updated = { ...library, folders: newFolders, files: newFiles }
    setLibrary(updated)
    if (currentPath === folderPath || currentPath.startsWith(folderPath + '/')) setCurrentPath('')
    saveLibrary(updated)
  }

  const toggleFileSelect = (id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Direct child folders at the current path
  const foldersHere = library.folders.filter(f => {
    if (currentPath === '') return !f.includes('/')
    return f.startsWith(currentPath + '/') && f.slice(currentPath.length + 1).indexOf('/') === -1
  })

  // Files at the current path (not in subfolders)
  const filteredFiles = library.files
    .filter(f => {
      if (f.folder !== currentPath) return false
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

  const breadcrumbs = currentPath ? currentPath.split('/') : []

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

  const totalSize = library.files.reduce((s, f) => s + f.size, 0)

  const handleDragOverFolder = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    setDragOverFolderPath(folderPath)
  }

  const handleDropOnFolder = (e: React.DragEvent, folderPath: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedFileId) moveFile(draggedFileId, folderPath)
    else if (draggedFolderPath && draggedFolderPath !== folderPath) moveFolder(draggedFolderPath, folderPath)
    setDragOverFolderPath(null)
    setDraggedFileId(null)
    setDraggedFolderPath(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-play">Media Library</h1>
          <p className="text-gray-500 mt-1 text-sm font-play">
            {library.files.length} files · {formatSize(totalSize)} total
            {saving && <span className="ml-2 text-blue-500">Saving...</span>}
            {uploading && <span className="ml-2 text-indigo-500">Uploading...</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="font-play">
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

      {uploadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-700 mb-1">Upload failed:</p>
          <pre className="text-xs text-red-600 whitespace-pre-wrap">{uploadError}</pre>
          <button onClick={() => setUploadError('')} className="mt-2 text-xs text-red-500 hover:underline">Dismiss</button>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-sm flex-wrap">
        <button
          onClick={() => setCurrentPath('')}
          className={`font-semibold font-play hover:text-blue-600 ${currentPath === '' ? 'text-gray-900' : 'text-blue-500'}`}
        >
          Media Library
        </button>
        {breadcrumbs.map((seg, i) => {
          const path = breadcrumbs.slice(0, i + 1).join('/')
          return (
            <span key={path} className="flex items-center gap-1">
              <span className="text-gray-400">/</span>
              <button
                onClick={() => setCurrentPath(path)}
                className={`font-semibold font-play hover:text-blue-600 ${currentPath === path ? 'text-gray-900' : 'text-blue-500'}`}
              >
                {seg}
              </button>
            </span>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search files..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56 font-play"
        />

        <button
          onClick={() => setShowNewFolder(!showNewFolder)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 font-play"
        >
          📁 New Folder
        </button>
        {showNewFolder && (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') setShowNewFolder(false)
              }}
              placeholder="Folder name"
              className="px-3 py-2 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-play"
              autoFocus
            />
            <button onClick={handleCreateFolder} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-play">Create</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName('') }} className="px-2 py-2 text-sm text-gray-500 hover:text-gray-700">✕</button>
          </div>
        )}

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortBy)}
          className="px-2 py-2 border border-gray-300 rounded-lg text-sm font-play"
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

        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-sm font-play ${viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm border-l border-gray-300 font-play ${viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'}`}
          >
            List
          </button>
        </div>

        <p className="text-xs text-gray-400 font-play ml-1">Paste image to upload</p>

        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500 font-play">{selectedFiles.size} selected</span>
            <div className="relative">
              <button
                onClick={() => setMoveTarget(moveTarget ? null : 'open')}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 font-play"
              >
                Move to...
              </button>
              {moveTarget && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48 max-h-48 overflow-y-auto">
                  <button
                    onClick={() => handleBulkMove('')}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-play"
                  >
                    📁 Root
                  </button>
                  {library.folders.map(folder => (
                    <button
                      key={folder}
                      onClick={() => handleBulkMove(folder)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 font-play"
                    >
                      📂 {folder}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleBulkDelete}
              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded border border-red-200 hover:bg-red-100 font-play"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedFiles(new Set())}
              className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 font-play"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {foldersHere.length === 0 && filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold mb-2 font-play">
              {library.files.length === 0 ? 'No Media Files' : 'This folder is empty'}
            </h3>
            <p className="text-gray-600 mb-6 font-play">
              {library.files.length === 0
                ? 'Upload images, paste from clipboard, or drag files here.'
                : 'Upload files or drag them here from another folder.'}
            </p>
            {library.files.length === 0 && (
              <Button onClick={() => fileInputRef.current?.click()} className="font-play">
                Upload Your First File
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Folder cards first */}
          {foldersHere.map(folderPath => {
            const folderName = folderPath.split('/').pop()!
            const fileCount = library.files.filter(f => f.folder === folderPath || f.folder.startsWith(folderPath + '/')).length
            const subCount = library.folders.filter(f => f.startsWith(folderPath + '/')).length
            const isDropTarget = dragOverFolderPath === folderPath
            const isBeingDragged = draggedFolderPath === folderPath
            return (
              <div
                key={folderPath}
                draggable
                onDragStart={e => { e.stopPropagation(); setDraggedFolderPath(folderPath); setDraggedFileId(null) }}
                onDragEnd={() => { setDraggedFolderPath(null); setDragOverFolderPath(null) }}
                onDragOver={e => handleDragOverFolder(e, folderPath)}
                onDragLeave={() => setDragOverFolderPath(null)}
                onDrop={e => handleDropOnFolder(e, folderPath)}
                onClick={() => setCurrentPath(folderPath)}
                className={`group relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all select-none ${
                  isDropTarget
                    ? 'border-green-400 bg-green-50 shadow-lg scale-105'
                    : isBeingDragged
                      ? 'opacity-50 border-dashed border-gray-400'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="bg-gradient-to-br from-yellow-50 to-amber-100 h-28 flex items-center justify-center relative">
                  <span className="text-5xl">{isDropTarget ? '📂' : '📁'}</span>
                  {isDropTarget && (
                    <div className="absolute inset-0 bg-green-100/50 flex items-center justify-center">
                      <span className="text-green-700 text-sm font-semibold font-play bg-white/80 px-3 py-1 rounded-lg shadow">Drop here</span>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteFolder(folderPath) }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white/80 rounded-lg text-gray-400 hover:text-red-500 transition-opacity"
                    title="Delete folder"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                <div className="bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-gray-800 truncate font-play">{folderName}</p>
                  <p className="text-xs text-gray-400 font-play">
                    {fileCount} file{fileCount !== 1 ? 's' : ''}
                    {subCount > 0 ? ` · ${subCount} folder${subCount !== 1 ? 's' : ''}` : ''}
                  </p>
                </div>
              </div>
            )
          })}

          {/* File cards */}
          {filteredFiles.map(file => (
            <Card
              key={file.id}
              draggable
              onDragStart={e => { e.stopPropagation(); setDraggedFileId(file.id); setDraggedFolderPath(null) }}
              onDragEnd={() => { setDraggedFileId(null); setDragOverFolderPath(null) }}
              className={`overflow-hidden group cursor-grab active:cursor-grabbing transition-all ${
                selectedFiles.has(file.id)
                  ? 'ring-2 ring-blue-500 shadow-md'
                  : draggedFileId === file.id
                    ? 'opacity-50 ring-2 ring-dashed ring-gray-400'
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
                  <img src={file.url} alt={file.name} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">
                      {file.type.includes('pdf') ? '📕' : file.type.includes('video') ? '🎬' : '📄'}
                    </div>
                    <p className="text-xs text-gray-500 truncate font-play">{file.name}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={e => { e.stopPropagation(); handleCopyUrl(file.url) }}
                    className="px-2 py-1 bg-white text-gray-800 text-xs rounded shadow font-play"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(file.id) }}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded shadow font-play"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate font-play">{file.name}</p>
                <p className="text-xs text-gray-400 font-play">{formatSize(file.size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[auto,1fr,100px,100px,120px,80px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase font-play">
            <div className="w-5"></div>
            <div>Name</div>
            <div>Type</div>
            <div>Size</div>
            <div>Date</div>
            <div>Actions</div>
          </div>

          {/* Folder rows */}
          {foldersHere.map(folderPath => {
            const folderName = folderPath.split('/').pop()!
            const fileCount = library.files.filter(f => f.folder === folderPath || f.folder.startsWith(folderPath + '/')).length
            const isDropTarget = dragOverFolderPath === folderPath
            return (
              <div
                key={folderPath}
                draggable
                onDragStart={e => { e.stopPropagation(); setDraggedFolderPath(folderPath); setDraggedFileId(null) }}
                onDragEnd={() => { setDraggedFolderPath(null); setDragOverFolderPath(null) }}
                onDragOver={e => handleDragOverFolder(e, folderPath)}
                onDragLeave={() => setDragOverFolderPath(null)}
                onDrop={e => handleDropOnFolder(e, folderPath)}
                onClick={() => setCurrentPath(folderPath)}
                className={`grid grid-cols-[auto,1fr,100px,100px,120px,80px] gap-3 px-4 py-2.5 items-center border-b border-gray-100 cursor-pointer transition-colors group ${
                  isDropTarget ? 'bg-green-50 ring-inset ring-2 ring-green-400' : draggedFolderPath === folderPath ? 'opacity-50' : 'hover:bg-amber-50'
                }`}
              >
                <div className="w-5 h-5 text-base">📁</div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate font-play text-gray-800">{folderName}</span>
                  {isDropTarget && <span className="text-xs text-green-600 font-play">Drop here</span>}
                </div>
                <div className="text-xs text-gray-400 font-play">Folder</div>
                <div className="text-xs text-gray-400 font-play">{fileCount} item{fileCount !== 1 ? 's' : ''}</div>
                <div></div>
                <div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteFolder(folderPath) }}
                    className="text-[10px] text-red-600 hover:underline font-play"
                  >
                    Del
                  </button>
                </div>
              </div>
            )
          })}

          {/* File rows */}
          {filteredFiles.map(file => (
            <div
              key={file.id}
              draggable
              onDragStart={e => { e.stopPropagation(); setDraggedFileId(file.id); setDraggedFolderPath(null) }}
              onDragEnd={() => setDraggedFileId(null)}
              onClick={() => toggleFileSelect(file.id)}
              className={`grid grid-cols-[auto,1fr,100px,100px,120px,80px] gap-3 px-4 py-2.5 items-center border-b border-gray-100 cursor-grab active:cursor-grabbing transition-colors ${
                selectedFiles.has(file.id) ? 'bg-blue-50' : draggedFileId === file.id ? 'opacity-50' : 'hover:bg-gray-50'
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
                <span className="text-sm truncate font-play">{file.name}</span>
              </div>
              <div className="text-xs text-gray-500 font-play">{file.type.split('/')[1]?.toUpperCase() || file.type}</div>
              <div className="text-xs text-gray-500 font-play">{formatSize(file.size)}</div>
              <div className="text-xs text-gray-500 font-play">{formatDate(file.uploadedAt)}</div>
              <div className="flex gap-1">
                <button onClick={e => { e.stopPropagation(); handleCopyUrl(file.url) }} className="text-[10px] text-blue-600 hover:underline font-play">URL</button>
                <button onClick={e => { e.stopPropagation(); handleDelete(file.id) }} className="text-[10px] text-red-600 hover:underline font-play">Del</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
