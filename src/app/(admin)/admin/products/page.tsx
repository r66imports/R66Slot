import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Products | R66SLOT Admin',
}

export default function ProductsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Products</h1>
        <p className="text-gray-600 mt-1">
          Manage your products through Shopify
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Shopify Product Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Your products are managed through Shopify&apos;s powerful admin interface. Use Shopify to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Add and edit products</li>
              <li>Manage inventory levels</li>
              <li>Set pricing and variants</li>
              <li>Upload product images</li>
              <li>Organize into collections</li>
              <li>Track sales and orders</li>
            </ul>
            <div className="pt-4">
              <Button size="lg" asChild className="w-full">
                <a
                  href="https://admin.shopify.com/store/products"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Shopify Products →
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="https://admin.shopify.com/store/products/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full justify-start">
                ➕ Add New Product
              </Button>
            </a>
            <a
              href="https://admin.shopify.com/store/collections"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full justify-start">
                📁 Manage Collections
              </Button>
            </a>
            <a
              href="https://admin.shopify.com/store/inventory"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full justify-start">
                📊 View Inventory
              </Button>
            </a>
            <a
              href="https://admin.shopify.com/store/orders"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full justify-start">
                📦 View Orders
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Connecting Your Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Make sure your Shopify store is connected in your environment variables:
          </p>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
            <p>NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com</p>
            <p>NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN=your-token</p>
          </div>
          <p className="text-sm text-gray-600">
            Once connected, your products will automatically appear on the frontend at{' '}
            <a href="/products" target="_blank" className="text-primary hover:underline">
              /products
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
