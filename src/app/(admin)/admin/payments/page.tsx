'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface PaymentMethod {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  configured: boolean
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'eft',
    name: 'EFT / Bank Transfer',
    description: 'Manual bank transfer payments. Customers pay directly to your bank account.',
    icon: '🏦',
    enabled: true,
    configured: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Pay',
    description: 'Send payment links and invoices via WhatsApp.',
    icon: '💬',
    enabled: true,
    configured: true,
  },
  {
    id: 'payfast',
    name: 'PayFast',
    description: 'Accept credit cards, debit cards, and instant EFT via PayFast.',
    icon: '💳',
    enabled: false,
    configured: false,
  },
  {
    id: 'yoco',
    name: 'Yoco',
    description: 'Accept card payments in-store and online with Yoco.',
    icon: '📱',
    enabled: false,
    configured: false,
  },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Customers pay in cash when the order is delivered.',
    icon: '💵',
    enabled: false,
    configured: true,
  },
]

export default function PaymentsPage() {
  const [methods, setMethods] = useState(PAYMENT_METHODS)
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',
    reference: 'Order number',
  })

  const toggleMethod = (id: string) => {
    setMethods(methods.map((m) =>
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Payments</h1>
        <p className="text-gray-600 mt-1">
          Configure payment methods for your store
        </p>
      </div>

      <div className="space-y-4">
        {methods.map((method) => (
          <Card key={method.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-3xl">{method.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{method.name}</h3>
                      {!method.configured && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                          Setup Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{method.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${method.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {method.enabled ? 'Active' : 'Inactive'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={method.enabled}
                      onChange={() => toggleMethod(method.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* EFT Bank Details section */}
              {method.id === 'eft' && method.enabled && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold mb-3">Bank Account Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Bank Name</label>
                      <input
                        type="text"
                        value={bankDetails.bankName}
                        onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                        placeholder="e.g. FNB, Standard Bank"
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Account Holder</label>
                      <input
                        type="text"
                        value={bankDetails.accountHolder}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Account Number</label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Branch Code</label>
                      <input
                        type="text"
                        value={bankDetails.branchCode}
                        onChange={(e) => setBankDetails({ ...bankDetails, branchCode: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💳</div>
            <div>
              <h3 className="font-semibold mb-2">Payment Methods</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Toggle payment methods on/off as needed</li>
                <li>• EFT and WhatsApp Pay work immediately with no setup fees</li>
                <li>• PayFast and Yoco require separate merchant accounts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
