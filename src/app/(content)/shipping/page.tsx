export const metadata = {
  title: 'Shipping Information | R66SLOT',
  description: 'Learn about our shipping options, delivery times, and international shipping policies.',
}

export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Shipping Information</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">Shipping Options</h2>
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-semibold">Standard Shipping</h3>
                  <p className="text-sm text-gray-600">5-7 business days</p>
                </div>
                <span className="font-semibold">$5.99</span>
              </div>
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h3 className="font-semibold">Express Shipping</h3>
                  <p className="text-sm text-gray-600">2-3 business days</p>
                </div>
                <span className="font-semibold">$12.99</span>
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">Free Shipping</h3>
                  <p className="text-sm text-gray-600">On orders over $100</p>
                </div>
                <span className="font-semibold text-primary">FREE</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Processing Time</h2>
            <p className="text-gray-700 mb-4">
              Orders are typically processed within 1-2 business days. Orders placed on weekends or holidays will be processed on the next business day.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">International Shipping</h2>
            <p className="text-gray-700 mb-4">
              We ship worldwide! International shipping rates and delivery times vary by destination. International customers are responsible for any customs fees, duties, or taxes imposed by their country.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Canada: 7-14 business days</li>
              <li>Europe: 10-21 business days</li>
              <li>Asia/Pacific: 14-28 business days</li>
              <li>Rest of World: 14-35 business days</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Order Tracking</h2>
            <p className="text-gray-700">
              Once your order ships, you&apos;ll receive a tracking number via email. You can track your package through the carrier&apos;s website or your R66SLOT account dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Shipping Restrictions</h2>
            <p className="text-gray-700">
              We currently cannot ship to P.O. Boxes or APO/FPO addresses. Please provide a street address for delivery.
            </p>
          </section>
        </div>

        <div className="mt-12 bg-primary/10 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Questions about shipping?</h3>
          <p className="text-gray-700">
            Contact our customer service team at{' '}
            <a href="mailto:support@r66slot.com" className="text-primary font-semibold hover:underline">
              support@r66slot.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
