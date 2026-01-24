import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

export const metadata = {
  title: 'Shop by Brand | R66SLOT',
  description: 'Browse our complete collection of slot car brands including Carrera, Scalextric, Slot.it, and more.',
}

// Featured brands - in a real app, this would come from Shopify
const brands = [
  { name: 'Carrera', slug: 'carrera', description: 'German precision slot racing' },
  { name: 'Scalextric', slug: 'scalextric', description: 'The original slot car brand since 1957' },
  { name: 'Slot.it', slug: 'slot-it', description: 'Premium Italian craftsmanship' },
  { name: 'NSR', slug: 'nsr', description: 'High-performance racing models' },
  { name: 'Ninco', slug: 'ninco', description: 'Spanish innovation and quality' },
  { name: 'Fly', slug: 'fly', description: 'Detailed classic and modern racers' },
  { name: 'Avant Slot', slug: 'avant-slot', description: 'Spanish manufacturer of quality slot cars' },
  { name: 'SCX', slug: 'scx', description: 'Affordable racing excitement' },
  { name: 'Policar', slug: 'policar', description: 'Italian precision and detail' },
  { name: 'Racer', slug: 'racer', description: 'Sideways Group innovation' },
  { name: 'BRM', slug: 'brm', description: 'Italian excellence in miniature' },
  { name: 'Revell', slug: 'revell', description: 'Classic models and modern designs' },
]

export default function BrandsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Shop by Brand</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Explore our curated collection from the world&apos;s leading slot car manufacturers.
          Each brand brings unique craftsmanship, design, and racing performance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {brands.map((brand) => (
          <Link
            key={brand.slug}
            href={`/brands/${brand.slug}`}
            className="group"
          >
            <Card className="h-full hover:shadow-lg transition-all hover:scale-105 duration-200">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {brand.name}
                </h2>
                <p className="text-sm text-gray-600">{brand.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-16 bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Can&apos;t find your brand?</h2>
        <p className="text-gray-600 mb-6">
          We&apos;re always adding new brands to our collection. Contact us to request a specific manufacturer.
        </p>
        <Link
          href="/contact"
          className="text-primary font-semibold hover:underline"
        >
          Contact Us →
        </Link>
      </div>
    </div>
  )
}
