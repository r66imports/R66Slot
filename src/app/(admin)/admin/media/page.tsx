'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MediaFile {
  name: string
  url: string
  type: string
  size: number
  uploadedAt: string
}

export default function MediaLibraryPage() {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) return
    setUploading(true)

    const newFiles: MediaFile[] = []
    for (const file of Array.from(selectedFiles)) {
      const reader = new FileReader()
      const url = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      newFiles.push({
        name: file.name,
        url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      })
    }

    setFiles((prev) => [...newFiles, ...prev])
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = (index: number) => {
    setFiles(files.filter((_, i) => i !== index))
  }

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    alert('URL copied to clipboard')
  }

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(filter.toLowerCase())
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Media Library</h1>
          <p className="text-gray-600 mt-1">
            Upload and manage images, documents, and media files
          </p>
        </div>
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.mp4,.webm"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>

      {files.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-6xl mb-4">🖼️</div>
            <h3 className="text-xl font-semibold mb-2">No Media Files</h3>
            <p className="text-gray-600 mb-6">
              Upload images, documents, or other media to use across your site.
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              Upload Your First File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file, index) => (
            <Card key={index} className="overflow-hidden group">
              <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                {file.type.startsWith('image/') ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">📄</div>
                    <p className="text-xs text-gray-500 truncate">{file.name}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => handleCopyUrl(file.url)}
                    className="px-2 py-1 bg-white text-gray-800 text-xs rounded shadow"
                  >
                    Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(index)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded shadow"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
