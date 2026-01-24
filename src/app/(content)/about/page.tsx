import Link from 'next/link'

export const metadata = {
  title: 'About Us | R66SLOT',
  description: 'Learn about R66SLOT - your premier destination for premium slot cars and collectibles.',
}

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">About R66SLOT</h1>

        <div className="prose prose-lg max-w-none space-y-6">
          <p className="text-xl text-gray-700 leading-relaxed">
            Welcome to R66SLOT, your premier destination for high-quality slot cars and collectibles.
          </p>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Our Story</h2>
            <p className="text-gray-700">
              Founded by passionate collectors and racing enthusiasts, R66SLOT was created to provide fellow hobbyists with access to the finest slot cars from around the world. We understand the thrill of racing and the joy of collecting, and we&apos;re dedicated to bringing you the best products from the world&apos;s leading manufacturers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">What We Offer</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Curated selection of premium slot cars from top brands</li>
              <li>Limited edition and hard-to-find collectibles</li>
              <li>Expert knowledge and personalized customer service</li>
              <li>Fast, secure shipping worldwide</li>
              <li>Pre-order access to upcoming releases</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Our Promise</h2>
            <p className="text-gray-700">
              Every product we offer is carefully selected for quality, authenticity, and racing performance. We work directly with manufacturers and authorized distributors to ensure you receive genuine products backed by manufacturer warranties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mt-8 mb-4">Join Our Community</h2>
            <p className="text-gray-700">
              Whether you&apos;re a seasoned collector or just starting your slot car journey, we&apos;re here to help. Follow us on social media, sign up for our newsletter, and join thousands of enthusiasts who trust R66SLOT for their hobby needs.
            </p>
          </section>
        </div>

        <div className="mt-12 bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
          <p className="text-gray-700 mb-4">
            Have questions? We&apos;re here to help!
          </p>
          <Link
            href="/contact"
            className="inline-block bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
