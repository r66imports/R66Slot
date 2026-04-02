import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/shipment-options.json'

export interface DropdownOption {
  value: string
  label: string
  color: string
}

export interface ShipmentOptions {
  statuses: DropdownOption[]
  instructions: DropdownOption[]
  couriers: DropdownOption[]
  boxSizes: DropdownOption[]
  staff: DropdownOption[]
}

const DEFAULT_OPTIONS: ShipmentOptions = {
  statuses: [
    { value: 'printed', label: 'Printed', color: 'yellow' },
    { value: 'packed', label: 'Packed', color: 'green' },
    { value: 'sent', label: 'Sent', color: 'gray' },
  ],
  instructions: [
    { value: 'ready', label: 'Ready to Ship', color: 'green' },
    { value: 'hold', label: 'Hold', color: 'red' },
    { value: 'shipped', label: 'Shipped', color: 'dark' },
  ],
  couriers: [
    { value: 'pudo', label: 'Pudo', color: 'yellow' },
    { value: 'aramex', label: 'Aramex', color: 'red' },
    { value: 'fastway', label: 'Fastway', color: 'blue' },
    { value: 'pudo_locker', label: 'Pudo Locker', color: 'orange' },
    { value: 'tcg', label: 'The Courier Guy', color: 'indigo' },
    { value: 'postnet', label: 'PostNet', color: 'teal' },
    { value: 'collection', label: 'Collection', color: 'gray' },
  ],
  boxSizes: [
    { value: 'xs', label: 'XS', color: 'gray' },
    { value: 'sm', label: 'Small', color: 'gray' },
    { value: 'md', label: 'Medium', color: 'gray' },
    { value: 'lg', label: 'Large', color: 'gray' },
    { value: 'xl', label: 'XL', color: 'gray' },
  ],
  staff: [],
}

export async function GET() {
  try {
    const stored = await blobRead<ShipmentOptions>(KEY, DEFAULT_OPTIONS)
    // Ensure all keys exist (self-healing for new option types)
    const merged: ShipmentOptions = {
      statuses: stored.statuses ?? DEFAULT_OPTIONS.statuses,
      instructions: stored.instructions ?? DEFAULT_OPTIONS.instructions,
      couriers: stored.couriers ?? DEFAULT_OPTIONS.couriers,
      boxSizes: stored.boxSizes ?? DEFAULT_OPTIONS.boxSizes,
      staff: stored.staff ?? DEFAULT_OPTIONS.staff,
    }
    return NextResponse.json(merged)
  } catch {
    return NextResponse.json(DEFAULT_OPTIONS)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json() as Partial<ShipmentOptions>
    const current = await blobRead<ShipmentOptions>(KEY, DEFAULT_OPTIONS)
    const updated: ShipmentOptions = {
      statuses: body.statuses ?? current.statuses,
      instructions: body.instructions ?? current.instructions,
      couriers: body.couriers ?? current.couriers,
      boxSizes: body.boxSizes ?? current.boxSizes,
      staff: body.staff ?? current.staff ?? [],
    }
    await blobWrite(KEY, updated)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
