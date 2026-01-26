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

const PART_CATEGORIES = [
  { id: 'guides', name: 'Guides', icon: '🔧', image: '/parts/guides.jpg' },
  { id: 'braid', name: 'Braid', icon: '🧵', image: '/parts/braid.jpg' },
  { id: 'lead-wire', name: 'Lead Wire', icon: '⚡', image: '/parts/lead-wire.jpg' },
  { id: 'magnets', name: 'Magnets', icon: '🧲', image: '/parts/magnets.jpg' },
  { id: 'weights', name: 'Weights', icon: '⚖️', image: '/parts/weights.jpg' },
  { id: 'screws', name: 'Screws', icon: '🔩', image: '/parts/screws.jpg' },
  { id: 'suspension', name: 'Suspension Parts', icon: '🛞', image: '/parts/suspension.jpg' },
  { id: 'tires', name: 'Tires', icon: '⭕', image: '/parts/tires.jpg' },
  { id: 'wheels', name: 'Wheels', icon: '🎯', image: '/parts/wheels.jpg' },
  { id: 'wheels-with-tires', name: 'Wheels with Tires', icon: '🎡', image: '/parts/wheels-tires.jpg' },
  { id: 'wheel-inserts', name: 'Wheel Inserts', icon: '⚙️', image: '/parts/wheel-inserts.jpg' },
  { id: 'inline-gears', name: 'Inline Gears', icon: '⚙️', image: '/parts/inline-gears.jpg' },
  { id: 'sidewinder-gears', name: 'Sidewinder Gears', icon: '⚙️', image: '/parts/sidewinder-gears.jpg' },
  { id: 'anglewinder-gears', name: 'Anglewinder Gears', icon: '⚙️', image: '/parts/anglewinder-gears.jpg' },
  { id: 'motors', name: 'Motors', icon: '🔌', image: '/parts/motors.jpg' },
]

export default async function BrandPartsPage({ params }: { params: Promise<{ brand: string }> }) {
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
            <span className="text-gray-900 font-medium">{brand.name} Parts</span>
          </nav>
        </div>
      </div>

      {/* Collection Header */}
      <div className={`bg-gradient-to-r ${brand.gradient} text-white py-12 border-b`}>
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">{brand.name} Parts</h1>
          <p className="text-lg opacity-90">Browse by category</p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PART_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/products/parts/${brandKey}/${category.id}`}
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
