'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ShippingZone {
  id: string
  name: string
  regions: string
  rate: string
  freeAbove: string
  enabled: boolean
}

const DEFAULT_ZONES: ShippingZone[] = [
  { id: '1', name: 'Local (Gauteng)', regions: 'Gauteng', rate: '75', freeAbove: '500', enabled: true },
  { id: '2', name: 'National (South Africa)', regions: 'All SA provinces', rate: '120', freeAbove: '750', enabled: true },
  { id: '3', name: 'International', regions: 'Rest of world', rate: '350', freeAbove: '', enabled: false },
]

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>(DEFAULT_ZONES)
  const [editing, setEditing] = useState<string | null>(null)

  const toggleZone = (id: string) => {
    setZones(zones.map((z) => (z.id === id ? { ...z, enabled: !z.enabled } : z)))
  }

  const updateZone = (id: string, field: keyof ShippingZone, value: string) => {
    setZones(zones.map((z) => (z.id === id ? { ...z, [field]: value } : z)))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Shipping</h1>
        <p className="text-gray-600 mt-1">
          Configure shipping zones and rates for your store
        </p>
      </div>

      <div className="space-y-4">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zone.enabled}
                      onChange={() => toggleZone(zone.id)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  <div>
                    <h3 className="font-semibold text-lg">{zone.name}</h3>
                    <p className="text-sm text-gray-500">{zone.regions}</p>
                  </div>
                </div>

                {editing === zone.id ? (
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Rate (R)</label>
                      <input
                        type="number"
                        value={zone.rate}
                        onChange={(e) => updateZone(zone.id, 'rate', e.target.value)}
                        className="w-24 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Free above (R)</label>
                      <input
                        type="number"
                        value={zone.freeAbove}
                        onChange={(e) => updateZone(zone.id, 'freeAbove', e.target.value)}
                        placeholder="Never"
                        className="w-24 px-2 py-1 border rounded text-sm"
                      />
                    </div>
                    <Button size="sm" onClick={() => setEditing(null)}>
                      Done
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">R{zone.rate}</p>
                      {zone.freeAbove && (
                        <p className="text-xs text-green-600">Free above R{zone.freeAbove}</p>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setEditing(zone.id)}>
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl">🚚</div>
            <div>
              <h3 className="font-semibold mb-2">Shipping Configuration</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• Toggle zones on/off to enable or disable shipping to those regions</li>
                <li>• Set flat rates per zone or configure free shipping thresholds</li>
                <li>• Rates are displayed at checkout for customers</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
