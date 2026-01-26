import Link from 'next/link'

export default function PioneerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">Pioneer Slot Cars</h1>
          <p className="text-xl text-green-100">Leading the Way in Slot Racing</p>
        </div>
      </div>

      {/* Category Grid */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Pioneer Cars */}
          <Link href="/products/cars/pioneer" className="group">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
              <div className="aspect-square bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-8xl mb-4">🏎️</div>
                  <h2 className="text-4xl font-bold text-white">PIONEER</h2>
                  <p className="text-2xl text-green-100 mt-2">Slot Cars</p>
                </div>
              </div>
              <div className="p-6 text-center bg-white">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pioneer Slot Cars</h3>
                <p className="text-gray-600 mb-4">Explore our complete range of Pioneer racing models</p>
                <span className="inline-block bg-green-600 text-white font-semibold px-6 py-3 rounded-lg group-hover:bg-green-700 transition-colors">
                  View Cars →
                </span>
              </div>
            </div>
          </Link>

          {/* Pioneer Parts */}
          <Link href="/products/parts/pioneer" className="group">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-2">
              <div className="aspect-square bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-8xl mb-4">⚙️</div>
                  <h2 className="text-4xl font-bold text-white">PIONEER</h2>
                  <p className="text-2xl text-gray-300 mt-2">Parts</p>
                </div>
              </div>
              <div className="p-6 text-center bg-white">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Pioneer Parts</h3>
                <p className="text-gray-600 mb-4">Quality replacement parts and upgrades</p>
                <span className="inline-block bg-gray-800 text-white font-semibold px-6 py-3 rounded-lg group-hover:bg-gray-900 transition-colors">
                  View Parts →
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link href="/" className="inline-block text-gray-600 hover:text-gray-900 font-medium">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
