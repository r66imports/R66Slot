import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { PageComponent } from '@/lib/pages/schema'

interface ComponentRendererProps {
  component: PageComponent
}

export function ComponentRenderer({ component }: ComponentRendererProps) {
  const { type, content, styles, settings, children } = component

  // Convert styles object to inline CSS
  const containerStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || 'transparent',
    color: styles.textColor || 'inherit',
    paddingTop: styles.paddingTop || styles.padding || '0px',
    paddingBottom: styles.paddingBottom || styles.padding || '0px',
    paddingLeft: styles.paddingLeft || styles.padding || '16px',
    paddingRight: styles.paddingRight || styles.padding || '16px',
    marginTop: styles.marginTop || styles.margin || '0px',
    marginBottom: styles.marginBottom || styles.margin || '0px',
    marginLeft: styles.marginLeft || styles.margin || 'auto',
    marginRight: styles.marginRight || styles.margin || 'auto',
    textAlign: styles.textAlign as any,
    maxWidth: styles.maxWidth || '100%',
    minHeight: styles.minHeight,
    borderRadius: styles.borderRadius,
    border: styles.border,
    boxShadow: styles.boxShadow,
  }

  switch (type) {
    case 'text':
      return (
        <div style={containerStyle}>
          <div
            className="container mx-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
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
                className="max-w-full h-auto"
                style={{
                  width: styles.width || '100%',
                  height: styles.height || 'auto',
                }}
              />
            ) : (
              <div className="bg-gray-200 flex items-center justify-center p-12">
                <p className="text-gray-500">No image selected</p>
              </div>
            )}
          </div>
        </div>
      )

    case 'button':
      const alignment = styles.textAlign || 'left'
      const justifyClass =
        alignment === 'center'
          ? 'justify-center'
          : alignment === 'right'
          ? 'justify-end'
          : 'justify-start'

      return (
        <div style={containerStyle}>
          <div className={`container mx-auto flex ${justifyClass}`}>
            <Button
              size={
                settings.size === 'large'
                  ? 'lg'
                  : settings.size === 'small'
                  ? 'sm'
                  : 'md'
              }
              variant={(settings.variant as any) || 'primary'}
              asChild
            >
              <Link href={(settings.link as string) || '#'}>{content || 'Button'}</Link>
            </Button>
          </div>
        </div>
      )

    case 'hero': {
      const heroHasImage = settings.imageUrl && (settings.imageUrl as string).trim() !== ''
      const overlayOpacity = typeof settings.overlayOpacity === 'number' ? settings.overlayOpacity : 0.5
      const isFreeform = settings.heroLayout === 'freeform'

      return (
        <section
          style={{
            ...containerStyle,
            backgroundImage: heroHasImage ? `url(${settings.imageUrl})` : undefined,
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
              {/* Title */}
              <div style={{ position: 'absolute', left: (settings.titleX as number) || 0, top: (settings.titleY as number) || 0 }}>
                <h1 className="text-4xl md:text-6xl font-bold">
                  {settings.title || 'Hero Title'}
                </h1>
              </div>

              {/* Subtitle */}
              {settings.subtitle && (
                <div style={{ position: 'absolute', left: (settings.subtitleX as number) || 0, top: (settings.subtitleY as number) || 60 }}>
                  <p className="text-lg md:text-xl opacity-80">
                    {settings.subtitle}
                  </p>
                </div>
              )}

              {/* Primary Button */}
              {settings.buttonText && (
                <div style={{ position: 'absolute', left: (settings.btnPrimaryX as number) || 0, top: (settings.btnPrimaryY as number) || 120 }}>
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary-dark text-white"
                    asChild
                  >
                    <Link href={(settings.buttonLink as string) || '#'}>
                      {settings.buttonText}
                    </Link>
                  </Button>
                </div>
              )}

              {/* Secondary Button */}
              {settings.secondaryButtonText && (
                <div style={{ position: 'absolute', left: (settings.btnSecondaryX as number) || 200, top: (settings.btnSecondaryY as number) || 120 }}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-transparent text-white border-white hover:bg-white hover:text-secondary"
                    asChild
                  >
                    <Link href={(settings.secondaryButtonLink as string) || '#'}>
                      {settings.secondaryButtonText}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="container mx-auto relative z-10">
              <div
                className={`max-w-3xl ${
                  settings.alignment === 'center' ? 'mx-auto text-center' : ''
                }`}
              >
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  {settings.title || 'Hero Title'}
                </h1>
                {settings.subtitle && (
                  <p className="text-lg md:text-xl opacity-80 mb-8">
                    {settings.subtitle}
                  </p>
                )}
                <div className={`flex flex-col sm:flex-row gap-4 ${settings.alignment === 'center' ? 'justify-center' : ''}`}>
                  {settings.buttonText && (
                    <Button
                      size="lg"
                      className="bg-primary hover:bg-primary-dark text-white"
                      asChild
                    >
                      <Link href={(settings.buttonLink as string) || '#'}>
                        {settings.buttonText}
                      </Link>
                    </Button>
                  )}
                  {settings.secondaryButtonText && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-transparent text-white border-white hover:bg-white hover:text-secondary"
                      asChild
                    >
                      <Link href={(settings.secondaryButtonLink as string) || '#'}>
                        {settings.secondaryButtonText}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )
    }

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

    case 'three-column':
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {children?.map((child) => (
                <div
                  key={child.id}
                  className={styles.textAlign === 'center' ? 'text-center' : ''}
                >
                  {child.settings.icon && (
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full mb-4 text-2xl">
                      {child.settings.icon}
                    </div>
                  )}
                  <div dangerouslySetInnerHTML={{ __html: child.content }} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )

    case 'card':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className={`grid grid-cols-1 md:grid-cols-${settings.columns || 3} gap-6`}>
              {children?.map((card) => (
                <div key={card.id} className="bg-white rounded-lg shadow-md p-6">
                  <div dangerouslySetInnerHTML={{ __html: card.content }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'divider':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <hr
              style={{
                borderTop: `${settings.thickness || '1px'} ${settings.style || 'solid'} ${
                  settings.color || '#e5e7eb'
                }`,
              }}
            />
          </div>
        </div>
      )

    case 'video':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {settings.videoUrl ? (
              <div className="aspect-video">
                <iframe
                  src={settings.videoUrl as string}
                  className="w-full h-full"
                  allowFullScreen
                  title={(settings.title as string) || 'Video'}
                />
              </div>
            ) : (
              <div className="aspect-video bg-gray-200 flex items-center justify-center">
                <p className="text-gray-500">No video URL provided</p>
              </div>
            )}
          </div>
        </div>
      )

    case 'quote':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <blockquote className="text-2xl italic font-serif border-l-4 border-primary pl-6 py-4">
              {content}
              {settings.author && (
                <footer className="text-base not-italic font-sans text-gray-600 mt-2">
                  — {settings.author}
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
              {settings.icon && <div className="text-4xl">{settings.icon}</div>}
              <div className="flex-1">
                <div dangerouslySetInnerHTML={{ __html: content }} />
              </div>
            </div>
          </div>
        </div>
      )

    case 'gallery':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className={`grid grid-cols-2 md:grid-cols-${settings.columns || 3} gap-4`}>
              {children?.map((image, index) => {
                const imageContent = (
                  <>
                    {image.settings.imageUrl ? (
                      <img
                        src={image.settings.imageUrl as string}
                        alt={(image.settings.alt as string) || ''}
                        className="w-full h-full object-cover hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        Image {index + 1}
                      </div>
                    )}
                  </>
                )

                return image.settings.link ? (
                  <Link
                    key={image.id}
                    href={image.settings.link as string}
                    className="aspect-square bg-gray-200 overflow-hidden rounded-lg block cursor-pointer hover:shadow-xl transition-shadow"
                  >
                    {imageContent}
                  </Link>
                ) : (
                  <div
                    key={image.id}
                    className="aspect-square bg-gray-200 overflow-hidden rounded-lg"
                  >
                    {imageContent}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )

    case 'product-grid':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: (settings.productCount as number) || 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl">🏎️</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-2">Product {i + 1}</h3>
                    {settings.showPrice && <p className="text-primary font-bold mb-3">$99.99</p>}
                    {settings.showAddToCart && (
                      <button className="w-full bg-primary text-black font-semibold py-2 px-4 rounded hover:bg-primary/90">
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'product-card':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="inline-block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-gray-200 flex items-center justify-center">
                {settings.imageUrl ? (
                  <img src={settings.imageUrl as string} alt={content} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-6xl">🏎️</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-xl mb-2">{content}</h3>
                <p className="text-primary font-bold text-lg mb-3">{settings.price || '$99.99'}</p>
                {settings.showAddToCart && (
                  <button className="w-full bg-primary text-black font-semibold py-2 px-4 rounded hover:bg-primary/90">
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )

    case 'product-carousel':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="relative">
              <h2 className="text-2xl font-bold mb-6">Featured Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 overflow-x-auto">
                {Array.from({ length: (settings.productCount as number) || 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden min-w-[150px]">
                    <div className="aspect-square bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-3xl">🏎️</span>
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-sm mb-1">Product {i + 1}</h4>
                      <p className="text-primary font-bold text-sm">$99.99</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )

    case 'featured-product':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
                {settings.imageUrl ? (
                  <img src={settings.imageUrl as string} alt={content} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-gray-400 text-8xl">🏎️</span>
                )}
              </div>
              <div>
                <h2 className="text-4xl font-bold mb-4">{content}</h2>
                <p className="text-lg mb-6">{settings.description || 'Premium slot car collection'}</p>
                <p className="text-primary text-3xl font-bold mb-6">{settings.price || '$149.99'}</p>
                <button className="bg-primary text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-primary/90">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )

    case 'add-to-cart':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <button
              style={{
                backgroundColor: styles.backgroundColor || '#FFDD00',
                color: styles.textColor || '#000000',
                padding: styles.padding || '16px 32px',
                borderRadius: styles.borderRadius || '8px',
                fontSize: styles.fontSize || '18px',
                fontWeight: styles.fontWeight || 'bold',
                border: 'none',
                cursor: 'pointer',
              }}
              className="hover:opacity-90 transition-opacity"
            >
              {content || 'Add to Cart'}
            </button>
          </div>
        </div>
      )

    case 'price-display':
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div>
              <span
                style={{
                  fontSize: styles.fontSize || '32px',
                  fontWeight: styles.fontWeight || 'bold',
                  color: styles.textColor || '#FFDD00',
                }}
              >
                {content || '$99.99'}
              </span>
              {settings.showDiscount && settings.originalPrice && (
                <span className="ml-3 text-gray-500 line-through text-xl">
                  {settings.originalPrice}
                </span>
              )}
            </div>
          </div>
        </div>
      )

    case 'section': {
      const sectionTitle = (settings.sectionTitle as string) || ''
      const sectionSubtitle = (settings.sectionSubtitle as string) || ''
      return (
        <section style={containerStyle}>
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
                  <ComponentRenderer key={child.id} component={child} />
                ))}
              </div>
            ) : null}
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
            <div className="mt-4">
              <Button asChild>
                <Link href={(settings.buttonLink as string) || '#'}>
                  {settings.buttonText as string}
                </Link>
              </Button>
            </div>
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
            <div className="container mx-auto flex flex-col md:flex-row gap-6 items-start">
              {blockImage}
              {blockContent}
            </div>
          </div>
        )
      }
      if (imgPos === 'right' && blockImage) {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto flex flex-col md:flex-row gap-6 items-start">
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
      const uiTitle = (settings.title as string) || 'Component'
      const uiDescription = (settings.description as string) || ''
      const uiIcon = (settings.icon as string) || '🧩'

      if (compType === 'stat') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto text-center">
              <div className="text-4xl mb-2">{uiIcon}</div>
              <div className="text-3xl font-bold mb-1">{uiTitle}</div>
              {uiDescription && <p className="text-sm opacity-70">{uiDescription}</p>}
            </div>
          </div>
        )
      }
      if (compType === 'badge') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                <span>{uiIcon}</span> {uiTitle}
              </span>
            </div>
          </div>
        )
      }
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{uiIcon}</div>
              <h3 className="text-lg font-bold mb-2">{uiTitle}</h3>
              {uiDescription && <p className="text-sm text-gray-600">{uiDescription}</p>}
              {settings.actionText && settings.actionLink && (
                <Link href={settings.actionLink as string} className="inline-block mt-4 text-primary font-semibold text-sm hover:underline">
                  {settings.actionText as string} &rarr;
                </Link>
              )}
            </div>
          </div>
        </div>
      )
    }

    case 'slot':
      // Slots render their children on the frontend, or nothing if empty
      return children && children.length > 0 ? (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {children.map((child) => (
              <ComponentRenderer key={child.id} component={child} />
            ))}
          </div>
        </div>
      ) : null

    case 'widget': {
      const widgetType = (settings.widgetType as string) || 'search'
      if (widgetType === 'search') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder={(settings.placeholder as string) || 'Search...'}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
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
              <form className="flex gap-2">
                <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                <Button type="submit">Subscribe</Button>
              </form>
            </div>
          </div>
        )
      }
      if (widgetType === 'contact-form') {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto max-w-lg">
              <h3 className="text-xl font-bold mb-4">{(settings.title as string) || 'Contact Us'}</h3>
              <form className="space-y-3">
                <input type="text" placeholder="Your Name" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                <input type="email" placeholder="Email Address" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" />
                <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none" />
                <Button type="submit">Send Message</Button>
              </form>
            </div>
          </div>
        )
      }
      return null
    }

    case 'media': {
      const mediaType = (settings.mediaType as string) || 'image'
      const caption = (settings.caption as string) || ''
      const aspectRatio = (settings.aspectRatio as string) || '16/9'

      if (mediaType === 'video' && settings.videoUrl) {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto">
              <div style={{ aspectRatio }} className="rounded-lg overflow-hidden">
                <iframe
                  src={settings.videoUrl as string}
                  className="w-full h-full"
                  allowFullScreen
                  title="Video"
                />
              </div>
              {caption && <p className="text-sm text-gray-500 mt-2 text-center italic">{caption}</p>}
            </div>
          </div>
        )
      }
      if (settings.imageUrl) {
        return (
          <div style={containerStyle}>
            <div className="container mx-auto">
              <figure>
                <img
                  src={settings.imageUrl as string}
                  alt={(settings.alt as string) || ''}
                  className="w-full rounded-lg object-cover"
                  style={{ aspectRatio }}
                />
                {caption && <figcaption className="text-sm text-gray-500 mt-2 text-center italic">{caption}</figcaption>}
              </figure>
            </div>
          </div>
        )
      }
      return null
    }

    default:
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <p className="text-gray-500">Unknown component type: {type}</p>
          </div>
        </div>
      )
  }
}
