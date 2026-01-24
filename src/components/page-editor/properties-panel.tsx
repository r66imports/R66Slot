'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePageEditor } from '@/contexts/PageEditorContext'
import { useState } from 'react'

export function PropertiesPanel() {
  const { selectedComponent, updateComponent } = usePageEditor()
  const [uploadingImage, setUploadingImage] = useState(false)

  if (!selectedComponent) return null

  const handleUploadImage = async (file: File) => {
    setUploadingImage(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        updateComponent(selectedComponent.id, {
          settings: { ...selectedComponent.settings, imageUrl: data.url },
        })
      }
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto shadow-lg">
      <div className="sticky top-0 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-gray-200 px-4 py-4 z-10">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <span>⚙️ Properties</span>
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          Customize {selectedComponent.type} component
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Positioning Mode Section */}
        <PropertySection title="Layout Mode">
          <label className="block text-sm font-medium mb-2">Position Mode</label>
          <select
            value={selectedComponent.positionMode || 'flow'}
            onChange={(e) => {
              const mode = e.target.value as 'flow' | 'absolute'
              updateComponent(selectedComponent.id, {
                positionMode: mode,
                position: mode === 'absolute'
                  ? {
                      x: 20,
                      y: 20,
                      width: 400,
                      height: 200,
                      zIndex: 1,
                    }
                  : undefined,
              })
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all mb-2"
          >
            <option value="flow">📄 Flow Layout (Vertical Stack)</option>
            <option value="absolute">🎯 Free Positioning (Drag Anywhere)</option>
          </select>
          <p className="text-xs text-gray-500">
            {selectedComponent.positionMode === 'absolute'
              ? 'Component can be dragged and resized freely on the canvas'
              : 'Component follows normal document flow with other components'}
          </p>

          {/* Position Controls (only for absolute mode) */}
          {selectedComponent.positionMode === 'absolute' && selectedComponent.position && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h5 className="text-xs font-semibold text-gray-700 uppercase mb-3">Position & Size</h5>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600">X Position</label>
                  <Input
                    type="number"
                    value={selectedComponent.position.x}
                    onChange={(e) =>
                      updateComponent(selectedComponent.id, {
                        position: {
                          ...selectedComponent.position!,
                          x: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600">Y Position</label>
                  <Input
                    type="number"
                    value={selectedComponent.position.y}
                    onChange={(e) =>
                      updateComponent(selectedComponent.id, {
                        position: {
                          ...selectedComponent.position!,
                          y: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600">Width</label>
                  <Input
                    type="number"
                    value={selectedComponent.position.width}
                    onChange={(e) =>
                      updateComponent(selectedComponent.id, {
                        position: {
                          ...selectedComponent.position!,
                          width: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-600">Height</label>
                  <Input
                    type="number"
                    value={selectedComponent.position.height}
                    onChange={(e) =>
                      updateComponent(selectedComponent.id, {
                        position: {
                          ...selectedComponent.position!,
                          height: parseInt(e.target.value) || 100,
                        },
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-gray-600">Z-Index (Layer)</label>
                <Input
                  type="number"
                  value={selectedComponent.position.zIndex || 1}
                  onChange={(e) =>
                    updateComponent(selectedComponent.id, {
                      position: {
                        ...selectedComponent.position!,
                        zIndex: parseInt(e.target.value) || 1,
                      },
                    })
                  }
                  className="text-sm"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">Higher values appear in front</p>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    if (selectedComponent.position) {
                      updateComponent(selectedComponent.id, {
                        position: {
                          ...selectedComponent.position,
                          x: 0,
                          y: 0,
                        },
                      })
                    }
                  }}
                >
                  Reset Position
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    if (selectedComponent.position) {
                      updateComponent(selectedComponent.id, {
                        position: {
                          ...selectedComponent.position,
                          width: 400,
                          height: 200,
                        },
                      })
                    }
                  }}
                >
                  Reset Size
                </Button>
              </div>
            </div>
          )}
        </PropertySection>

        {/* Content Section */}
        {selectedComponent.type !== 'image' &&
          selectedComponent.type !== 'spacer' &&
          selectedComponent.type !== 'section' &&
          selectedComponent.type !== 'divider' && (
            <PropertySection title="Content">
              <label className="block text-sm font-medium mb-2">Text Content</label>
              <textarea
                value={selectedComponent.content}
                onChange={(e) =>
                  updateComponent(selectedComponent.id, { content: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                rows={4}
                placeholder="Enter content..."
              />
            </PropertySection>
          )}

        {/* Image Settings */}
        {selectedComponent.type === 'image' && (
          <PropertySection title="Image">
            <label className="block text-sm font-medium mb-2">Image URL</label>
            <Input
              value={selectedComponent.settings.imageUrl || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  settings: { ...selectedComponent.settings, imageUrl: e.target.value },
                })
              }
              placeholder="https://..."
              className="mb-2"
            />
            <label className="block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) await handleUploadImage(file)
                }}
                disabled={uploadingImage}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
                disabled={uploadingImage}
              >
                <span>{uploadingImage ? 'Uploading...' : '📤 Upload Image'}</span>
              </Button>
            </label>
            <label className="block text-sm font-medium mb-2 mt-3">Alt Text</label>
            <Input
              value={selectedComponent.settings.alt || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  settings: { ...selectedComponent.settings, alt: e.target.value },
                })
              }
              placeholder="Image description"
            />
          </PropertySection>
        )}

        {/* Button Settings */}
        {selectedComponent.type === 'button' && (
          <PropertySection title="Button Link">
            <label className="block text-sm font-medium mb-2">Link URL</label>
            <Input
              value={selectedComponent.settings.link || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  settings: { ...selectedComponent.settings, link: e.target.value },
                })
              }
              placeholder="/products"
            />
          </PropertySection>
        )}

        {/* Video Settings */}
        {selectedComponent.type === 'video' && (
          <PropertySection title="Video">
            <label className="block text-sm font-medium mb-2">
              Video URL (YouTube/Vimeo Embed)
            </label>
            <Input
              value={selectedComponent.settings.videoUrl || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  settings: { ...selectedComponent.settings, videoUrl: e.target.value },
                })
              }
              placeholder="https://www.youtube.com/embed/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Use embed URLs from YouTube or Vimeo
            </p>
          </PropertySection>
        )}

        {/* Icon Settings */}
        {selectedComponent.type === 'icon-text' && (
          <PropertySection title="Icon">
            <label className="block text-sm font-medium mb-2">Icon</label>
            <Input
              value={selectedComponent.settings.icon || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  settings: { ...selectedComponent.settings, icon: e.target.value },
                })
              }
              placeholder="⭐"
              className="mb-2"
            />
            <div className="flex flex-wrap gap-2">
              {['⭐', '✅', '🎯', '💡', '🚀', '⚡', '🔥', '💎', '🎨', '📱', '🌟', '✨'].map((icon) => (
                <button
                  key={icon}
                  onClick={() =>
                    updateComponent(selectedComponent.id, {
                      settings: { ...selectedComponent.settings, icon },
                    })
                  }
                  className="w-10 h-10 border border-gray-300 rounded hover:bg-gray-100 hover:border-primary text-xl transition-all"
                >
                  {icon}
                </button>
              ))}
            </div>
          </PropertySection>
        )}

        {/* Column Settings */}
        {(selectedComponent.type === 'gallery' ||
          selectedComponent.type === 'two-column' ||
          selectedComponent.type === 'three-column') && (
          <PropertySection title="Layout">
            <label className="block text-sm font-medium mb-2">Number of Columns</label>
            <Input
              type="number"
              min="1"
              max="6"
              value={selectedComponent.settings.columns || 2}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  settings: { ...selectedComponent.settings, columns: parseInt(e.target.value) },
                })
              }
            />
          </PropertySection>
        )}

        {/* Hero Background */}
        {selectedComponent.type === 'hero' && (
          <PropertySection title="Background Image">
            <label className="block text-sm font-medium mb-2">Background Image URL</label>
            <Input
              value={
                selectedComponent.styles.backgroundImage?.replace('url(', '').replace(')', '') || ''
              }
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: {
                    ...selectedComponent.styles,
                    backgroundImage: e.target.value ? `url(${e.target.value})` : '',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  },
                })
              }
              placeholder="https://..."
            />
          </PropertySection>
        )}

        {/* Styling Section */}
        <PropertySection title="Appearance">
          {/* Background Color */}
          <label className="block text-sm font-medium mb-2">Background Color</label>
          <div className="flex gap-2 mb-4">
            <input
              type="color"
              value={selectedComponent.styles.backgroundColor || '#ffffff'}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, backgroundColor: e.target.value },
                })
              }
              className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <Input
              value={selectedComponent.styles.backgroundColor || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, backgroundColor: e.target.value },
                })
              }
              placeholder="#ffffff"
            />
          </div>

          {/* Text Color */}
          {selectedComponent.type !== 'image' && selectedComponent.type !== 'spacer' && (
            <>
              <label className="block text-sm font-medium mb-2">Text Color</label>
              <div className="flex gap-2 mb-4">
                <input
                  type="color"
                  value={selectedComponent.styles.textColor || '#000000'}
                  onChange={(e) =>
                    updateComponent(selectedComponent.id, {
                      styles: { ...selectedComponent.styles, textColor: e.target.value },
                    })
                  }
                  className="w-14 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  value={selectedComponent.styles.textColor || ''}
                  onChange={(e) =>
                    updateComponent(selectedComponent.id, {
                      styles: { ...selectedComponent.styles, textColor: e.target.value },
                    })
                  }
                  placeholder="#000000"
                />
              </div>
            </>
          )}

          {/* Font Size */}
          {selectedComponent.type !== 'image' && selectedComponent.type !== 'spacer' && (
            <>
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <Input
                value={selectedComponent.styles.fontSize || ''}
                onChange={(e) =>
                  updateComponent(selectedComponent.id, {
                    styles: { ...selectedComponent.styles, fontSize: e.target.value },
                  })
                }
                placeholder="16px"
                className="mb-4"
              />
            </>
          )}

          {/* Text Align */}
          {selectedComponent.type !== 'image' && selectedComponent.type !== 'spacer' && (
            <>
              <label className="block text-sm font-medium mb-2">Text Align</label>
              <select
                value={selectedComponent.styles.textAlign || 'left'}
                onChange={(e) =>
                  updateComponent(selectedComponent.id, {
                    styles: {
                      ...selectedComponent.styles,
                      textAlign: e.target.value as 'left' | 'center' | 'right',
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </>
          )}

          {/* Border Radius */}
          <label className="block text-sm font-medium mb-2">Border Radius</label>
          <Input
            value={selectedComponent.styles.borderRadius || ''}
            onChange={(e) =>
              updateComponent(selectedComponent.id, {
                styles: { ...selectedComponent.styles, borderRadius: e.target.value },
              })
            }
            placeholder="8px"
            className="mb-4"
          />

          {/* Box Shadow */}
          <label className="block text-sm font-medium mb-2">Box Shadow</label>
          <select
            value={selectedComponent.styles.boxShadow || 'none'}
            onChange={(e) =>
              updateComponent(selectedComponent.id, {
                styles: {
                  ...selectedComponent.styles,
                  boxShadow: e.target.value === 'none' ? '' : e.target.value,
                },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2"
          >
            <option value="none">None</option>
            <option value="0 1px 3px rgba(0,0,0,0.12)">Small</option>
            <option value="0 4px 6px rgba(0,0,0,0.1)">Medium</option>
            <option value="0 10px 20px rgba(0,0,0,0.15)">Large</option>
            <option value="0 20px 40px rgba(0,0,0,0.2)">Extra Large</option>
          </select>
          <Input
            value={selectedComponent.styles.boxShadow || ''}
            onChange={(e) =>
              updateComponent(selectedComponent.id, {
                styles: { ...selectedComponent.styles, boxShadow: e.target.value },
              })
            }
            placeholder="Custom shadow"
            className="text-sm"
          />
        </PropertySection>

        {/* Spacing Section */}
        <PropertySection title="Spacing">
          {/* Padding */}
          <label className="block text-sm font-medium mb-2">Padding</label>
          <Input
            value={selectedComponent.styles.padding || ''}
            onChange={(e) =>
              updateComponent(selectedComponent.id, {
                styles: { ...selectedComponent.styles, padding: e.target.value },
              })
            }
            placeholder="20px or 10px 20px"
            className="mb-2"
          />
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Input
              value={selectedComponent.styles.paddingTop || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, paddingTop: e.target.value },
                })
              }
              placeholder="Top"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.paddingRight || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, paddingRight: e.target.value },
                })
              }
              placeholder="Right"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.paddingBottom || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, paddingBottom: e.target.value },
                })
              }
              placeholder="Bottom"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.paddingLeft || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, paddingLeft: e.target.value },
                })
              }
              placeholder="Left"
              className="text-xs"
            />
          </div>

          {/* Margin */}
          <label className="block text-sm font-medium mb-2">Margin</label>
          <Input
            value={selectedComponent.styles.margin || ''}
            onChange={(e) =>
              updateComponent(selectedComponent.id, {
                styles: { ...selectedComponent.styles, margin: e.target.value },
              })
            }
            placeholder="20px or 10px 20px"
            className="mb-2"
          />
          <div className="grid grid-cols-4 gap-2">
            <Input
              value={selectedComponent.styles.marginTop || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, marginTop: e.target.value },
                })
              }
              placeholder="Top"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.marginRight || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, marginRight: e.target.value },
                })
              }
              placeholder="Right"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.marginBottom || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, marginBottom: e.target.value },
                })
              }
              placeholder="Bottom"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.marginLeft || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, marginLeft: e.target.value },
                })
              }
              placeholder="Left"
              className="text-xs"
            />
          </div>
        </PropertySection>

        {/* Size Section */}
        <PropertySection title="Size">
          {/* Width */}
          <label className="block text-sm font-medium mb-2">Width</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <Input
              value={selectedComponent.styles.width || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, width: e.target.value },
                })
              }
              placeholder="100%"
            />
            <Input
              value={selectedComponent.styles.maxWidth || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, maxWidth: e.target.value },
                })
              }
              placeholder="Max width"
            />
          </div>

          {/* Height */}
          <label className="block text-sm font-medium mb-2">Height</label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={selectedComponent.styles.height || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, height: e.target.value },
                })
              }
              placeholder="auto"
            />
            <Input
              value={selectedComponent.styles.minHeight || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, minHeight: e.target.value },
                })
              }
              placeholder="Min height"
            />
          </div>
        </PropertySection>

        {/* Border Section */}
        <PropertySection title="Border">
          <label className="block text-sm font-medium mb-2">Border</label>
          <Input
            value={selectedComponent.styles.border || ''}
            onChange={(e) =>
              updateComponent(selectedComponent.id, {
                styles: { ...selectedComponent.styles, border: e.target.value },
              })
            }
            placeholder="1px solid #000"
            className="mb-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              value={selectedComponent.styles.borderWidth || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, borderWidth: e.target.value },
                })
              }
              placeholder="Width"
              className="text-xs"
            />
            <Input
              value={selectedComponent.styles.borderColor || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, borderColor: e.target.value },
                })
              }
              placeholder="Color"
              className="text-xs"
            />
          </div>
        </PropertySection>

        {/* Layout Section for containers */}
        {(selectedComponent.type === 'section' ||
          selectedComponent.type === 'two-column' ||
          selectedComponent.type === 'three-column' ||
          selectedComponent.type === 'gallery' ||
          selectedComponent.type === 'icon-text') && (
          <PropertySection title="Layout">
            <label className="block text-sm font-medium mb-2">Display</label>
            <select
              value={selectedComponent.styles.display || 'block'}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, display: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="block">Block</option>
              <option value="flex">Flex</option>
              <option value="grid">Grid</option>
              <option value="inline-block">Inline Block</option>
            </select>

            {selectedComponent.styles.display === 'flex' && (
              <>
                <label className="block text-sm font-medium mb-2">Flex Direction</label>
                <select
                  value={selectedComponent.styles.flexDirection || 'row'}
                  onChange={(e) =>
                    updateComponent(selectedComponent.id, {
                      styles: { ...selectedComponent.styles, flexDirection: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                >
                  <option value="row">Row</option>
                  <option value="column">Column</option>
                </select>

                <label className="block text-sm font-medium mb-2">Justify Content</label>
                <select
                  value={selectedComponent.styles.justifyContent || 'flex-start'}
                  onChange={(e) =>
                    updateComponent(selectedComponent.id, {
                      styles: { ...selectedComponent.styles, justifyContent: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                >
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                  <option value="space-between">Space Between</option>
                  <option value="space-around">Space Around</option>
                </select>

                <label className="block text-sm font-medium mb-2">Align Items</label>
                <select
                  value={selectedComponent.styles.alignItems || 'flex-start'}
                  onChange={(e) =>
                    updateComponent(selectedComponent.id, {
                      styles: { ...selectedComponent.styles, alignItems: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
                >
                  <option value="flex-start">Start</option>
                  <option value="center">Center</option>
                  <option value="flex-end">End</option>
                  <option value="stretch">Stretch</option>
                </select>
              </>
            )}

            <label className="block text-sm font-medium mb-2">Gap</label>
            <Input
              value={selectedComponent.styles.gap || ''}
              onChange={(e) =>
                updateComponent(selectedComponent.id, {
                  styles: { ...selectedComponent.styles, gap: e.target.value },
                })
              }
              placeholder="16px"
            />
          </PropertySection>
        )}
      </div>
    </div>
  )
}

// Helper component for property sections
function PropertySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-200 pb-4 last:border-0">
      <h4 className="font-semibold text-sm mb-3 text-gray-700 uppercase tracking-wide flex items-center gap-2">
        {title}
      </h4>
      {children}
    </div>
  )
}
