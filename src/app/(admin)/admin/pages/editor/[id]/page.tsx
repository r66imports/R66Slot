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
    type: 'three-column',
    defaultProps: {
      content: '',
      styles: { backgroundColor: '#F9FAFB', paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px', textAlign: 'center' },
      settings: { columns: 3 },
      children: [
        { id: `child-1`, type: 'icon-text', content: '<h3>Column 1</h3><p>Edit this text</p>', styles: { textAlign: 'center' }, settings: { icon: '📦' } },
        { id: `child-2`, type: 'icon-text', content: '<h3>Column 2</h3><p>Edit this text</p>', styles: { textAlign: 'center' }, settings: { icon: '🔒' } },
        { id: `child-3`, type: 'icon-text', content: '<h3>Column 3</h3><p>Edit this text</p>', styles: { textAlign: 'center' }, settings: { icon: '🔄' } },
      ],
    },
  },
  {
    type: 'two-column',
    defaultProps: {
      content: '',
      styles: { paddingTop: '48px', paddingBottom: '48px', paddingLeft: '16px', paddingRight: '16px' },
      settings: {},
      children: [
        { id: `child-1`, type: 'text', content: '<h3>Left Column</h3><p>Content here</p>', styles: {}, settings: {} },
        { id: `child-2`, type: 'text', content: '<h3>Right Column</h3><p>Content here</p>', styles: {}, settings: {} },
      ],
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
