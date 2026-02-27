'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SageStatus {
  connected: boolean
  expiresAt?: number
  total?: number
  sage_linked?: number
  last_synced?: string | null
}

interface SyncResult {
  synced?: number
  created?: number
  updated?: number
  skipped?: number
  total?: number
  error?: string
}

export default function SagePage() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<SageStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [loading, setLoading] = useState(true)

  const justConnected = searchParams.get('connected') === '1'
  const connectError = searchParams.get('error')

  useEffect(() => {
    fetch('/api/admin/sage/sync')
      .then(r => r.json())
      .then(setStatus)
      .finally(() => setLoading(false))
  }, [justConnected])

  const handleSync = async () => {
    setSyncing(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/sage/sync', { method: 'POST' })
      const data = await res.json()
      setResult(data)
      // Refresh status
      fetch('/api/admin/sage/sync').then(r => r.json()).then(setStatus)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Sage Accounting</h1>
        <p className="text-gray-600 mt-1">Sync products from Sage Accounting to your store</p>
      </div>

      {justConnected && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          Sage connected successfully! You can now sync your products.
        </div>
      )}

      {connectError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          Connection error: {connectError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-gray-500 text-sm">Checking connection…</p>
            ) : status?.connected ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-green-700">Connected to Sage Accounting</span>
                </div>
                {status.expiresAt && (
                  <p className="text-xs text-gray-500">
                    Token valid until {new Date(status.expiresAt).toLocaleString()}
                  </p>
                )}
                <a href="/api/admin/sage/connect">
                  <Button variant="outline" size="sm">Reconnect</Button>
                </a>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-red-700">Not connected</span>
                </div>
                <p className="text-sm text-gray-600">
                  Connect your Sage Accounting account to sync products automatically.
                </p>
                <a href="/api/admin/sage/connect">
                  <Button className="bg-green-600 hover:bg-green-700 text-white">
                    Connect Sage Accounting
                  </Button>
                </a>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sync Card */}
        <Card>
          <CardHeader>
            <CardTitle>Product Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total products</p>
                <p className="text-2xl font-bold">{status?.total ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Linked to Sage</p>
                <p className="text-2xl font-bold">{status?.sage_linked ?? '—'}</p>
              </div>
            </div>

            {status?.last_synced && (
              <p className="text-xs text-gray-500">
                Last synced: {new Date(status.last_synced).toLocaleString()}
              </p>
            )}

            <Button
              onClick={handleSync}
              disabled={!status?.connected || syncing}
              className="w-full"
            >
              {syncing ? 'Syncing from Sage…' : 'Sync Products Now'}
            </Button>

            {result && (
              <div className={`p-3 rounded-lg text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {result.error ? (
                  <p>Error: {result.error}</p>
                ) : (
                  <>
                    <p className="font-medium">Sync complete!</p>
                    <p>{result.created} new products created</p>
                    <p>{result.updated} products updated</p>
                    {result.skipped ? <p>{result.skipped} skipped (no name)</p> : null}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Setup Instructions */}
      {!status?.connected && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <p className="font-medium">Before connecting, add these to Railway Variables:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to <strong>developer.sage.com</strong> → Create an app → Get Client ID & Secret</li>
              <li>Set <strong>Redirect URI</strong> in your Sage app to:<br />
                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                  https://www.r66slot.co.za/api/admin/sage/callback
                </code>
              </li>
              <li>Add to Railway Variables:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><code className="bg-gray-100 px-1 rounded">SAGE_CLIENT_ID</code> — from Sage developer portal</li>
                  <li><code className="bg-gray-100 px-1 rounded">SAGE_CLIENT_SECRET</code> — from Sage developer portal</li>
                  <li><code className="bg-gray-100 px-1 rounded">SAGE_REDIRECT_URI</code> — <code className="bg-gray-100 px-1 rounded text-xs">https://www.r66slot.co.za/api/admin/sage/callback</code></li>
                </ul>
              </li>
              <li>Come back here and click <strong>Connect Sage Accounting</strong></li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
