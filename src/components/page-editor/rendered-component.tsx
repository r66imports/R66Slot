'use client'

import React, { useRef, useCallback } from 'react'
import Draggable, { type DraggableData, type DraggableEvent } from 'react-draggable'
import type { PageComponent } from '@/lib/pages/schema'

interface RenderedComponentProps {
  component: PageComponent
  isEditing?: boolean
  onUpdateSettings?: (key: string, value: any) => void
}

export function RenderedComponent({ component, isEditing, onUpdateSettings }: RenderedComponentProps) {
  const { type, content, styles, settings, children } = component

  const containerStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || 'transparent',
    color: styles.textColor || 'inherit',
    paddingTop: styles.paddingTop || styles.padding || '0px',
    paddingBottom: styles.paddingBottom || styles.padding || '0px',
    paddingLeft: styles.paddingLeft || styles.padding || '16px',
    paddingRight: styles.paddingRight || styles.padding || '16px',
    textAlign: styles.textAlign as any,
    backgroundImage: styles.backgroundImage,
    backgroundSize: styles.backgroundSize || 'cover',
    backgroundPosition: styles.backgroundPosition || 'center',
    minHeight: styles.minHeight,
    // Layout mode styles
    display: styles.display as any,
    flexDirection: styles.flexDirection as any,
    justifyContent: styles.justifyContent as any,
    alignItems: styles.alignItems as any,
    gap: styles.gap,
    width: styles.width,
    maxWidth: styles.maxWidth,
    height: styles.height,
  }

  switch (type) {
    case 'hero': {
      const heroHasImage = settings.imageUrl && (settings.imageUrl as string).trim() !== ''
      const overlayOpacity = typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity : 0.5
      const isFreeform = settings.heroLayout === 'freeform'

      return (
        <section
          style={{
            ...containerStyle,
            backgroundImage: heroHasImage ? `url("${settings.imageUrl}")` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
            minHeight: isFreeform ? '500px' : undefined,
            overflow: isFreeform ? 'hidden' : undefined,
          }}
        >
          {heroHasImage && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: `rgba(0,0,0,${overlayOpacity})` }} />
          )}

          {isFreeform ? (
            <div className="relative z-10" style={{ position: 'relative', minHeight: '460px' }}>
              {/* Title - freely movable */}
              <HeroDraggableElement
                isEditing={isEditing}
                posX={(settings.titleX as number) || 0}
                posY={(settings.titleY as number) || 0}
                onDragStop={(x, y) => {
                  onUpdateSettings?.('titleX', x)
                  onUpdateSettings?.('titleY', y)
                }}
                label="Title"
              >
                <h1 className="text-4xl md:text-6xl font-bold mb-0 select-none">
                  {(settings.title as string) || 'Hero Title'}
                </h1>
              </HeroDraggableElement>

              {/* Subtitle - freely movable */}
              {settings.subtitle && (
                <HeroDraggableElement
                  isEditing={isEditing}
                  posX={(settings.subtitleX as number) || 0}
                  posY={(settings.subtitleY as number) || 60}
                  onDragStop={(x, y) => {
                    onUpdateSettings?.('subtitleX', x)
                    onUpdateSettings?.('subtitleY', y)
                  }}
                  label="Subtitle"
                >
                  <p className="text-lg md:text-xl opacity-80 mb-0 select-none">
                    {settings.subtitle as string}
                  </p>
                </HeroDraggableElement>
              )}

              {/* Primary Button - freely movable */}
              {settings.buttonText && (
                <HeroDraggableElement
                  isEditing={isEditing}
                  posX={(settings.btnPrimaryX as number) || 0}
                  posY={(settings.btnPrimaryY as number) || 120}
                  onDragStop={(x, y) => {
                    onUpdateSettings?.('btnPrimaryX', x)
                    onUpdateSettings?.('btnPrimaryY', y)
                  }}
                  label="Primary Button"
                >
                  <span className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg cursor-pointer select-none">
                    {settings.buttonText as string}
                  </span>
                </HeroDraggableElement>
              )}

              {/* Secondary Button - freely movable */}
              {settings.secondaryButtonText && (
                <HeroDraggableElement
                  isEditing={isEditing}
                  posX={(settings.btnSecondaryX as number) || 200}
                  posY={(settings.btnSecondaryY as number) || 120}
                  onDragStop={(x, y) => {
                    onUpdateSettings?.('btnSecondaryX', x)
                    onUpdateSettings?.('btnSecondaryY', y)
                  }}
                  label="Secondary Button"
                >
                  <span className="inline-block bg-transparent text-white border-2 border-white font-bold py-3 px-8 rounded-lg text-lg cursor-pointer select-none hover:bg-white hover:text-gray-900">
                    {settings.secondaryButtonText as string}
                  </span>
                </HeroDraggableElement>
              )}
            </div>
          ) : (
            <div className="container mx-auto relative z-10">
              <div className={`max-w-3xl ${settings.alignment === 'center' ? 'mx-auto text-center' : ''}`}>
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  {(settings.title as string) || 'Hero Title'}
                </h1>
                {settings.subtitle && (
                  <p className="text-lg md:text-xl opacity-80 mb-8">
                    {settings.subtitle as string}
                  </p>
                )}
                <div className={`flex flex-col sm:flex-row gap-4 ${settings.alignment === 'center' ? 'justify-center' : ''}`}>
                  {settings.buttonText && (
                    <span className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg cursor-pointer">
                      {settings.buttonText as string}
                    </span>
                  )}
                  {settings.secondaryButtonText && (
                    <span className="inline-block bg-transparent text-white border-2 border-white font-bold py-3 px-8 rounded-lg text-lg cursor-pointer hover:bg-white hover:text-gray-900">
                      {settings.secondaryButtonText as string}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )
    }

    case 'text':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )

    case 'image':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {settings.imageUrl ? (
              <img
                src={settings.imageUrl as string}
                alt={(settings.alt as string) || ''}
                className="max-w-full h-auto rounded-lg"
                style={{ width: styles.width || '100%', height: styles.height || 'auto' }}
              />
            ) : (
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-16 rounded-lg">
                <span className="text-4xl mb-2">🏞️</span>
                <p className="text-gray-400 text-sm font-play">Add an image URL in the properties panel</p>
              </div>
            )}
          </div>
        </div>
      )

    case 'button': {
      const alignment = styles.textAlign || 'center'
      const justifyClass = alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'
      return (
        <div style={containerStyle}>
          <div className={`container mx-auto flex ${justifyClass}`}>
            <span className="inline-block bg-red-600 text-white font-bold py-3 px-8 rounded-lg text-lg cursor-pointer hover:bg-red-700">
              {content || 'Button'}
            </span>
          </div>
        </div>
      )
    }

    case 'gallery':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className={`grid grid-cols-2 md:grid-cols-${settings.columns || 3} gap-4`}>
              {children && children.length > 0 ? (
                children.map((image, idx) => (
                  <div key={image.id} className="aspect-square bg-gray-100 overflow-hidden rounded-lg">
                    {image.settings.imageUrl ? (
                      <img
                        src={image.settings.imageUrl as string}
                        alt={(image.settings.alt as string) || ''}
                        className="w-full h-full object-cover hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                        <span className="text-3xl mb-1">🏞️</span>
                        <span className="text-xs">Image {idx + 1}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
                  <span className="text-3xl mb-2">🖼️</span>
                  <p className="text-sm font-play">No images added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )

    case 'three-column':
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {children?.map((child) => (
                <div key={child.id} className={styles.textAlign === 'center' ? 'text-center' : ''}>
                  {child.settings.icon && (
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full mb-4 text-2xl">
                      {child.settings.icon as string}
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: child.content }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'two-column':
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {children?.slice(0, 2).map((child) => (
                <div key={child.id}>
                  <div dangerouslySetInnerHTML={{ __html: child.content }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'video':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {settings.videoUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={settings.videoUrl as string}
                  className="w-full h-full"
                  allowFullScreen
                  title={(settings.title as string) || 'Video'}
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center rounded-lg">
                <span className="text-4xl mb-2">🎬</span>
                <p className="text-gray-400 text-sm font-play">Add a video URL in the properties panel</p>
              </div>
            )}
          </div>
        </div>
      )

    case 'divider':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <hr style={{
              borderTop: `${settings.thickness || '1px'} ${settings.style || 'solid'} ${settings.color || '#e5e7eb'}`,
            }} />
          </div>
        </div>
      )

    case 'product-grid':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: (settings.productCount as number) || 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-100">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center">
                    <span className="text-gray-300 text-5xl">🏎️</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-1 text-gray-800">Product {i + 1}</h3>
                    {settings.showPrice && <p className="text-red-600 font-bold text-lg mb-2">R999.99</p>}
                    {settings.showAddToCart && (
                      <span className="block text-center bg-red-600 text-white text-sm font-semibold py-2 px-4 rounded-lg">
                        Add to Cart
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'featured-product':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {settings.imageUrl ? (
                  <img src={settings.imageUrl as string} alt={content} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-8xl">🏎️</span>
                )}
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-4">{content}</h2>
                <p className="text-lg mb-6 opacity-80">{(settings.description as string) || 'Premium slot car collection'}</p>
                <p className="text-red-500 text-3xl font-bold mb-6">{(settings.price as string) || 'R1,499.99'}</p>
                <span className="inline-block bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-lg">
                  Add to Cart
                </span>
              </div>
            </div>
          </div>
        </div>
      )

    case 'quote':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <blockquote className="text-2xl italic font-serif border-l-4 border-red-600 pl-6 py-4">
              {content}
              {settings.author && (
                <footer className="text-base not-italic font-sans text-gray-600 mt-2">
                  — {settings.author as string}
                </footer>
              )}
            </blockquote>
          </div>
        </div>
      )

    case 'icon-text':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="flex items-start gap-4">
              {settings.icon && <div className="text-4xl">{settings.icon as string}</div>}
              <div className="flex-1">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>
          </div>
        </div>
      )

    case 'section': {
      const sectionTitle = (settings.sectionTitle as string) || ''
      const sectionSubtitle = (settings.sectionSubtitle as string) || ''
      return (
        <section style={{ ...containerStyle, minHeight: '200px' }}>
          <div className="container mx-auto">
            {sectionTitle && (
              <h2 className="text-3xl font-bold mb-2 text-center">{sectionTitle}</h2>
            )}
            {sectionSubtitle && (
              <p className="text-lg opacity-70 mb-8 text-center max-w-2xl mx-auto">{sectionSubtitle}</p>
            )}
            {children && children.length > 0 ? (
              <div className="space-y-4">
                {children.map((child) => (
                  <RenderedComponent key={child.id} component={child} />
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400">
                <span className="text-3xl mb-2 block">📐</span>
                <p className="text-sm font-play">Empty section — add child components</p>
              </div>
            )}
          </div>
        </section>
      )
    }

    case 'content-block': {
      const imgPos = (settings.imagePosition as string) || 'top'
      const hasImage = settings.imageUrl && (settings.imageUrl as string).trim() !== ''
      const blockContent = (
        <div className="flex-1">
          <div dangerouslySetInnerHTML={{ __html: content }} />
          {settings.buttonText && (
            <span className="inline-block mt-4 bg-red-600 text-white font-semibold py-2 px-6 rounded-lg text-sm cursor-pointer hover:bg-red-700">
              {settings.buttonText as string}
            </span>
          )}
        </div>
      )
      const blockImage = hasImage ? (
        <div className={imgPos === 'top' || imgPos === 'bottom' ? 'w-full' : 'w-1/2 flex-shrink-0'}>
          <img
            src={settings.imageUrl as string}
            alt={(settings.alt as string) || ''}
            className="w-full h-auto rounded-lg object-cover"
            style={{ maxHeight: imgPos === 'top' || imgPos === 'bottom' ? '300px' : undefined }}
          />
        </div>
      ) : null

      if (imgPos === 'left' && blockImage) {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto flex gap-6 items-start">
              {blockImage}
              {blockContent}
            </div>
          </div>
        )
      }
      if (imgPos === 'right' && blockImage) {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto flex gap-6 items-start">
              {blockContent}
              {blockImage}
            </div>
          </div>
        )
      }
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {imgPos === 'top' && blockImage}
            {blockContent}
            {imgPos === 'bottom' && blockImage}
          </div>
        </div>
      )
    }

    case 'ui-component': {
      const compType = (settings.componentType as string) || 'card'
      const title = (settings.title as string) || 'Component'
      const description = (settings.description as string) || ''
      const icon = (settings.icon as string) || '🧩'

      if (compType === 'stat') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto text-center">
              <div className="text-4xl mb-2">{icon}</div>
              <div className="text-3xl font-bold mb-1">{title}</div>
              {description && <p className="text-sm opacity-70">{description}</p>}
            </div>
          </div>
        )
      }
      if (compType === 'badge') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                <span>{icon}</span> {title}
              </span>
            </div>
          </div>
        )
      }
      // Default: card
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-lg font-bold mb-2">{title}</h3>
              {description && <p className="text-sm text-gray-600">{description}</p>}
              {settings.actionText && (
                <span className="inline-block mt-4 text-red-600 font-semibold text-sm cursor-pointer hover:underline">
                  {settings.actionText as string} &rarr;
                </span>
              )}
            </div>
          </div>
        </div>
      )
    }

    case 'slot': {
      const slotLabel = (settings.slotLabel as string) || 'Drop Zone'
      const minH = (settings.slotMinHeight as string) || '120'
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div
              className="border-2 border-dashed border-blue-300 bg-blue-50/50 rounded-lg flex flex-col items-center justify-center text-blue-400"
              style={{ minHeight: `${minH}px` }}
            >
              <span className="text-2xl mb-1">🔲</span>
              <p className="text-sm font-play font-medium">{slotLabel}</p>
              <p className="text-xs font-play mt-1">Placeholder — content goes here</p>
            </div>
          </div>
        </div>
      )
    }

    case 'widget': {
      const widgetType = (settings.widgetType as string) || 'search'

      if (widgetType === 'search') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto">
              <div className="max-w-xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={(settings.placeholder as string) || 'Search...'}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    readOnly
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )
      }
      if (widgetType === 'newsletter') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto max-w-lg text-center">
              <h3 className="text-xl font-bold mb-2">{(settings.title as string) || 'Subscribe'}</h3>
              <p className="text-sm opacity-70 mb-4">{(settings.description as string) || 'Get the latest updates'}</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
                  readOnly
                />
                <span className="inline-block bg-red-600 text-white font-semibold py-2.5 px-6 rounded-lg text-sm cursor-pointer">
                  Subscribe
                </span>
              </div>
            </div>
          </div>
        )
      }
      if (widgetType === 'contact-form') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto max-w-lg">
              <h3 className="text-xl font-bold mb-4">{(settings.title as string) || 'Contact Us'}</h3>
              <div className="space-y-3">
                <input type="text" placeholder="Your Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" readOnly />
                <input type="email" placeholder="Email Address" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" readOnly />
                <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none" readOnly />
                <span className="inline-block bg-red-600 text-white font-semibold py-2.5 px-6 rounded-lg text-sm cursor-pointer">
                  Send Message
                </span>
              </div>
            </div>
          </div>
        )
      }
      // Default: generic widget
      return (
        <div style={containerStyle}>
          <div className="container mx-auto text-center py-8">
            <span className="text-3xl mb-2 block">⚙️</span>
            <p className="text-sm font-play text-gray-500">Widget: {widgetType}</p>
          </div>
        </div>
      )
    }

    case 'media': {
      const mediaType = (settings.mediaType as string) || 'image'
      const caption = (settings.caption as string) || ''
      const aspectRatio = (settings.aspectRatio as string) || '16/9'

      if (mediaType === 'video') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto">
              {settings.videoUrl ? (
                <div style={{ aspectRatio }} className="rounded-lg overflow-hidden">
                  <iframe
                    src={settings.videoUrl as string}
                    className="w-full h-full"
                    allowFullScreen
                    title="Media video"
                  />
                </div>
              ) : (
                <div style={{ aspectRatio }} className="bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center rounded-lg">
                  <span className="text-4xl mb-2">🎬</span>
                  <p className="text-gray-400 text-sm font-play">Add a video URL</p>
                </div>
              )}
              {caption && <p className="text-sm text-gray-500 mt-2 text-center italic">{caption}</p>}
            </div>
          </div>
        )
      }
      // Image media
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {settings.imageUrl ? (
              <figure>
                <img
                  src={settings.imageUrl as string}
                  alt={(settings.alt as string) || ''}
                  className="w-full rounded-lg object-cover"
                  style={{ aspectRatio }}
                />
                {caption && <figcaption className="text-sm text-gray-500 mt-2 text-center italic">{caption}</figcaption>}
              </figure>
            ) : (
              <div style={{ aspectRatio }} className="bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center rounded-lg">
                <span className="text-4xl mb-2">🎨</span>
                <p className="text-gray-400 text-sm font-play">Add media in the properties panel</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    default:
      return (
        <div style={containerStyle}>
          <div className="container mx-auto py-8 text-center text-gray-400">
            <p className="font-play">Unknown component: {type}</p>
          </div>
        </div>
      )
  }
}

// ─── Draggable Hero Element ───
function HeroDraggableElement({
  children,
  isEditing,
  posX,
  posY,
  onDragStop,
  label,
}: {
  children: React.ReactNode
  isEditing?: boolean
  posX: number
  posY: number
  onDragStop: (x: number, y: number) => void
  label: string
}) {
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleStop = useCallback((_e: DraggableEvent, data: DraggableData) => {
    onDragStop(data.x, data.y)
  }, [onDragStop])

  if (!isEditing) {
    // Static positioned element (for drag overlay / non-edit mode)
    return (
      <div style={{ position: 'absolute', left: posX, top: posY }}>
        {children}
      </div>
    )
  }

  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={{ x: posX, y: posY }}
      onStop={handleStop}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        style={{ position: 'absolute', cursor: 'grab' }}
        className="group/drag"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Drag indicator label */}
        <div className="absolute -top-6 left-0 opacity-0 group-hover/drag:opacity-100 transition-opacity pointer-events-none">
          <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded font-play whitespace-nowrap">
            {label} (drag to move)
          </span>
        </div>
        <div className="ring-0 hover:ring-2 hover:ring-purple-400 hover:ring-offset-1 rounded transition-all">
          {children}
        </div>
      </div>
    </Draggable>
  )
}
