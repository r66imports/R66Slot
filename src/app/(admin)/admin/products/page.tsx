'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ProductsPage() {
  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-1">
            Manage your local product inventory
          </p>
        </div>
        <Button size="lg" asChild>
          <Link href="/admin/products/new">
            Add product
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link href="/admin/products/new">
            <Button variant="outline" className="w-full justify-start">
              ➕ Add New Product
            </Button>
          </Link>
          <Link href="/admin/costing">
            <Button variant="outline" className="w-full justify-start">
              💰 Product Costing Calculator
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => window.open('https://wa.me/27615898921', '_blank')}
          >
            📱 Contact via WhatsApp
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Product Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Your products are stored locally and managed through this admin panel. No third-party integrations required.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Getting Started
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    Click &quot;Add product&quot; above to start building your slot car inventory.
                    Products can be exported to WhatsApp for easy ordering with customers.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Product list view coming soon. For now, add products and they&apos;ll be ready for your order sheet and WhatsApp orders.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
