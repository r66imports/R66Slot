import { Metadata } from 'next'
import { blobRead } from '@/lib/blob-storage'
import { priceCard } from '@/lib/preorder-dashboard-price'

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  try {
    const { id } = await params
    const items = await blobRead<any[]>('data/preorder-dashboard.json', [])
    const item = items.find((i: any) => i.id === id)
    if (!item || !item.published) return {}

    // Rule 63 — the share card must quote the same figure as the page itself,
    // so the estimate is derived here too rather than read from the blob.
    const { estimatedRetailPrice } = await priceCard(item)
    const price = parseFloat(item.retailPrice || estimatedRetailPrice || '0')
    const title = item.seoTitle || item.description || 'Pre-Order Item'
    const description = item.seoDescription ||
      `Pre-order ${item.description}${item.eta ? ` — ETA ${item.eta}` : ''}${price > 0 ? `. R${price.toFixed(2)}` : ''}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: (item.seoImageUrl || item.imageUrl) ? [{ url: item.seoImageUrl || item.imageUrl }] : undefined,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: (item.seoImageUrl || item.imageUrl) ? [item.seoImageUrl || item.imageUrl] : undefined,
      },
    }
  } catch {
    return {}
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
