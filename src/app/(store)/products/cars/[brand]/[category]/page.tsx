import Link from 'next/link'
import { notFound } from 'next/navigation'

const BRANDS = {
  nsr: {
    name: 'NSR',
    color: 'red',
    gradient: 'from-red-600 to-red-700',
    buttonColor: 'bg-red-600 hover:bg-red-700'
  },
  revo: {
    name: 'Revo',
    color: 'blue',
    gradient: 'from-blue-600 to-blue-700',
    buttonColor: 'bg-blue-600 hover:bg-blue-700'
  },
  pioneer: {
    name: 'Pioneer',
    color: 'green',
    gradient: 'from-green-600 to-green-700',
    buttonColor: 'bg-green-600 hover:bg-green-700'
  },
  sideways: {
    name: 'Sideways',
    color: 'orange',
    gradient: 'from-orange-600 to-orange-700',
    buttonColor: 'bg-orange-600 hover:bg-orange-700'
  }
}

const CAR_CATEGORIES = [
  { id: 'gt3', name: 'GT3', icon: '🏁' },
  { id: 'formula', name: 'Formula', icon: '🏎️' },
  { id: 'endurance', name: 'Endurance', icon: '⏱️' },
  { id: 'rally', name: 'Rally', icon: '🚗' },
  { id: 'classic', name: 'Classic', icon: '🏛️' },
  { id: 'prototype', name: 'Prototype', icon: '🔬' },
  { id: 'gt', name: 'GT Cars', icon: '🎯' },
  { id: 'touring', name: 'Touring Cars', icon: '🚙' },
  { id: 'limited', name: 'Limited Edition', icon: '⭐' },
  { id: 'special', name: 'Special Edition', icon: '💎' },
]

// Mock products - replace with real data from Shopify
const MOCK_PRODUCTS = Array.from({ length: 24 }, (_, i) => ({
  id: `car-${i + 1}`,
  title: `Slot Car ${i + 1}`,
  price: (Math.random() * 150 + 50).toFixed(2),
  sku: `SKU-${2000 + i}`,
  image: '/placeholder-car.jpg',
  category: CAR_CATEGORIES[Math.floor(Math.random() * CAR_CATEGORIES.length)].id
}))

export default async function BrandCarsCategoryPage({ params }: { params: Promise<{ brand: string; category: string }> }) {
  const { brand: brandKey, category: categoryKey } = await params
  const brand = BRANDS[brandKey as keyof typeof BRANDS]
  const category = CAR_CATEGORIES.find(c => c.id === categoryKey)

  if (!brand || !category) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-3">
          <nav className="text-sm text-gray-600">
            <Link href="/" className="hover:text-gray-900">Home</Link>
            <span className="mx-2">›</span>
            <Link href={`/brands/${brandKey}`} className="hover:text-gray-900">{brand.name}</Link>
            <span className="mx-2">›</span>
            <Link href={`/products/cars/${brandKey}`} className="hover:text-gray-900">{brand.name} Slot Cars</Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900 font-medium">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Collection Header */}
      <div className={`bg-gradient-to-r ${brand.gradient} text-white py-12 border-b`}>
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{brand.name} {category.name}</h1>
          <p className="text-lg opacity-90">Premium racing models and collectibles</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar - Categories */}
          <aside className="lg:col-span-3">
            <div className="bg-gray-50 rounded-lg p-4 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Car Categories</h3>
              <ul className="space-y-2">
                {CAR_CATEGORIES.map((cat) => (
                  <li key={cat.id}>
                    <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-200 transition-colors flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span className="text-sm">{cat.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Product Grid */}
          <main className="lg:col-span-9">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">{MOCK_PRODUCTS.length} products</p>
              <select className="border border-gray-300 rounded px-3 py-2 text-sm">
                <option>Sort: Featured</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Name: A-Z</option>
                <option>Name: Z-A</option>
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
              {MOCK_PRODUCTS.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className="group bg-white border border-gray-200 rounded overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                    <span className="text-4xl opacity-50">🏎️</span>
                  </div>

                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 mb-1 group-hover:text-primary transition-colors line-clamp-2">
                      {product.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{product.sku}</p>
                    <p className="text-lg font-bold text-gray-900">${product.price}</p>
                    <button className={`w-full mt-3 ${brand.buttonColor} text-white font-semibold py-2 px-4 rounded text-sm transition-colors`}>
                      Add to Cart
                    </button>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12 flex justify-center gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-4 py-2 bg-gray-900 text-white rounded">1</button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">2</button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">3</button>
              <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                Next
              </button>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
