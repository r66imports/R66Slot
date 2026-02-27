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
  // Hidden elements: invisible on live site, still rendered (ghosted) in editor
  if (component.hidden && !isEditing) return null

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

    case 'header': {
      const logoText = (settings.logoText as string) || 'R66SLOT'
      const menuItemsStr = (settings.menuItems as string) || 'Products,Brands,About,Contact'
      const menuLinksStr = (settings.menuLinks as string) || '/products,/brands,/about,/contact'
      const menuItems = menuItemsStr.split(',').map(s => s.trim())
      const menuLinks = menuLinksStr.split(',').map(s => s.trim())
      const bgColor = styles.backgroundColor || '#1F2937'
      return (
        <header style={{
          backgroundColor: bgColor,
          height: styles.height || '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: styles.paddingLeft || '32px',
          paddingRight: styles.paddingRight || '32px',
        }}>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>
            <span style={{ color: '#ffffff' }}>{logoText.substring(0, 3)}</span>
            <span style={{ color: '#DC2626' }}>{logoText.substring(3)}</span>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {menuItems.map((item, i) => (
              <span key={i} style={{ color: '#ffffff', fontSize: '14px', cursor: 'pointer' }}>{item}</span>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <div style={{ position: 'relative' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#DC2626', color: '#fff', fontSize: '10px', fontWeight: 700, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>0</span>
            </div>
          </div>
        </header>
      )
    }

    case 'text':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto" dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      )

    case 'image': {
      const isFreeformImage = component.positionMode === 'absolute'
      const imgObjectFit = (settings.objectFit as string) || 'cover'
      const imgObjectPosition = (settings.objectPosition as string) || 'center center'

      return (
        <div style={{ ...containerStyle, ...(isFreeformImage ? { width: '100%', height: '100%' } : {}) }}>
          <div className={isFreeformImage ? 'w-full h-full' : 'container mx-auto'} style={isFreeformImage ? { width: '100%', height: '100%' } : undefined}>
            {settings.imageUrl ? (
              <img
                src={settings.imageUrl as string}
                alt={(settings.alt as string) || ''}
                className={isFreeformImage ? 'w-full h-full' : 'max-w-full h-auto rounded-lg'}
                style={{
                  objectFit: imgObjectFit as any,
                  objectPosition: imgObjectPosition,
                  width: '100%',
                  height: isFreeformImage ? '100%' : (styles.height || 'auto'),
                }}
                loading="lazy"
                onError={(e) => {
                  const img = e.target as HTMLImageElement
                  if (!img.dataset.retried) {
                    img.dataset.retried = '1'
                    img.src = settings.imageUrl as string
                  } else {
                    img.style.display = 'none'
                    if (img.parentElement) {
                      img.parentElement.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;padding:2rem;background:#f3f4f6;border-radius:8px;min-height:120px"><span style="color:#9ca3af;font-size:14px">Image failed to load</span></div>'
                    }
                  }
                }}
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
    }

    case 'button': {
      const alignment = styles.textAlign || 'center'
      const justifyClass = alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'
      const btnVariant = (settings.variant as string) || 'primary'
      const btnSize = (settings.size as string) || 'medium'
      const btnShape = (settings.shape as string) || 'rounded'
      const btnIcon = (settings.icon as string) || ''
      const btnIconPos = (settings.iconPosition as string) || 'right'
      const btnFullWidth = !!settings.fullWidth

      const variantClasses: Record<string, string> = {
        primary: 'bg-primary text-black hover:brightness-110',
        secondary: 'bg-gray-800 text-white hover:bg-gray-700',
        outline: 'border-2 border-gray-800 text-gray-800 bg-transparent hover:bg-gray-800 hover:text-white',
        ghost: 'text-gray-800 bg-gray-100 hover:bg-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        success: 'bg-green-600 text-white hover:bg-green-700',
      }
      const sizeClasses: Record<string, string> = {
        small: 'py-1.5 px-4 text-sm',
        medium: 'py-3 px-8 text-base',
        large: 'py-4 px-10 text-lg',
      }
      const shapeClasses: Record<string, string> = {
        rounded: 'rounded-lg',
        pill: 'rounded-full',
        square: 'rounded-none',
      }

      return (
        <div style={containerStyle}>
          <div className={`container mx-auto flex ${justifyClass}`}>
            <span className={`inline-flex items-center gap-2 font-bold cursor-pointer transition-all ${variantClasses[btnVariant] || variantClasses.primary} ${sizeClasses[btnSize] || sizeClasses.medium} ${shapeClasses[btnShape] || shapeClasses.rounded} ${btnFullWidth ? 'w-full justify-center' : ''}`}>
              {btnIcon && btnIconPos === 'left' && <span>{btnIcon}</span>}
              {content || 'Button'}
              {btnIcon && btnIconPos === 'right' && <span>{btnIcon}</span>}
            </span>
          </div>
        </div>
      )
    }

    case 'gallery': {
      const galleryMode = (settings.galleryMode as string) || 'square'
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className={`grid grid-cols-2 md:grid-cols-${settings.columns || 3} gap-4`}>
              {children && children.length > 0 ? (
                children.map((image, idx) => {
                  const imgWidth = (image.styles?.width as string) || ''
                  const imgHeight = (image.styles?.height as string) || ''

                  if (galleryMode === 'fixed') {
                    // Fixed 300px wide, maintain aspect ratio
                    return (
                      <div key={image.id} className="bg-gray-100 overflow-hidden rounded-lg flex justify-center">
                        {image.settings.imageUrl ? (
                          <img
                            src={image.settings.imageUrl as string}
                            alt={(image.settings.alt as string) || ''}
                            className="hero-image hover:scale-105 transition-transform"
                            style={{
                              width: imgWidth || '300px',
                              height: imgHeight || 'auto',
                              objectFit: 'contain',
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center text-gray-300">
                            <span className="text-3xl mb-1">🏞️</span>
                            <span className="text-xs">Image {idx + 1}</span>
                          </div>
                        )}
                      </div>
                    )
                  }

                  if (galleryMode === 'responsive') {
                    // Responsive: fill container width, never exceed original height
                    return (
                      <div key={image.id} className="bg-gray-100 overflow-hidden rounded-lg">
                        {image.settings.imageUrl ? (
                          <img
                            src={image.settings.imageUrl as string}
                            alt={(image.settings.alt as string) || ''}
                            className="hero-image hover:scale-105 transition-transform"
                            style={{
                              width: imgWidth || '100%',
                              height: imgHeight || 'auto',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        ) : (
                          <div className="w-full h-48 flex flex-col items-center justify-center text-gray-300">
                            <span className="text-3xl mb-1">🏞️</span>
                            <span className="text-xs">Image {idx + 1}</span>
                          </div>
                        )}
                      </div>
                    )
                  }

                  // Default: square with object-fit cover (200x200 container)
                  return (
                    <div
                      key={image.id}
                      className="bg-gray-100 overflow-hidden rounded-lg"
                      style={{ width: '200px', height: '200px' }}
                    >
                      {image.settings.imageUrl ? (
                        <img
                          src={image.settings.imageUrl as string}
                          alt={(image.settings.alt as string) || ''}
                          className="hero-image w-full h-full hover:scale-110 transition-transform"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                          <span className="text-3xl mb-1">🏞️</span>
                          <span className="text-xs">Image {idx + 1}</span>
                        </div>
                      )}
                    </div>
                  )
                })
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
    }

    case 'three-column':
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {children?.map((child) => {
                const imgObjectFit = (child.settings.objectFit as string) || 'cover'
                const colContent = (
                  <div
                    key={child.id}
                    className={styles.textAlign === 'center' ? 'text-center' : ''}
                    style={{ direction: 'ltr' }}
                  >
                    {child.settings.icon && (
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full mb-4 text-2xl">
                        {child.settings.icon as string}
                      </div>
                    )}
                    {(child.settings.imageUrl as string) && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={child.settings.imageUrl as string}
                          alt={(child.settings.alt as string) || ''}
                          className="w-full h-auto rounded-lg"
                          style={{ objectFit: imgObjectFit as any }}
                        />
                      </div>
                    )}
                    <div style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} dangerouslySetInnerHTML={{ __html: child.content }} />
                  </div>
                )
                if (child.settings.link) {
                  return (
                    <a
                      key={child.id}
                      href={child.settings.link as string}
                      target={(child.settings.link as string).startsWith('http') ? '_blank' : undefined}
                      rel={(child.settings.link as string).startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="block no-underline text-inherit hover:opacity-80 transition-opacity"
                    >
                      {colContent}
                    </a>
                  )
                }
                return colContent
              })}
            </div>
          </div>
        </section>
      )

    case 'two-column':
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {children?.slice(0, 2).map((child) => {
                const imgObjectFit = (child.settings.objectFit as string) || 'cover'
                const colContent = (
                  <div key={child.id} style={{ direction: 'ltr' }}>
                    {(child.settings.imageUrl as string) && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={child.settings.imageUrl as string}
                          alt={(child.settings.alt as string) || ''}
                          className="w-full h-auto rounded-lg"
                          style={{ objectFit: imgObjectFit as any }}
                        />
                      </div>
                    )}
                    <div style={{ direction: 'ltr', unicodeBidi: 'plaintext' }} dangerouslySetInnerHTML={{ __html: child.content }} />
                  </div>
                )
                if (child.settings.link) {
                  return (
                    <a
                      key={child.id}
                      href={child.settings.link as string}
                      target={(child.settings.link as string).startsWith('http') ? '_blank' : undefined}
                      rel={(child.settings.link as string).startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="block no-underline text-inherit hover:opacity-80 transition-opacity"
                    >
                      {colContent}
                    </a>
                  )
                }
                return colContent
              })}
            </div>
          </div>
        </section>
      )

    case 'columns': {
      const colCount = (settings.columns as number) || 2
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div
              className="grid gap-8"
              style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
            >
              {children?.slice(0, colCount).map((child) => {
                // Get image fit settings
                const imgObjectFit = (child.settings.objectFit as string) || 'cover'

                const colContent = (
                  <div
                    key={child.id}
                    className={styles.textAlign === 'center' ? 'text-center' : ''}
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  >
                    {/* Column Icon */}
                    {child.settings.icon && (
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 text-white rounded-full mb-4 text-2xl">
                        {child.settings.icon as string}
                      </div>
                    )}
                    {/* Column Image with Image Fit */}
                    {(child.settings.imageUrl as string) && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={child.settings.imageUrl as string}
                          alt={(child.settings.alt as string) || ''}
                          className="w-full h-auto rounded-lg"
                          style={{
                            objectFit: imgObjectFit as any,
                            maxHeight: imgObjectFit === 'contain' ? '300px' : undefined,
                          }}
                        />
                      </div>
                    )}
                    {/* Column Text Content - Fix text direction */}
                    <div
                      style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}
                      dangerouslySetInnerHTML={{ __html: child.content }}
                    />
                  </div>
                )

                // Wrap in link if URL is set
                if (child.settings.link) {
                  return (
                    <a
                      key={child.id}
                      href={child.settings.link as string}
                      target={(child.settings.link as string).startsWith('http') ? '_blank' : undefined}
                      rel={(child.settings.link as string).startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="block no-underline text-inherit hover:opacity-80 transition-opacity"
                    >
                      {colContent}
                    </a>
                  )
                }
                return colContent
              })}
            </div>
          </div>
        </section>
      )
    }

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

    case 'box': {
      const isFreeformBox = component.positionMode === 'absolute'
      return (
        <div
          style={{
            ...containerStyle,
            position: 'relative',
            overflow: 'hidden',
            width: isFreeformBox ? '100%' : (styles.width || '100%'),
            height: isFreeformBox ? '100%' : (styles.height || '300px'),
          }}
        >
          {children && children.length > 0 ? (
            children.map((child) => {
              if (child.type === 'image') {
                return (
                  <div key={child.id} style={{ position: 'absolute', inset: 0 }}>
                    {child.settings.imageUrl ? (
                      <img
                        src={child.settings.imageUrl as string}
                        alt={(child.settings.alt as string) || ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: (child.settings.objectFit as string as any) || 'cover',
                          objectPosition: (child.settings.objectPosition as string) || 'center center',
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-sm font-play">No image</span>
                      </div>
                    )}
                  </div>
                )
              }
              return <RenderedComponent key={child.id} component={child} />
            })
          ) : (
            <div className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400">
              <span className="text-3xl mb-2">📦</span>
              <p className="text-sm font-play">Empty box — drop an image here</p>
            </div>
          )}
        </div>
      )
    }

    case 'section': {
      const sectionTitle = (settings.sectionTitle as string) || ''
      const sectionSubtitle = (settings.sectionSubtitle as string) || ''
      // Check if section has only image children (container mode)
      const hasOnlyImages = children && children.length > 0 && children.every(c => c.type === 'image')
      return (
        <section data-section-container="true" style={{ ...containerStyle, minHeight: '200px', position: 'relative', overflow: 'hidden' }}>
          <div className="container mx-auto" style={hasOnlyImages ? { height: '100%' } : undefined}>
            {sectionTitle && (
              <h2 className="text-3xl font-bold mb-2 text-center">{sectionTitle}</h2>
            )}
            {sectionSubtitle && (
              <p className="text-lg opacity-70 mb-8 text-center max-w-2xl mx-auto">{sectionSubtitle}</p>
            )}
            {children && children.length > 0 ? (
              <div className={hasOnlyImages ? 'w-full h-full' : 'space-y-4'} style={hasOnlyImages ? { minHeight: 'inherit' } : undefined}>
                {children.map((child) => {
                  // If child is an image inside this container, force it to fill
                  if (child.type === 'image') {
                    const filledChild = {
                      ...child,
                      settings: {
                        ...child.settings,
                        objectFit: child.settings.objectFit || 'cover',
                        objectPosition: child.settings.objectPosition || 'center center',
                      },
                    }
                    return (
                      <div key={child.id} className="w-full" style={{ minHeight: 'inherit' }}>
                        <RenderedComponent component={filledChild} />
                      </div>
                    )
                  }
                  return <RenderedComponent key={child.id} component={child} />
                })}
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

    case 'strip': {
      return (
        <div
          style={{
            ...containerStyle,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {settings.imageUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("${settings.imageUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0,
              }}
            />
          )}
          <div className="container mx-auto relative z-10">
            {children && children.length > 0 ? (
              <div className="space-y-4">
                {children.map((child) => (
                  <RenderedComponent key={child.id} component={child} />
                ))}
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center text-gray-400">
                <span className="text-3xl mb-2 block">▬</span>
                <p className="text-sm font-play">Empty strip — add child components</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    case 'banner': {
      const bannerText = content || 'Banner Text'
      const btnText = (settings.buttonText as string) || ''
      return (
        <div
          style={{
            ...containerStyle,
            width: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {settings.imageUrl && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("${settings.imageUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                zIndex: 0,
              }}
            />
          )}
          {settings.imageUrl && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }} />
          )}
          <div className="container mx-auto relative z-10 flex items-center justify-center gap-6 flex-wrap">
            <span style={{ fontSize: styles.fontSize || '20px', fontWeight: styles.fontWeight || '600' }}>
              {bannerText}
            </span>
            {btnText && (
              <span className="inline-block bg-primary text-black font-semibold py-2 px-6 rounded-lg text-sm cursor-pointer hover:bg-primary/90">
                {btnText}
              </span>
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
