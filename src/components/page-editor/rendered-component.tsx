import React from 'react'
import type { PageComponent } from '@/lib/pages/schema'

export function RenderedComponent({ component }: { component: PageComponent }) {
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
  }

  switch (type) {
    case 'hero':
      const heroHasImage = settings.imageUrl && (settings.imageUrl as string).trim() !== ''
      return (
        <section
          style={{
            ...containerStyle,
            backgroundImage: heroHasImage ? `url(${settings.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {heroHasImage && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          )}
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
        </section>
      )

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
