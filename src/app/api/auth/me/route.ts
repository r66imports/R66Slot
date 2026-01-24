import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const CUSTOMERS_FILE = path.join(process.cwd(), 'data', 'customers.json')

function getCustomers() {
  try {
    const data = fs.readFileSync(CUSTOMERS_FILE, 'utf-8')
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
    const customers = getCustomers()
    const customer = customers.find((c: any) => c.id === decoded.id)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Return customer data without password
    const { password, ...customerData } = customer
    return NextResponse.json(customerData)
  } catch (error) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
}
