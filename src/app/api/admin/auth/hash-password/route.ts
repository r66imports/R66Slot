import { NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth/config'

// Utility endpoint to generate password hashes
export async function POST(request: Request) {
  try {
    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    const hash = await hashPassword(password)

    return NextResponse.json({ hash })
  } catch (error) {
    console.error('Hash generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate hash' },
      { status: 500 }
    )
  }
}
