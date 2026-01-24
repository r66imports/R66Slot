import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Admin Dashboard | R66SLOT',
}

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome to R66SLOT Admin Panel
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">-</p>
            <p className="text-xs text-gray-500 mt-1">
              Connect Shopify to see data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Orders Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">-</p>
            <p className="text-xs text-gray-500 mt-1">
              Connect Shopify to see data
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Blog Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-gray-500 mt-1">
              Create your first post
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Site Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">●</p>
            <p className="text-xs text-gray-500 mt-1">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/admin/pages">
              <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                ✏️ Edit Site - Visual Page Editor
              </Button>
            </Link>
            <Link href="/admin/settings">
              <Button variant="outline" className="w-full justify-start">
                ⚙️ Edit Site Settings
              </Button>
            </Link>
            <Link href="/admin/homepage">
              <Button variant="outline" className="w-full justify-start">
                🏠 Edit Homepage Content
              </Button>
            </Link>
            <Link href="/admin/blog">
              <Button variant="outline" className="w-full justify-start">
                📝 Create Blog Post
              </Button>
            </Link>
            <a
              href="https://admin.shopify.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" className="w-full justify-start">
                📦 Manage Products (Shopify)
              </Button>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Admin panel created</p>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm font-medium">Site deployed</p>
                  <p className="text-xs text-gray-500">Ready for launch</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Setup Checklist */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Setup Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="shopify"
                className="w-5 h-5 rounded border-gray-300"
              />
              <label htmlFor="shopify" className="text-sm">
                Connect Shopify store credentials
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="settings"
                className="w-5 h-5 rounded border-gray-300"
              />
              <label htmlFor="settings" className="text-sm">
                Configure site settings (contact info, social media)
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="homepage"
                className="w-5 h-5 rounded border-gray-300"
              />
              <label htmlFor="homepage" className="text-sm">
                Customize homepage content
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="products"
                className="w-5 h-5 rounded border-gray-300"
              />
              <label htmlFor="products" className="text-sm">
                Add products to Shopify
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="test"
                className="w-5 h-5 rounded border-gray-300"
              />
              <label htmlFor="test" className="text-sm">
                Test checkout flow
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
