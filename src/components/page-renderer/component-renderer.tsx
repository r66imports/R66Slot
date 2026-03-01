'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLocalCart } from '@/context/local-cart-context'
import type { PageComponent } from '@/lib/pages/schema'
import { AnimatedWrapper, type AnimationType } from './animated-wrapper'

// ─── Live Product Grid — fetches real products filtered by class ──────────────
function ProductGridLive({
  settings,
  containerStyle,
}: {
  settings: PageComponent['settings']
  containerStyle: React.CSSProperties
}) {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const { addItem } = useLocalCart()

  const getQty = (id: string) => quantities[id] ?? 1
  const setQty = (id: string, val: number) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, val) }))

  useEffect(() => {
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((data) => {
        const KEEP_EMPTY = '__EMPTY__'
        let list = Array.isArray(data) ? data.filter((p: any) => p.status === 'active') : []
        // Racing class filter — supports multi-select (carClasses[]) and legacy single (carClass)
        const activeClasses: string[] = Array.isArray(settings.carClasses) && (settings.carClasses as string[]).length > 0
          ? (settings.carClasses as string[])
          : (settings.carClass ? [settings.carClass as string] : [])
        if (activeClasses.includes(KEEP_EMPTY)) {
          list = list.filter((p: any) => !p.carClass || p.carClass === '')
        } else if (activeClasses.length > 0) {
          list = list.filter((p: any) =>
            activeClasses.some((cls) => p.carClass === cls || p.tags?.includes(cls))
          )
        }
        // Revo parts filter — supports multi-select (revoParts[]) and legacy single (revoPart)
        const activeParts: string[] = Array.isArray(settings.revoParts) && (settings.revoParts as string[]).length > 0
          ? (settings.revoParts as string[])
          : (settings.revoPart ? [settings.revoPart as string] : [])
        if (activeParts.includes(KEEP_EMPTY)) {
          list = list.filter((p: any) =>
            (!p.revoPart || p.revoPart === '') &&
            (!Array.isArray(p.revoParts) || p.revoParts.length === 0)
          )
        } else if (activeParts.length > 0) {
          list = list.filter((p: any) =>
            activeParts.some((part) =>
              p.revoPart === part ||
              (Array.isArray(p.revoParts) && p.revoParts.includes(part)) ||
              p.tags?.includes(part)
            )
          )
        }
        const activeBrands = Array.isArray(settings.carBrands) ? (settings.carBrands as string[]) : []
        if (activeBrands.includes(KEEP_EMPTY)) {
          list = list.filter((p: any) => !p.carBrands || (Array.isArray(p.carBrands) && p.carBrands.length === 0))
        } else if (activeBrands.length > 0) {
          list = list.filter(
            (p: any) =>
              (Array.isArray(p.carBrands) && p.carBrands.some((b: string) => activeBrands.includes(b))) ||
              activeBrands.some((b) => p.tags?.includes(b))
          )
        }
        // Sort by SKU — numeric where possible, else alphabetical
        list.sort((a: any, b: any) => {
          const aNum = parseFloat(a.sku)
          const bNum = parseFloat(b.sku)
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
          return (a.sku || '').localeCompare(b.sku || '')
        })
        const rows = (settings.productRows as number) || 3
        const gridCols = (settings.gridColumns as number) || 3
        const cap = rows * gridCols
        setProducts(list.slice(0, cap))
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [settings.carClasses, settings.carClass, settings.revoParts, settings.revoPart, settings.carBrands, settings.productCount, settings.productRows, settings.gridColumns])

  const handleAddToCart = (p: any) => {
    addItem({
      id: p.id,
      title: p.title,
      brand: p.brand || '',
      price: p.price || 0,
      imageUrl: p.imageUrl || '',
      pageUrl: p.pageUrl || '',
    }, getQty(p.id))
    setQty(p.id, 1)
    setAddedId(p.id)
    setTimeout(() => setAddedId(null), 1500)
  }

  return (
    <div style={containerStyle}>
      <div className="container mx-auto">
        {/* Class badge header */}
        {(() => {
          const badges: string[] = Array.isArray(settings.carClasses) && (settings.carClasses as string[]).length > 0
            ? (settings.carClasses as string[])
            : (settings.carClass ? [settings.carClass as string] : [])
          return badges.length > 0 ? (
            <div className="mb-5 flex items-center flex-wrap gap-2">
              <span className="text-sm font-semibold text-gray-600">Class:</span>
              {badges.map((cls) => (
                <span key={cls} className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full tracking-wide">
                  {cls}
                </span>
              ))}
            </div>
          ) : null
        })()}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🏎️</p>
            <p className="text-sm">
              {(Array.isArray(settings.carClasses) ? (settings.carClasses as string[]) : settings.carClass ? [settings.carClass] : []).length > 0
                ? `No active products for selected class filter`
                : (Array.isArray(settings.revoParts) ? (settings.revoParts as string[]) : settings.revoPart ? [settings.revoPart] : []).length > 0
                ? `No active products for selected parts filter`
                : 'No active products found'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${(settings.gridColumns as number) || 3}, minmax(0, 1fr))`, gap: '1rem' }}>
            {products.map((p) => {
              const cardSize = (settings.cardSize as string) || 'standard'
              const imgHpx = cardSize === 'compact' ? '112px' : cardSize === 'large' ? '220px' : '160px'
              const imgFit = ((settings.imageFit as string) || 'contain') as React.CSSProperties['objectFit']
              const productUrl = p.pageUrl || '/products'
              return (
              <div
                key={p.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                {/* Image — click to open product page */}
                <a href={productUrl} target="_blank" rel="noopener noreferrer" className="block flex-shrink-0 cursor-pointer">
                  <div className="relative bg-white flex items-center justify-center overflow-hidden" style={{ height: imgHpx }}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="w-full h-full"
                        style={{ objectFit: imgFit }}
                      />
                    ) : (
                      <span className="text-gray-400 text-4xl">🏎️</span>
                    )}
                    {p.carClass && (
                      <span className="absolute top-2 right-2 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                        {p.carClass}
                      </span>
                    )}
                  </div>
                </a>
                <div className="p-3 flex flex-col flex-1">
                  {p.brand && (
                    <p className="text-[10px] text-black font-bold uppercase tracking-wider truncate mb-0.5">{p.brand}</p>
                  )}
                  {p.sku && (
                    <p className="text-[10px] text-black font-bold font-mono mb-1">{p.sku}</p>
                  )}
                  <h3 className="font-semibold text-sm mb-2 line-clamp-2 flex-1">{p.title}</h3>
                  {settings.showPrice && (
                    <p className="text-red-600 font-bold mb-2 text-sm">
                      {p.price > 0 ? `R${p.price.toFixed(2)}` : 'POA'}
                    </p>
                  )}
                  {settings.showAddToCart && (
                    <div className="mt-auto">
                      {p.isPreOrder ? (
                        <a
                          href="/book"
                          className="block w-full text-center font-semibold py-2 px-3 rounded text-sm bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                        >
                          Pre Order
                        </a>
                      ) : p.quantity === 0 ? (
                        <button
                          disabled
                          className="block w-full text-center font-semibold py-2 px-3 rounded text-sm bg-gray-300 text-gray-500 cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      ) : (
                        <>
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setQty(p.id, getQty(p.id) - 1)}
                              className="w-7 h-7 rounded border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center text-base leading-none"
                            >−</button>
                            <span className="w-6 text-center text-sm font-semibold">{getQty(p.id)}</span>
                            <button
                              type="button"
                              onClick={() => setQty(p.id, getQty(p.id) + 1)}
                              className="w-7 h-7 rounded border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 flex items-center justify-center text-base leading-none"
                            >+</button>
                          </div>
                          <button
                            onClick={() => handleAddToCart(p)}
                            className={`block w-full text-center font-semibold py-2 px-3 rounded text-sm transition-all duration-300 ${
                              addedId === p.id
                                ? 'bg-green-600 text-white scale-95'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {addedId === p.id ? '✓ Added!' : 'Add to Cart'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const BookingFormWidget = dynamic(() => import('./booking-form-widget'), { ssr: false })

interface ComponentRendererProps {
  component: PageComponent
}

export function ComponentRenderer({ component }: ComponentRendererProps) {
  const { type, content, styles, settings, children } = component
  const animation = (settings.animation as AnimationType) || 'none'
  const animDuration = parseFloat(String(settings.animationDuration || '0.6'))
  const animDelay = parseFloat(String(settings.animationDelay || '0'))

  // Apply rotation for absolute-positioned components
  const wrapperStyle: React.CSSProperties | undefined =
    component.positionMode === 'absolute' && component.position?.rotation
      ? { transform: `rotate(${component.position.rotation}deg)` }
      : undefined

  // Compute opacity values
  const componentOpacity = styles.opacity ? parseInt(styles.opacity) / 100 : 1
  const bgOpacity = styles.backgroundOpacity ? parseInt(styles.backgroundOpacity) / 100 : 1
  const textOpacity = styles.textOpacity ? parseInt(styles.textOpacity) / 100 : 1

  // Helper to apply opacity to hex color
  const applyOpacity = (color: string | undefined, opacity: number): string | undefined => {
    if (!color || opacity >= 1) return color
    if (color.startsWith('#') && color.length === 7) {
      const alphaHex = Math.round(opacity * 255).toString(16).padStart(2, '0')
      return color + alphaHex
    }
    return color
  }

  // Convert styles object to inline CSS
  const containerStyle: React.CSSProperties = {
    opacity: componentOpacity < 1 ? componentOpacity : undefined,
    backgroundColor: applyOpacity(styles.backgroundColor, bgOpacity) || 'transparent',
    color: applyOpacity(styles.textColor, textOpacity) || 'inherit',
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
    // Layout mode styles
    display: styles.display as any,
    flexDirection: styles.flexDirection as any,
    justifyContent: styles.justifyContent as any,
    alignItems: styles.alignItems as any,
    gap: styles.gap,
    width: styles.width,
    height: styles.height,
  }

  const rendered = (() => { switch (type) {
    case 'header': {
      const logoText = (settings.logoText as string) || 'R66SLOT'
      const menuItemsStr = (settings.menuItems as string) || 'Products,Brands,About,Contact'
      const menuLinksStr = (settings.menuLinks as string) || '/products,/brands,/about,/contact'
      const menuItems = menuItemsStr.split(',').map(s => s.trim())
      const menuLinks = menuLinksStr.split(',').map(s => s.trim())
      const bgColor = styles.backgroundColor || '#1F2937'
      const iconColor = styles.textColor || '#FFFFFF'
      return (
        <header style={{
          backgroundColor: bgColor,
          height: styles.height || '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          color: iconColor,
          width: '100%',
        }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>
              <span style={{ color: '#ffffff' }}>{logoText.substring(0, 3)}</span>
              <span style={{ color: '#DC2626' }}>{logoText.substring(3)}</span>
            </div>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {menuItems.map((item, i) => (
              <Link
                key={i}
                href={menuLinks[i] || '#'}
                style={{ color: iconColor, fontSize: '14px', textDecoration: 'none', opacity: 0.9 }}
              >
                {item}
              </Link>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Search */}
            <Link href="/products" aria-label="Search" style={{ color: iconColor, display: 'flex', padding: '8px' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </Link>
            {/* Account */}
            <Link href="/account" aria-label="Account" style={{ color: iconColor, display: 'flex', padding: '8px' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Link>
            {/* Cart */}
            <Link href="/cart" aria-label="Cart" style={{ color: iconColor, display: 'flex', padding: '8px' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </Link>
          </div>
        </header>
      )
    }

    case 'text':
      return (
        <div style={containerStyle}>
          <div
            className="container mx-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )

    case 'image': {
      const isFreeformImg = component.positionMode === 'absolute'
      const imgFit = (settings.objectFit as string) || 'cover'
      const imgPos = (settings.objectPosition as string) || 'center center'
      const imgWidth = styles.width || '100%'
      const imgHeight = isFreeformImg ? '100%' : (styles.height || 'auto')

      const imageElement = settings.imageUrl ? (
        <img
          src={settings.imageUrl as string}
          alt={(settings.alt as string) || ''}
          className={isFreeformImg ? 'w-full h-full' : ''}
          style={{
            objectFit: imgFit as any,
            objectPosition: imgPos,
            width: isFreeformImg ? '100%' : imgWidth,
            height: imgHeight,
            maxWidth: '100%',
            display: 'block',
          }}
        />
      ) : (
        <div className="bg-gray-200 flex items-center justify-center p-12">
          <p className="text-gray-500">No image selected</p>
        </div>
      )

      // For freeform images, render directly without container wrappers
      // to allow proper percentage-based sizing from parent
      if (isFreeformImg) {
        return settings.link ? (
          <a href={settings.link as string} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            {imageElement}
          </a>
        ) : (
          imageElement
        )
      }

      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            {settings.link ? (
              <a href={settings.link as string} target="_blank" rel="noopener noreferrer">
                {imageElement}
              </a>
            ) : (
              imageElement
            )}
          </div>
        </div>
      )
    }

    case 'button': {
      const btnAlignment = styles.textAlign || 'left'
      const btnJustifyClass =
        btnAlignment === 'center'
          ? 'justify-center'
          : btnAlignment === 'right'
          ? 'justify-end'
          : 'justify-start'
      const btnVariant = (settings.variant as string) || 'primary'
      const btnSize = (settings.size as string) || 'medium'
      const btnShape = (settings.shape as string) || 'rounded'
      const btnIcon = (settings.icon as string) || ''
      const btnIconPos = (settings.iconPosition as string) || 'right'
      const btnFullWidth = !!settings.fullWidth
      const btnNewTab = !!settings.openInNewTab
      // Freeform buttons fill their container so the editor size is preserved on the live site
      const isFreeformBtn = component.positionMode === 'absolute'
      const btnMinWidth = (settings.minWidth as string) || ''

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
          <div className={`${isFreeformBtn ? 'w-full h-full' : `container mx-auto flex ${btnJustifyClass}`}`}>
            <Link
              href={(settings.link as string) || '#'}
              target={btnNewTab ? '_blank' : undefined}
              rel={btnNewTab ? 'noopener noreferrer' : undefined}
              className={`inline-flex items-center justify-center gap-2 font-bold transition-all no-underline ${variantClasses[btnVariant] || variantClasses.primary} ${sizeClasses[btnSize] || sizeClasses.medium} ${shapeClasses[btnShape] || shapeClasses.rounded} ${btnFullWidth || isFreeformBtn ? 'w-full' : ''}`}
              style={btnMinWidth ? { minWidth: btnMinWidth } : undefined}
            >
              {btnIcon && btnIconPos === 'left' && <span>{btnIcon}</span>}
              {content || 'Button'}
              {btnIcon && btnIconPos === 'right' && <span>{btnIcon}</span>}
            </Link>
          </div>
        </div>
      )
    }

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
              {/* Title */}
              <div style={{ position: 'absolute', left: (settings.titleX as number) || 0, top: (settings.titleY as number) || 0 }}>
                <h1 className="text-4xl md:text-6xl font-bold">
                  {String(settings.title || 'Hero Title')}
                </h1>
              </div>

              {/* Subtitle */}
              {settings.subtitle && (
                <div style={{ position: 'absolute', left: (settings.subtitleX as number) || 0, top: (settings.subtitleY as number) || 60 }}>
                  <p className="text-lg md:text-xl opacity-80">
                    {String(settings.subtitle)}
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
                      {String(settings.buttonText)}
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
                      {String(settings.secondaryButtonText)}
                    </Link>
                  </Button>
                </div>
              )}

              {/* Freeform children elements */}
              {children?.map((child) => {
                if (child.positionMode === 'absolute') {
                  // Use normalized percentage position if available, otherwise fall back to legacy pixels
                  const hasNormalized = child.normalizedPosition?.desktop
                  const pos = hasNormalized ? child.normalizedPosition!.desktop : null
                  const legacyPos = child.position

                  const posStyle: React.CSSProperties = hasNormalized && pos ? {
                    position: 'absolute',
                    left: `${pos.xPercent}%`,
                    top: `${pos.yPercent}%`,
                    width: `${pos.widthPercent}%`,
                    height: `${pos.heightPercent}%`,
                    zIndex: pos.zIndex || 10,
                    transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
                  } : legacyPos ? {
                    position: 'absolute',
                    left: `${legacyPos.x}px`,
                    top: `${legacyPos.y}px`,
                    width: `${legacyPos.width}px`,
                    height: `${legacyPos.height}px`,
                    zIndex: legacyPos.zIndex || 10,
                    transform: legacyPos.rotation ? `rotate(${legacyPos.rotation}deg)` : undefined,
                  } : { position: 'absolute' as const }

                  return (
                    <div key={child.id} style={posStyle}>
                      <ComponentRenderer component={child} />
                    </div>
                  )
                }
                return <ComponentRenderer key={child.id} component={child} />
              })}
            </div>
          ) : (
            <div className="container mx-auto relative z-10">
              <div
                className={`max-w-3xl ${
                  settings.alignment === 'center' ? 'mx-auto text-center' : ''
                }`}
              >
                <h1 className="text-4xl md:text-6xl font-bold mb-6">
                  {String(settings.title || 'Hero Title')}
                </h1>
                {settings.subtitle && (
                  <p className="text-lg md:text-xl opacity-80 mb-8">
                    {String(settings.subtitle)}
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
                        {String(settings.buttonText)}
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
                        {String(settings.secondaryButtonText)}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>

              {/* Freeform children elements for non-freeform hero layout */}
              {children?.map((child) => {
                if (child.positionMode === 'absolute') {
                  // Use normalized percentage position if available, otherwise fall back to legacy pixels
                  const hasNormalized = child.normalizedPosition?.desktop
                  const pos = hasNormalized ? child.normalizedPosition!.desktop : null
                  const legacyPos = child.position

                  const posStyle: React.CSSProperties = hasNormalized && pos ? {
                    position: 'absolute',
                    left: `${pos.xPercent}%`,
                    top: `${pos.yPercent}%`,
                    width: `${pos.widthPercent}%`,
                    height: `${pos.heightPercent}%`,
                    zIndex: pos.zIndex || 10,
                    transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
                  } : legacyPos ? {
                    position: 'absolute',
                    left: `${legacyPos.x}px`,
                    top: `${legacyPos.y}px`,
                    width: `${legacyPos.width}px`,
                    height: `${legacyPos.height}px`,
                    zIndex: legacyPos.zIndex || 10,
                    transform: legacyPos.rotation ? `rotate(${legacyPos.rotation}deg)` : undefined,
                  } : { position: 'absolute' as const }

                  return (
                    <div key={child.id} style={posStyle}>
                      <ComponentRenderer component={child} />
                    </div>
                  )
                }
                return <ComponentRenderer key={child.id} component={child} />
              })}
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
              {children?.slice(0, 2).map((child) => {
                const imgFitTC = (child.settings.objectFit as string) || 'cover'
                const colContent = (
                  <div key={child.id}>
                    {(child.settings.imageUrl as string) && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={child.settings.imageUrl as string}
                          alt={(child.settings.alt as string) || ''}
                          className="rounded-lg"
                          style={{
                            width: child.styles?.width || '100%',
                            height: child.styles?.height || 'auto',
                            objectFit: imgFitTC as any,
                            objectPosition: (child.settings.objectPosition as string) || 'center center',
                            maxWidth: '100%',
                            maxHeight: imgFitTC === 'contain' ? '300px' : undefined,
                          }}
                        />
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: child.content }} />
                  </div>
                )
                if (child.settings.link) {
                  return <Link key={child.id} href={child.settings.link as string} className="block no-underline text-inherit hover:opacity-80 transition-opacity">{colContent}</Link>
                }
                return colContent
              })}
            </div>
          </div>
        </section>
      )

    case 'three-column':
      return (
        <section style={containerStyle}>
          <div className="container mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {children?.map((child) => {
                const imgFit3C = (child.settings.objectFit as string) || 'cover'
                const colContent = (
                  <div
                    key={child.id}
                    style={{ textAlign: (child.styles?.textAlign as any) || 'left' }}
                  >
                    {child.settings.icon && (
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full mb-4 text-2xl">
                        {child.settings.icon}
                      </div>
                    )}
                    {(child.settings.imageUrl as string) && (
                      <div className="mb-3 overflow-hidden rounded-lg">
                        <img
                          src={child.settings.imageUrl as string}
                          alt={(child.settings.alt as string) || ''}
                          className="rounded-lg"
                          style={{
                            width: child.styles?.width || '100%',
                            height: child.styles?.height || 'auto',
                            objectFit: imgFit3C as any,
                            objectPosition: (child.settings.objectPosition as string) || 'center center',
                            maxWidth: '100%',
                            maxHeight: imgFit3C === 'contain' ? '300px' : undefined,
                          }}
                        />
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: child.content }} />
                  </div>
                )
                if (child.settings.link) {
                  return <Link key={child.id} href={child.settings.link as string} className="block no-underline text-inherit hover:opacity-80 transition-opacity">{colContent}</Link>
                }
                return colContent
              })}
            </div>
          </div>
        </section>
      )

    case 'columns': {
      const colCount = (settings.columns as number) || 2
      const colGridClass =
        colCount <= 2 ? 'grid-cols-2' :
        colCount === 3 ? 'grid-cols-2 md:grid-cols-3' :
        colCount === 4 ? 'grid-cols-2 md:grid-cols-4' :
        'grid-cols-2 md:grid-cols-3'
      return (
        <section style={containerStyle}>
          <div className="w-full max-w-screen-xl mx-auto px-4">
            <div className={`grid gap-3 sm:gap-6 ${colGridClass}`}>
              {children?.slice(0, colCount).map((child) => {
                const imgFitCol = (child.settings.objectFit as string) || 'cover'
                // Per-viewport sizes (mobile < 640px, tablet 640-1024px, desktop > 1024px)
                const imgWidth = (child.settings.imageWidth as string) || (child.styles?.width as string) || ''
                const imgHeight = (child.settings.imageHeight as string) || (child.styles?.height as string) || ''
                const imgWidthTablet = (child.settings.imageWidthTablet as string) || imgWidth
                const imgHeightTablet = (child.settings.imageHeightTablet as string) || imgHeight
                const imgWidthMobile = (child.settings.imageWidthMobile as string) || imgWidth
                const imgHeightMobile = (child.settings.imageHeightMobile as string) || imgHeight
                const hasVpSizes = imgWidthMobile || imgHeightMobile || imgWidthTablet || imgHeightTablet
                const colTextAlign = (child.styles?.textAlign as string) || 'left'
                const colFlexAlign = colTextAlign === 'center' ? 'center' : colTextAlign === 'right' ? 'flex-end' : 'flex-start'
                const imgWrapperId = `cimg-${child.id}`
                const colContent = (
                  <div
                    key={child.id}
                    className="min-w-0 overflow-hidden"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: colFlexAlign }}
                  >
                    {child.settings.icon && (
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full mb-4 text-2xl">
                        {child.settings.icon}
                      </div>
                    )}
                    {(child.settings.imageUrl as string) && (
                      <>
                        {hasVpSizes && (
                          <style>{`
                            #${imgWrapperId} { ${imgWidth ? `width:${imgWidth};` : ''} ${imgHeight ? `height:${imgHeight};` : ''} }
                            @media (max-width: 639px) { #${imgWrapperId} { ${imgWidthMobile ? `width:${imgWidthMobile};` : ''} ${imgHeightMobile ? `height:${imgHeightMobile};` : ''} } }
                            @media (min-width: 640px) and (max-width: 1023px) { #${imgWrapperId} { ${imgWidthTablet ? `width:${imgWidthTablet};` : ''} ${imgHeightTablet ? `height:${imgHeightTablet};` : ''} } }
                          `}</style>
                        )}
                        <div
                          id={imgWrapperId}
                          className="mb-3 overflow-hidden rounded-lg"
                          style={hasVpSizes ? { maxWidth: '100%' } : {
                            ...(imgHeight ? { height: imgHeight } : {}),
                            ...(imgWidth ? { width: imgWidth, maxWidth: '100%' } : { alignSelf: 'stretch' }),
                          }}
                        >
                          <img
                            src={child.settings.imageUrl as string}
                            alt={(child.settings.alt as string) || ''}
                            className={`rounded-lg ${imgWidth ? '' : 'w-full'} ${imgHeight ? 'h-full' : 'h-auto'}`}
                            style={{
                              objectFit: imgFitCol as any,
                              objectPosition: (child.settings.objectPosition as string) || 'center center',
                              ...(imgWidth ? { width: '100%' } : {}),
                            }}
                          />
                        </div>
                      </>
                    )}
                    <div style={{ textAlign: colTextAlign as any, alignSelf: 'stretch' }} dangerouslySetInnerHTML={{ __html: child.content }} />
                  </div>
                )
                if (child.settings.link) {
                  return (
                    <Link key={child.id} href={child.settings.link as string} className="block no-underline text-inherit hover:opacity-80 transition-opacity">
                      {colContent}
                    </Link>
                  )
                }
                return colContent
              })}
            </div>
          </div>
        </section>
      )
    }

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
                  — {String(settings.author)}
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

    case 'gallery': {
      const galleryMode = (settings.galleryMode as string) || 'square'
      // gallery-level background and overlay
      const rawBg = (styles && styles.backgroundImage) || ''
      const bgUrl = rawBg ? (String(rawBg).replace(/^url\(("|')?/, '').replace(/("|')?\)$/, '')) : ''
      const overlayOpacity = Number(styles?.backgroundOverlayOpacity ?? 0)

      return (
        <div style={containerStyle}>
          <div className="container mx-auto" style={{ position: 'relative' }}>
            {bgUrl && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url("${bgUrl}")`,
                  backgroundSize: styles?.backgroundSize || 'cover',
                  backgroundPosition: styles?.backgroundPosition || 'center',
                  zIndex: 0,
                }}
              />
            )}
            {overlayOpacity > 0 && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,' + overlayOpacity + ')',
                  zIndex: 1,
                }}
              />
            )}
            <div className={`grid grid-cols-2 md:grid-cols-${settings.columns || 3} gap-4`} style={{ position: 'relative', zIndex: 2 }}>
              {children?.map((image, index) => {
                const imgWidth = (image.styles?.width as string) || ''
                const imgHeight = (image.styles?.height as string) || ''

                const imgStyle: React.CSSProperties =
                  galleryMode === 'fixed'
                    ? { width: imgWidth || '300px', height: imgHeight || 'auto', objectFit: 'contain' as const }
                    : galleryMode === 'responsive'
                    ? { width: imgWidth || '100%', height: imgHeight || 'auto', maxHeight: '100%', objectFit: 'contain' as const, display: 'block' }
                    : { objectFit: 'cover' as const, width: '100%', height: '100%' }

                const containerClass =
                  galleryMode === 'square'
                    ? 'bg-gray-200 overflow-hidden rounded-lg'
                    : galleryMode === 'fixed'
                    ? 'bg-gray-200 overflow-hidden rounded-lg flex justify-center'
                    : 'bg-gray-200 overflow-hidden rounded-lg'

                const containerSizeStyle: React.CSSProperties =
                  galleryMode === 'square' ? { width: '200px', height: '200px' } : {}

                const imageContent = (
                  <>
                    {image.settings.imageUrl ? (
                      <img
                        src={image.settings.imageUrl as string}
                        alt={(image.settings.alt as string) || ''}
                        className="hero-image hover:scale-110 transition-transform"
                        style={imgStyle}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400" style={{ minHeight: '120px' }}>
                        Image {index + 1}
                      </div>
                    )}
                  </>
                )

                return image.settings.link ? (
                  <Link
                    key={image.id}
                    href={image.settings.link as string}
                    className={`${containerClass} block cursor-pointer hover:shadow-xl transition-shadow`}
                    style={containerSizeStyle}
                  >
                    {imageContent}
                  </Link>
                ) : (
                  <div
                    key={image.id}
                    className={containerClass}
                    style={containerSizeStyle}
                  >
                    {imageContent}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    case 'product-grid':
      return (
        <ProductGridLive settings={settings} containerStyle={containerStyle} />
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
                <p className="text-primary font-bold text-lg mb-3">{String(settings.price || '$99.99')}</p>
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
                <p className="text-lg mb-6">{String(settings.description || 'Premium slot car collection')}</p>
                <p className="text-primary text-3xl font-bold mb-6">{String(settings.price || '$149.99')}</p>
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
                  {String(settings.originalPrice)}
                </span>
              )}
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
                    ) : null}
                  </div>
                )
              }
              return <ComponentRenderer key={child.id} component={child} />
            })
          ) : null}
        </div>
      )
    }

    case 'section': {
      const sectionTitle = (settings.sectionTitle as string) || ''
      const sectionSubtitle = (settings.sectionSubtitle as string) || ''
      // Split children into flow and absolute (freeform) children
      const flowChildren = children?.filter(c => c.positionMode !== 'absolute') || []
      const absoluteChildren = children?.filter(c => c.positionMode === 'absolute') || []
      const sectionHasOnlyImages = flowChildren.length > 0 && flowChildren.every(c => c.type === 'image')
      return (
        <section style={{ ...containerStyle, position: 'relative', overflow: 'hidden' }}>
          <div className="container mx-auto" style={{ position: 'relative' }}>
            {sectionTitle && (
              <h2 className="text-3xl font-bold mb-2 text-center">{sectionTitle}</h2>
            )}
            {sectionSubtitle && (
              <p className="text-lg opacity-70 mb-8 text-center max-w-2xl mx-auto">{sectionSubtitle}</p>
            )}
            {flowChildren.length > 0 ? (
              <div className={sectionHasOnlyImages ? 'w-full' : 'space-y-4'}>
                {flowChildren.map((child) => {
                  if (child.type === 'image') {
                    const filledChild = {
                      ...child,
                      settings: {
                        ...child.settings,
                        objectFit: child.settings.objectFit || 'cover',
                        objectPosition: child.settings.objectPosition || 'center center',
                      },
                    }
                    return <ComponentRenderer key={child.id} component={filledChild} />
                  }
                  return <ComponentRenderer key={child.id} component={child} />
                })}
              </div>
            ) : null}
          </div>
          {/* Freeform absolute-positioned children */}
          {absoluteChildren.map((child) => {
            const hasNormalized = child.normalizedPosition?.desktop
            const pos = hasNormalized ? child.normalizedPosition!.desktop : null
            const legacyPos = child.position

            const posStyle: React.CSSProperties = hasNormalized && pos ? {
              position: 'absolute',
              left: `${pos.xPercent}%`,
              top: `${pos.yPercent}%`,
              width: `${pos.widthPercent}%`,
              height: `${pos.heightPercent}%`,
              zIndex: pos.zIndex || 10,
              transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
            } : legacyPos ? {
              position: 'absolute',
              left: `${legacyPos.x}px`,
              top: `${legacyPos.y}px`,
              width: `${legacyPos.width}px`,
              height: `${legacyPos.height}px`,
              zIndex: legacyPos.zIndex || 10,
              transform: legacyPos.rotation ? `rotate(${legacyPos.rotation}deg)` : undefined,
            } : { position: 'absolute' as const }

            return (
              <div key={child.id} style={posStyle}>
                <ComponentRenderer component={child} />
              </div>
            )
          })}
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

    case 'strip': {
      const stripFlowChildren = children?.filter(c => c.positionMode !== 'absolute') || []
      const stripAbsoluteChildren = children?.filter(c => c.positionMode === 'absolute') || []
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
            {stripFlowChildren.length > 0 ? (
              <div className="space-y-4">
                {stripFlowChildren.map((child) => (
                  <ComponentRenderer key={child.id} component={child} />
                ))}
              </div>
            ) : null}
          </div>
          {/* Freeform absolute-positioned children */}
          {stripAbsoluteChildren.map((child) => {
            const hasNormalized = child.normalizedPosition?.desktop
            const pos = hasNormalized ? child.normalizedPosition!.desktop : null
            const legacyPos = child.position

            const posStyle: React.CSSProperties = hasNormalized && pos ? {
              position: 'absolute',
              left: `${pos.xPercent}%`,
              top: `${pos.yPercent}%`,
              width: `${pos.widthPercent}%`,
              height: `${pos.heightPercent}%`,
              zIndex: pos.zIndex || 10,
              transform: pos.rotation ? `rotate(${pos.rotation}deg)` : undefined,
            } : legacyPos ? {
              position: 'absolute',
              left: `${legacyPos.x}px`,
              top: `${legacyPos.y}px`,
              width: `${legacyPos.width}px`,
              height: `${legacyPos.height}px`,
              zIndex: legacyPos.zIndex || 10,
              transform: legacyPos.rotation ? `rotate(${legacyPos.rotation}deg)` : undefined,
            } : { position: 'absolute' as const }

            return (
              <div key={child.id} style={posStyle}>
                <ComponentRenderer component={child} />
              </div>
            )
          })}
        </div>
      )
    }

    case 'banner': {
      const bannerText = content || 'Banner Text'
      const btnText = (settings.buttonText as string) || ''
      const btnLink = (settings.buttonLink as string) || '#'
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
              <Link
                href={btnLink}
                className="inline-block bg-primary text-black font-semibold py-2 px-6 rounded-lg text-sm hover:bg-primary/90"
              >
                {btnText}
              </Link>
            )}
          </div>
        </div>
      )
    }

    case 'booking-form': {
      const bfTitle = (settings.bookingTitle as string) || 'Pre-Order Now'
      const bfSubtitle = (settings.bookingSubtitle as string) || 'Browse available items and place your pre-order'
      const bfAccent = styles.textColor || '#DC2626'
      const bfLayout = (settings.bookingLayout as 'grid' | 'list') || 'grid'
      const bfBrandFilter = settings.showBrandFilter !== false
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <BookingFormWidget
              title={bfTitle}
              subtitle={bfSubtitle}
              accentColor={bfAccent}
              backgroundColor={styles.backgroundColor || '#ffffff'}
              textColor={styles.textColor || '#1F2937'}
              layout={bfLayout}
              showBrandFilter={bfBrandFilter}
            />
          </div>
        </div>
      )
    }

    case 'footer': {
      const ftBg = styles.backgroundColor || '#1f2937'
      const ftText = styles.textColor || '#ffffff'
      const ftBrand = (settings.brandName as string) || 'R66SLOT'
      const ftAccent = (settings.brandAccentColor as string) || '#ef4444'
      const ftTagline = (settings.tagline as string) || ''
      const ftCopyright = (settings.copyright as string) || `© ${new Date().getFullYear()} ${ftBrand}. All rights reserved.`
      const parseLinks = (raw: string) =>
        (raw || '').split('\n').filter(Boolean).map(line => {
          const [label, href] = line.split('|')
          return { label: label?.trim() || '', href: href?.trim() || '#' }
        })
      const columns = [
        { title: (settings.col1Title as string) || '', links: parseLinks(settings.col1Links as string) },
        { title: (settings.col2Title as string) || '', links: parseLinks(settings.col2Links as string) },
        { title: (settings.col3Title as string) || '', links: parseLinks(settings.col3Links as string) },
      ].filter(c => c.title || c.links.length > 0)
      return (
        <footer style={{ backgroundColor: ftBg, color: ftText, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="container mx-auto px-4 py-12">
            <div className={`grid grid-cols-1 md:grid-cols-${1 + columns.length} gap-8`}>
              {/* Brand column */}
              <div>
                <div className="text-2xl font-bold mb-4 font-play">
                  <span style={{ color: ftText }}>{ftBrand.replace(/SLOT|slot/g, '')}</span>
                  <span style={{ color: ftAccent }}>{ftBrand.match(/SLOT|slot/)?.[0] || ''}</span>
                </div>
                {ftTagline && <p style={{ color: ftText, opacity: 0.6 }} className="text-sm">{ftTagline}</p>}
              </div>
              {/* Link columns */}
              {columns.map((col, i) => (
                <div key={i}>
                  <h3 className="font-semibold mb-4 font-play">{col.title}</h3>
                  <nav className="flex flex-col gap-2 text-sm">
                    {col.links.map((link, j) => (
                      <a key={j} href={link.href} style={{ color: ftText, opacity: 0.6 }}
                        className="hover:opacity-100 transition-opacity no-underline">
                        {link.label}
                      </a>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
            {/* Bottom bar */}
            <div className="mt-12 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm" style={{ color: ftText, opacity: 0.6 }}>{ftCopyright}</p>
                <div className="flex gap-6">
                  {settings.showPrivacyLink !== 'false' && (
                    <a href="/privacy" className="text-sm hover:opacity-100 transition-opacity no-underline"
                      style={{ color: ftText, opacity: 0.6 }}>Privacy Policy</a>
                  )}
                  {settings.showTermsLink !== 'false' && (
                    <a href="/terms" className="text-sm hover:opacity-100 transition-opacity no-underline"
                      style={{ color: ftText, opacity: 0.6 }}>Terms of Service</a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </footer>
      )
    }

    default:
      return (
        <div style={containerStyle}>
          <div className="container mx-auto">
            <p className="text-gray-500">Unknown component type: {type}</p>
          </div>
        </div>
      )
  } })()

  if (!rendered) return null

  const withRotation = wrapperStyle ? <div style={wrapperStyle}>{rendered}</div> : rendered

  if (animation !== 'none') {
    return (
      <AnimatedWrapper animation={animation} duration={animDuration} delay={animDelay}>
        {withRotation}
      </AnimatedWrapper>
    )
  }

  return withRotation
}
