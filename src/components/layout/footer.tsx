import Link from 'next/link'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="text-white border-t border-gray-700" style={{ backgroundColor: '#1f2937' }}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="text-2xl font-bold inline-block mb-4">
              <span className="text-white">R66</span>
              <span className="text-primary">SLOT</span>
            </Link>
            <p className="text-gray-400 text-sm">
              Your premium destination for slot car racing. Quality models, fast shipping, expert service.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/products" className="text-gray-400 hover:text-primary transition-colors">
                All Products
              </Link>
              <Link href="/brands" className="text-gray-400 hover:text-primary transition-colors">
                Brands
              </Link>
              <Link href="/collections/new-arrivals" className="text-gray-400 hover:text-primary transition-colors">
                New Arrivals
              </Link>
              <Link href="/pre-orders" className="text-gray-400 hover:text-primary transition-colors">
                Pre-Orders
              </Link>
            </nav>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-semibold mb-4">Information</h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/about" className="text-gray-400 hover:text-primary transition-colors">
                About Us
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-primary transition-colors">
                Contact
              </Link>
              <Link href="/shipping" className="text-gray-400 hover:text-primary transition-colors">
                Shipping Info
              </Link>
              <Link href="/returns" className="text-gray-400 hover:text-primary transition-colors">
                Returns
              </Link>
            </nav>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold mb-4">Account</h3>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/account" className="text-gray-400 hover:text-primary transition-colors">
                My Account
              </Link>
              <Link href="/account/orders" className="text-gray-400 hover:text-primary transition-colors">
                Order History
              </Link>
              <Link href="/account/login" className="text-gray-400 hover:text-primary transition-colors">
                Login
              </Link>
              <Link href="/account/register" className="text-gray-400 hover:text-primary transition-colors">
                Register
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {currentYear} R66SLOT. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-gray-400 hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-400 hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
