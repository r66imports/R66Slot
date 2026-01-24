export const metadata = {
  title: 'Returns & Exchanges | R66SLOT',
  description: 'Learn about our hassle-free return and exchange policy.',
}

export default function ReturnsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Returns & Exchanges</h1>

        <div className="space-y-8">
          <section className="bg-primary/10 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">30-Day Return Policy</h2>
            <p className="text-gray-700">
              Not satisfied with your purchase? We offer a hassle-free 30-day return policy on most items. Items must be unused, in original packaging, and in resellable condition.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">How to Return an Item</h2>
            <ol className="list-decimal pl-6 space-y-3 text-gray-700">
              <li>
                <strong>Contact us:</strong> Email support@r66slot.com with your order number and reason for return
              </li>
              <li>
                <strong>Receive authorization:</strong> We&apos;ll send you a return authorization number (RMA) and return shipping instructions
              </li>
              <li>
                <strong>Package your return:</strong> Include the RMA number in the package with all original materials
              </li>
              <li>
                <strong>Ship it back:</strong> Use the prepaid return label (if provided) or your preferred carrier
              </li>
              <li>
                <strong>Receive your refund:</strong> Once we receive and inspect your return, we&apos;ll process your refund within 5-7 business days
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Exchanges</h2>
            <p className="text-gray-700 mb-4">
              If you receive a defective or damaged item, we&apos;ll gladly exchange it for a new one at no additional cost. Contact us within 7 days of delivery for exchanges due to defects or damage.
            </p>
            <p className="text-gray-700">
              For size or model exchanges, please return the original item and place a new order for the desired product.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Return Shipping Costs</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Defective/Damaged items:</strong> We cover return shipping
              </li>
              <li>
                <strong>Changed your mind:</strong> Customer pays return shipping (unless order qualifies for free returns over $100)
              </li>
              <li>
                <strong>Wrong item sent:</strong> We cover return shipping and expedite your replacement
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Non-Returnable Items</h2>
            <p className="text-gray-700 mb-4">
              The following items cannot be returned:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>Limited edition or custom-ordered items (unless defective)</li>
              <li>Items marked as &quot;Final Sale&quot;</li>
              <li>Opened electrical components or controllers</li>
              <li>Gift cards</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">Refund Method</h2>
            <p className="text-gray-700">
              Refunds will be issued to the original payment method used for the purchase. Please allow 5-10 business days for the refund to appear in your account after we process it.
            </p>
          </section>
        </div>

        <div className="mt-12 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-2">Need Help with a Return?</h3>
          <p className="text-gray-700">
            Our customer service team is here to assist you. Contact us at{' '}
            <a href="mailto:support@r66slot.com" className="text-primary font-semibold hover:underline">
              support@r66slot.com
            </a>{' '}
            or call 1-800-R66-SLOT
          </p>
        </div>
      </div>
    </div>
  )
}
