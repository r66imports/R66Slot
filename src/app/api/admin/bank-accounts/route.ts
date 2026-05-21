import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'
import { randomUUID } from 'crypto'

const KEY = 'data/bank-accounts.json'

export interface BankAccount {
  id: string
  companyName: string   // "Account Name" profile — e.g. "Route 66 Imports PTY LTD"
  bankName: string
  accountName: string
  accountNumber: string
  branchCode: string
  accountType?: string
  address: string
}

export async function GET() {
  const accounts = await blobRead<BankAccount[]>(KEY, [])
  return NextResponse.json(accounts)
}

export async function POST(req: Request) {
  const body = await req.json()
  const accounts = await blobRead<BankAccount[]>(KEY, [])
  const account: BankAccount = {
    id: randomUUID(),
    companyName: body.companyName || '',
    bankName: body.bankName || '',
    accountName: body.accountName || '',
    accountNumber: body.accountNumber || '',
    branchCode: body.branchCode || '',
    accountType: body.accountType || '',
    address: body.address || '',
  }
  accounts.push(account)
  await blobWrite(KEY, accounts)
  return NextResponse.json(account)
}

export async function PATCH(req: Request) {
  const body = await req.json()
  const accounts = await blobRead<BankAccount[]>(KEY, [])
  const idx = accounts.findIndex(a => a.id === body.id)
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  accounts[idx] = { ...accounts[idx], ...body }
  await blobWrite(KEY, accounts)
  return NextResponse.json(accounts[idx])
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const accounts = await blobRead<BankAccount[]>(KEY, [])
  await blobWrite(KEY, accounts.filter(a => a.id !== id))
  return NextResponse.json({ ok: true })
}
