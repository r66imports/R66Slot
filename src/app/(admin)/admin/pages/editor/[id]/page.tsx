'use client'

import { use } from 'react'
import { TrueWixEditor } from '@/components/page-editor/true-wix-editor'
import { PageEditorProvider } from '@/contexts/PageEditorContext'
import type { PageComponent } from '@/lib/pages/schema'

const COMPONENT_DEFAULTS: Array<{
  type: PageComponent['type']
  defaultProps: Partial<PageComponent>
}> = [
  {
    type: 'hero',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#1F2937', textColor: '#FFFFFF', paddingTop: '80px', paddingBottom: '80px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { title: 'Your Headline Here', subtitle: 'Add a compelling subtitle to engage your visitors.', buttonText: 'Get Started', buttonLink: '#', alignment: 'center', imageUrl: '' },
    },
  },
  {
    type: 'text',
    defaultProps: {
      content: '<p>Click to edit this text block. Add your content here.</p>',
      styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: {},
    },
  },
  {
    type: 'image',
    defaultProps: {
      content: '',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { imageUrl: '', alt: 'Image description' },
    },
  },
  {
    type: 'button',
    defaultProps: {
      content: 'Click Me',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px', textAlign: 'center' },
      settings: { link: '#', variant: 'primary', size: 'large' },
    },
  },
  {
    type: 'gallery',
    defaultProps: {
      content: '',
      styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { columns: 3 },
      children: [],
    },
  },
  {
    type: 'columns',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#F9FAFB', paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { columns: 2 },
      children: [
        { id: `child-1`, type: 'text', content: '<h3>Column 1</h3><p>Edit this text</p>', styles: {}, settings: {} },
        { id: `child-2`, type: 'text', content: '<h3>Column 2</h3><p>Edit this text</p>', styles: {}, settings: {} },
      ],
    },
  },
  {
    type: 'heading',
    defaultProps: {
      content: 'Your Heading Here',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { level: 'h2' },
    },
  },
  {
    type: 'spacer',
    defaultProps: {
      content: '',
      styles: { paddingTop: '24px', paddingBottom: '24px' },
      settings: { height: '48px' },
    },
  },
  {
    type: 'strip',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#1F2937', paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { fullWidth: true },
      children: [],
    },
  },
  {
    type: 'banner',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#4F46E5', textColor: '#FFFFFF', paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { title: 'Banner Title', subtitle: 'Banner subtitle text', buttonText: 'Learn More', buttonLink: '#' },
    },
  },
  {
    type: 'box',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#FFFFFF', paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
      settings: { imageUrl: '', imageFit: 'cover' },
      children: [],
    },
  },
  {
    type: 'card',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#FFFFFF', paddingTop: '0', paddingBottom: '16px', paddingLeft: '0', paddingRight: '0', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
      settings: { title: 'Card Title', description: 'Card description text goes here.', imageUrl: '', buttonText: '', buttonLink: '' },
    },
  },
  {
    type: 'icon-text',
    defaultProps: {
      content: '<p>Description text here</p>',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px', textAlign: 'center' },
      settings: { icon: '🧩' },
    },
  },
  {
    type: 'product-card',
    defaultProps: {
      content: 'Product Name',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { imageUrl: '', price: '$29.99', showAddToCart: true },
    },
  },
  {
    type: 'product-carousel',
    defaultProps: {
      content: '',
      styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { productCount: 6, showPrice: true },
    },
  },
  {
    type: 'add-to-cart',
    defaultProps: {
      content: 'Add to Cart',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { variant: 'primary', size: 'large' },
    },
  },
  {
    type: 'price-display',
    defaultProps: {
      content: '',
      styles: { paddingTop: '8px', paddingBottom: '8px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { price: '$49.99', salePrice: '', currency: 'ZAR' },
    },
  },
  {
    type: 'video',
    defaultProps: {
      content: '',
      styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { videoUrl: '', title: 'Video' },
    },
  },
  {
    type: 'divider',
    defaultProps: {
      content: '',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { thickness: '1px', style: 'solid', color: '#e5e7eb' },
    },
  },
  {
    type: 'product-grid',
    defaultProps: {
      content: '',
      styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { productCount: 8, showPrice: true, showAddToCart: true },
    },
  },
  {
    type: 'featured-product',
    defaultProps: {
      content: 'Featured Product',
      styles: { backgroundColor: '#1F2937', textColor: '#FFFFFF', paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { imageUrl: '', price: '$149.99', description: 'Premium slot car collection' },
    },
  },
  {
    type: 'quote',
    defaultProps: {
      content: 'Your quote text here.',
      styles: { paddingTop: '32px', paddingBottom: '32px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { author: 'Author Name' },
    },
  },
  {
    type: 'section',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#F9FAFB', paddingTop: '64px', paddingBottom: '64px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { sectionTitle: 'Section Title', sectionSubtitle: '', sectionLayout: 'stacked' },
      children: [],
    },
  },
  {
    type: 'content-block',
    defaultProps: {
      content: '<h3>Content Block</h3><p>Add your content here. Content blocks are versatile pieces that combine text, images, and actions.</p>',
      styles: { backgroundColor: '#FFFFFF', paddingTop: '32px', paddingBottom: '32px', paddingLeft: '24px', paddingRight: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
      settings: { imageUrl: '', imagePosition: 'top', buttonText: '', buttonLink: '' },
    },
  },
  {
    type: 'ui-component',
    defaultProps: {
      content: '',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { componentType: 'card', title: 'Card Title', description: 'Card description text', icon: '🧩', actionText: '', actionLink: '' },
    },
  },
  {
    type: 'slot',
    defaultProps: {
      content: '',
      styles: { paddingTop: '24px', paddingBottom: '24px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { slotLabel: 'Drop Zone', slotMinHeight: '120' },
      children: [],
    },
  },
  {
    type: 'widget',
    defaultProps: {
      content: '',
      styles: { paddingTop: '24px', paddingBottom: '24px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { widgetType: 'search', placeholder: 'Search...', title: 'Widget' },
    },
  },
  {
    type: 'media',
    defaultProps: {
      content: '',
      styles: { paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' },
      settings: { mediaType: 'image', imageUrl: '', videoUrl: '', alt: '', caption: '', aspectRatio: '16/9' },
    },
  },
]

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)

  return (
    <PageEditorProvider componentLibrary={COMPONENT_DEFAULTS}>
      <TrueWixEditor pageId={resolvedParams.id} />
    </PageEditorProvider>
  )
}
