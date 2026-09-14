import type { PageComponent } from '@/lib/pages/schema'

export const COMPONENT_LIBRARY: {
  type: PageComponent['type']
  label: string
  icon: string
  defaultProps: Partial<PageComponent>
}[] = [
  {
    type: 'add-to-cart',
    label: 'Add to Cart Button',
    icon: '🛒',
    defaultProps: {
      content: 'Add to Cart',
      styles: {
        backgroundColor: '#FFDD00',
        textColor: '#000000',
        padding: '16px 32px',
        borderRadius: '8px',
        fontSize: '18px',
        fontWeight: 'bold',
        textAlign: 'center',
        border: 'none',
        cursor: 'pointer',
      },
      settings: {
        productId: '',
      },
    },
  },
  {
    type: 'banner',
    label: 'Banner',
    icon: '🏷️',
    defaultProps: {
      content: 'Special Offer — Shop Now!',
      styles: {
        backgroundColor: '#1a1a2e',
        textColor: '#FFFFFF',
        padding: '24px 20px',
        fontSize: '20px',
        fontWeight: '600',
        textAlign: 'center',
        width: '100%',
      },
      settings: {
        buttonText: 'Shop Now',
        buttonLink: '#',
      },
    },
  },
  {
    type: 'box',
    label: 'Box',
    icon: '📦',
    defaultProps: {
      content: '',
      styles: {
        backgroundColor: '#ffffff',
        width: '100%',
        height: '300px',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
      },
      settings: {},
      children: [],
    },
  },
  {
    type: 'button',
    label: 'Button',
    icon: 'B',
    defaultProps: {
      content: 'Click Me',
      styles: {
        backgroundColor: '#FFDD00',
        textColor: '#000000',
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: '600',
        textAlign: 'center',
      },
      settings: {
        link: '#',
      },
    },
  },
  {
    type: 'card',
    label: 'Card',
    icon: '🗃️',
    defaultProps: {
      content: 'Card content goes here',
      styles: {
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
      },
      settings: {},
    },
  },
  {
    type: 'divider',
    label: 'Divider',
    icon: '—',
    defaultProps: {
      content: '',
      styles: {
        height: '1px',
        backgroundColor: '#e5e7eb',
        margin: '20px 0',
        border: 'none',
      },
      settings: {},
    },
  },
  {
    type: 'featured-product',
    label: 'Featured Product',
    icon: '⭐',
    defaultProps: {
      content: 'Premium Slot Car Collection',
      styles: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '40px',
        padding: '60px 40px',
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
      },
      settings: {
        imageUrl: 'https://via.placeholder.com/600x600',
        price: '$149.99',
        description: 'Our finest collection of premium slot cars',
      },
    },
  },
  {
    type: 'latest-arrivals',
    label: 'Latest Arrivals',
    icon: '🆕',
    defaultProps: {
      content: 'Latest Arrivals',
      styles: {
        paddingTop: '48px',
        paddingBottom: '48px',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
      settings: {
        daysVisible: 30,
        cardSize: 'small',
        autoSpeed: 0,
        bgColor: '#111111',
        cardBgColor: '#1a1a1a',
        titleColor: '#ffffff',
        priceColor: '#ef4444',
        descColor: '#9ca3af',
        titleSize: '13',
        priceSize: '16',
        headerColor: '#ffffff',
        headerSize: '28',
        accentColor: '#C41230',
      },
    },
  },
  {
    // Same slider as Latest Arrivals, fed by the Landing Soon toggle on the product page.
    // daysVisible 0 = never expire — incoming stock stays up until the toggle is switched
    // off (usually once the shipment lands and it moves to Latest Arrivals).
    type: 'landing-soon',
    label: 'Landing Soon',
    icon: '🛬',
    defaultProps: {
      content: 'Landing Soon',
      styles: {
        paddingTop: '48px',
        paddingBottom: '48px',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
      settings: {
        daysVisible: 0,
        cardSize: 'small',
        autoSpeed: 0,
        bgColor: '#111111',
        cardBgColor: '#1a1a1a',
        titleColor: '#ffffff',
        priceColor: '#ef4444',
        descColor: '#9ca3af',
        titleSize: '13',
        priceSize: '16',
        headerColor: '#ffffff',
        headerSize: '28',
        accentColor: '#C41230',
      },
    },
  },
  {
    // Same slider as Latest Arrivals, fed by the Specials toggle on the product page.
    // daysVisible 0 = never expire — a special stays up until the toggle is switched off.
    type: 'specials',
    label: 'Specials',
    icon: '🏷️',
    defaultProps: {
      content: 'Specials',
      styles: {
        paddingTop: '48px',
        paddingBottom: '48px',
        paddingLeft: '16px',
        paddingRight: '16px',
      },
      settings: {
        daysVisible: 0,
        cardSize: 'small',
        autoSpeed: 0,
        bgColor: '#111111',
        cardBgColor: '#1a1a1a',
        titleColor: '#ffffff',
        priceColor: '#ef4444',
        descColor: '#9ca3af',
        titleSize: '13',
        priceSize: '16',
        headerColor: '#ffffff',
        headerSize: '28',
        accentColor: '#C41230',
        discountColor: '#f59e0b',
        discountedPriceColor: '#22c55e',
      },
    },
  },
  {
    type: 'gallery',
    label: 'Gallery Grid',
    icon: '📷',
    defaultProps: {
      content: '',
      styles: {
        display: 'grid',
        gap: '16px',
        padding: '20px',
      },
      positionMode: 'flow',
      settings: {
        columns: 3,
      },
      children: [
        {
          id: 'img-1',
          type: 'image',
          content: '',
          styles: { width: '100%', height: 'auto', borderRadius: '8px' },
          settings: { imageUrl: 'https://via.placeholder.com/400x300' },
        },
        {
          id: 'img-2',
          type: 'image',
          content: '',
          styles: { width: '100%', height: 'auto', borderRadius: '8px' },
          settings: { imageUrl: 'https://via.placeholder.com/400x300' },
        },
        {
          id: 'img-3',
          type: 'image',
          content: '',
          styles: { width: '100%', height: 'auto', borderRadius: '8px' },
          settings: { imageUrl: 'https://via.placeholder.com/400x300' },
        },
      ],
    },
  },
  {
    type: 'heading',
    label: 'Heading',
    icon: 'H',
    defaultProps: {
      content: 'Heading Text',
      styles: {
        fontSize: '32px',
        fontWeight: 'bold',
        textAlign: 'left',
        padding: '20px',
        margin: '0',
      },
      settings: {},
    },
  },
  {
    type: 'hero',
    label: 'Hero Banner',
    icon: '🎯',
    defaultProps: {
      content: 'Hero Title',
      styles: {
        backgroundColor: '#000000',
        textColor: '#FFFFFF',
        padding: '80px 20px',
        fontSize: '48px',
        fontWeight: 'bold',
        textAlign: 'center',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      settings: {},
    },
  },
  {
    type: 'icon-text',
    label: 'Icon + Text',
    icon: '✨',
    defaultProps: {
      content: 'Feature description text',
      styles: {
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        padding: '16px',
      },
      settings: {
        icon: '⭐',
      },
    },
  },
  {
    type: 'image',
    label: 'Image',
    icon: '🖼️',
    defaultProps: {
      content: '',
      styles: {
        width: '100%',
        height: 'auto',
      },
      settings: {
        imageUrl: 'https://via.placeholder.com/600x400',
        alt: 'Image',
      },
    },
  },
  {
    type: 'price-display',
    label: 'Price Display',
    icon: '💰',
    defaultProps: {
      content: '$99.99',
      styles: {
        fontSize: '32px',
        fontWeight: 'bold',
        textColor: '#FFDD00',
        padding: '10px',
      },
      settings: {
        showDiscount: false,
        originalPrice: '',
      },
    },
  },
  {
    type: 'product-card',
    label: 'Product Card',
    icon: '🏷️',
    defaultProps: {
      content: 'Product Name',
      styles: {
        backgroundColor: '#ffffff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        maxWidth: '300px',
      },
      settings: {
        imageUrl: 'https://via.placeholder.com/300x300',
        price: '$29.99',
        showAddToCart: true,
      },
    },
  },
  {
    type: 'product-carousel',
    label: 'Product Carousel',
    icon: '🎠',
    defaultProps: {
      content: '',
      styles: {
        padding: '40px 20px',
        backgroundColor: '#f9fafb',
      },
      settings: {
        productCount: 6,
        autoplay: true,
      },
    },
  },
  {
    type: 'product-grid',
    label: 'Product Grid',
    icon: '🛍️',
    defaultProps: {
      content: '',
      styles: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '24px',
        padding: '40px 20px',
      },
      settings: {
        productCount: 8,
        showPrice: true,
        showAddToCart: true,
      },
    },
  },
  {
    type: 'quote',
    label: 'Quote',
    icon: '💬',
    defaultProps: {
      content: 'This is an inspiring quote or testimonial.',
      styles: {
        fontSize: '20px',
        fontWeight: '500',
        fontStyle: 'italic',
        padding: '24px',
        borderLeft: '4px solid #FFDD00',
        backgroundColor: '#f9fafb',
        margin: '20px 0',
      },
      settings: {},
    },
  },
  {
    type: 'section',
    label: 'Section',
    icon: '▢',
    defaultProps: {
      content: '',
      styles: {
        backgroundColor: '#ffffff',
        padding: '40px 20px',
      },
      settings: {},
      children: [],
    },
  },
  {
    type: 'spacer',
    label: 'Spacer',
    icon: '⎯',
    defaultProps: {
      content: '',
      styles: {
        height: '40px',
      },
      settings: {},
    },
  },
  {
    type: 'strip',
    label: 'Strip',
    icon: '▬',
    defaultProps: {
      content: '',
      styles: {
        backgroundColor: '#f3f4f6',
        padding: '60px 20px',
        width: '100%',
        minHeight: '200px',
      },
      settings: {},
      children: [],
    },
  },
  {
    type: 'text',
    label: 'Text',
    icon: 'T',
    defaultProps: {
      content: 'Your text here...',
      styles: {
        fontSize: '16px',
        padding: '10px',
        textAlign: 'left',
      },
      settings: {},
    },
  },
  {
    type: 'columns',
    label: 'Columns',
    icon: '▦',
    defaultProps: {
      content: '',
      styles: {
        display: 'grid',
        gap: '20px',
        padding: '20px',
      },
      settings: {
        columns: 2,
      },
      children: [
        {
          id: 'col-1',
          type: 'text',
          content: 'Column 1',
          styles: { padding: '10px' },
          settings: {},
        },
        {
          id: 'col-2',
          type: 'text',
          content: 'Column 2',
          styles: { padding: '10px' },
          settings: {},
        },
      ],
    },
  },
  {
    type: 'video',
    label: 'Video',
    icon: '🎥',
    defaultProps: {
      content: '',
      styles: {
        width: '100%',
        height: 'auto',
        borderRadius: '8px',
      },
      settings: {
        videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      },
    },
  },
  {
    type: 'footer',
    label: 'Footer',
    icon: '🔻',
    defaultProps: {
      content: '',
      styles: {
        backgroundColor: '#1f2937',
        textColor: '#ffffff',
      },
      settings: {
        brandName: 'R66SLOT',
        brandAccentColor: '#ef4444',
        tagline: 'Your premium destination for slot car racing.',
        col1Title: 'Shop',
        col1Links: 'All Products|/products\nBrands|/brands\nNew Arrivals|/collections/new-arrivals\nPre-Orders|/pre-orders',
        col2Title: 'Information',
        col2Links: 'About Us|/about\nContact|/contact\nShipping Info|/shipping\nReturns|/returns',
        col3Title: 'Account',
        col3Links: 'My Account|/account\nOrder History|/account/orders\nLogin|/account/login\nRegister|/account/register',
        copyright: `© ${new Date().getFullYear()} R66SLOT. All rights reserved.`,
        showPrivacyLink: 'true',
        showTermsLink: 'true',
      },
    },
  },
]
