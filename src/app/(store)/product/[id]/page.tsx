import { Metadata } from 'next'
import ProductDetailClient from './ProductDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.r66slot.co.za'
    const res = await fetch(`${siteUrl}/api/admin/products/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return { title: 'Product | R66SLOT' }
    const product = await res.json()

    const title = product.seo?.metaTitle || `${product.title} | R66SLOT`
    const description = product.seo?.metaDescription || product.description || ''
    const ogImage = product.seo?.ogImage || product.imageUrl || ''
    const keywords = product.seo?.metaKeywords || ''

    return {
      title,
      description,
      keywords: keywords || undefined,
      openGraph: {
        title: product.seo?.metaTitle || product.title,
        description,
        images: ogImage ? [{ url: ogImage, width: 1200, height: 630, alt: product.title }] : [],
        type: 'website',
        url: `${siteUrl}/product/${id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.seo?.metaTitle || product.title,
        description,
        images: ogImage ? [ogImage] : [],
      },
    }
  } catch {
    return { title: 'Product | R66SLOT' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  return <ProductDetailClient id={id} />
}
