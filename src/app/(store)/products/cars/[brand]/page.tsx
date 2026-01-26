import Link from 'next/link'
import { notFound } from 'next/navigation'

const BRANDS = {
  nsr: {
    name: 'NSR',
    color: 'red',
    gradient: 'from-red-600 to-red-700',
    cardHover: 'group-hover:border-red-600'
  },
  revo: {
    name: 'Revo',
    color: 'blue',
    gradient: 'from-blue-600 to-blue-700',
    cardHover: 'group-hover:border-blue-600'
  },
  pioneer: {
    name: 'Pioneer',
    color: 'green',
    gradient: 'from-green-600 to-green-700',
    cardHover: 'group-hover:border-green-600'
  },
  sideways: {
    name: 'Sideways',
    color: 'orange',
    gradient: 'from-orange-600 to-orange-700',
    cardHover: 'group-hover:border-orange-600'
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

export default async function BrandCarsPage({ params }: { params: Promise<{ brand: string }> }) {
  const { brand: brandKey } = await params
  const brand = BRANDS[brandKey as keyof typeof BRANDS]

  if (!brand) {
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
            <span className="text-gray-900 font-medium">{brand.name} Slot Cars</span>
          </nav>
        </div>
      </div>

      {/* Collection Header */}
      <div className={`bg-gradient-to-r ${brand.gradient} text-white py-12 border-b`}>
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{brand.name} Slot Cars</h1>
          <p className="text-lg opacity-90">Browse by category</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {CAR_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/products/cars/${brandKey}/${category.id}`}
              className="group"
            >
              <div className={`bg-white border-2 border-gray-200 rounded-lg overflow-hidden hover:shadow-xl transition-all ${brand.cardHover}`}>
                {/* Category Image */}
                <div className="aspect-square bg-gray-100 flex items-center justify-center p-8">
                  <span className="text-6xl opacity-70">{category.icon}</span>
                </div>

                {/* Category Name */}
                <div className="p-4 text-center bg-white border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {brand.name} {category.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Back to Brand */}
        <div className="text-center mt-12">
          <Link href={`/brands/${brandKey}`} className="inline-block text-gray-600 hover:text-gray-900 font-medium">
            ← Back to {brand.name}
          </Link>
        </div>
      </div>
    </div>
  )
}
