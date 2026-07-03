import { NextResponse } from 'next/server'

// R66Slot has no reseller system — always return not-reseller
export async function GET() {
  return NextResponse.json({ isReseller: false, fullAccess: false, reason: 'not_reseller' })
}
