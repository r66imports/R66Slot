import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ORDERS_FILE = path.join(process.cwd(), 'data', 'orders.json')
const ADDRESSES_FILE = path.join(process.cwd(), 'data', 'addresses.json')

function getOrders() {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

function getAddresses() {
  try {
    const data = fs.readFileSync(ADDRESSES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('customer_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    const orders = getOrders().filter((o: any) => o.customerId === decoded.id)
    const addresses = getAddresses().filter((a: any) => a.customerId === decoded.id)

    const stats = {
      totalOrders: orders.length,
      pendingOrders: orders.filter((o: any) => o.status === 'pending' || o.status === 'processing').length,
      savedAddresses: addresses.length,
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
