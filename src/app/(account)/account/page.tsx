'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AccountDashboard() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    savedAddresses: 0,
  })

  useEffect(() => {
    // Fetch user data
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => setUser(data))
      .catch(() => {
        // Redirect to login if not authenticated
        window.location.href = '/account/login'
      })

    // Fetch stats
    fetch('/api/account/stats')
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(console.error)
  }, [])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-2">
          Welcome back, {user.firstName}!
        </h2>
        <p className="text-gray-600">
          Manage your orders, addresses, and account settings
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalOrders}</p>
            <Link
              href="/account/orders"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              View all orders →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.pendingOrders}</p>
            {stats.pendingOrders > 0 && (
              <Link
                href="/account/orders?status=pending"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Track orders →
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Saved Addresses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.savedAddresses}</p>
            <Link
              href="/account/addresses"
              className="text-sm text-primary hover:underline mt-2 inline-block"
            >
              Manage addresses →
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/products">
            <Button variant="outline" className="w-full justify-start">
              🛍️ Continue Shopping
            </Button>
          </Link>
          <Link href="/account/orders">
            <Button variant="outline" className="w-full justify-start">
              📦 View Orders
            </Button>
          </Link>
          <Link href="/account/addresses">
            <Button variant="outline" className="w-full justify-start">
              📍 Manage Addresses
            </Button>
          </Link>
          <Link href="/account/profile">
            <Button variant="outline" className="w-full justify-start">
              👤 Edit Profile
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link
            href="/account/orders"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-4">📦</div>
            <p className="mb-4">No orders yet</p>
            <Link href="/products">
              <Button>Start Shopping</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <Link href="/account/profile">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
              </Link>
            </div>
            <div className="flex justify-between items-center py-3 border-b">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-gray-600">••••••••</p>
              </div>
              <Link href="/account/profile">
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </Link>
            </div>
            <div className="flex justify-between items-center py-3">
              <div>
                <p className="font-medium">Member Since</p>
                <p className="text-sm text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
