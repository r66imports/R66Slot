'use client'

import { useEffect } from 'react'
import Script from 'next/script'

export default function PhotoEditorPage() {
  useEffect(() => {
    // Load the photo-editor CSS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/photo-editor/style.css'
    link.id = 'photo-editor-css'
    document.head.appendChild(link)

    return () => {
      document.getElementById('photo-editor-css')?.remove()
    }
  }, [])

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Photo Editor</h1>
        <p className="text-gray-600 text-sm">Edit product images for your store</p>
      </div>

      <div className="app-container" style={{ height: 'calc(100vh - 160px)' }}>
        <header className="top-nav">
          <div className="logo">R66 Photo</div>
          <div className="actions">
            <input type="file" id="upload-img" hidden accept="image/*" />
            <button
              className="btn"
              onClick={() => document.getElementById('upload-img')?.click()}
            >
              📂 Open Image
            </button>
            <button
              className="btn primary"
              onClick={() => (window as any).downloadImage?.()}
            >
              💾 Export
            </button>
          </div>
        </header>

        <div className="main-workspace">
          <aside className="toolbar">
            <button onClick={() => (window as any).setMode?.('select')} title="Select Tool">🖱️</button>
            <button onClick={() => (window as any).addText?.()} title="Text Tool">T</button>
            <button onClick={() => (window as any).applyFilter?.('Grayscale')} title="B&W Filter">🌓</button>
            <button onClick={() => (window as any).applyFilter?.('Sepia')} title="Sepia Filter">📜</button>
            <button onClick={() => (window as any).deleteObject?.()} title="Delete Layer">🗑️</button>
          </aside>

          <main className="canvas-holder">
            <canvas id="editor-canvas"></canvas>
          </main>

          <aside className="layers-panel">
            <h3>Filters</h3>
            <div className="control-group">
              <label>Brightness</label>
              <input
                type="range"
                id="bright"
                min="-1"
                max="1"
                step="0.1"
                defaultValue="0"
                onInput={() => (window as any).adjustBrightness?.()}
              />
            </div>
            <div className="control-group">
              <label>Contrast</label>
              <input
                type="range"
                id="contrast"
                min="-1"
                max="1"
                step="0.1"
                defaultValue="0"
                onInput={() => (window as any).adjustContrast?.()}
              />
            </div>
          </aside>
        </div>
      </div>

      <Script
        src="https://unpkg.com/fabric@5.3.0/dist/fabric.min.js"
        strategy="afterInteractive"
        onReady={() => {
          // Load the photo-editor script after fabric is ready
          const s = document.createElement('script')
          s.src = '/photo-editor/script.js'
          s.id = 'photo-editor-script'
          document.body.appendChild(s)
        }}
      />
    </>
  )
}
