import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const SUPPLIERS_KEY = 'data/suppliers.json'

export interface SupplierImport {
  id: string
  filename: string
  csvData: string
  productCount: number
  importedAt: string
  source: string
}

async function getSupplierImports(): Promise<SupplierImport[]> {
  return await blobRead<SupplierImport[]>(SUPPLIERS_KEY, [])
}

async function saveSupplierImports(imports: SupplierImport[]): Promise<void> {
  await blobWrite(SUPPLIERS_KEY, imports)
}

export async function GET() {
  try {
    const imports = await getSupplierImports()
    return NextResponse.json(imports)
  } catch (error) {
    console.error('Error fetching supplier imports:', error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { filename, csvData, productCount, source } = body

    const imports = await getSupplierImports()
    const newImport: SupplierImport = {
      id: `sup-${Date.now()}`,
      filename: filename || `import-${new Date().toISOString().slice(0, 10)}.csv`,
      csvData,
      productCount: productCount || 0,
      importedAt: new Date().toISOString(),
      source: source || 'manual',
    }

    imports.unshift(newImport)
    await saveSupplierImports(imports)

    return NextResponse.json(newImport)
  } catch (error) {
    console.error('Error saving supplier import:', error)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const imports = await getSupplierImports()
    const filtered = imports.filter((i) => i.id !== id)
    await saveSupplierImports(filtered)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier import:', error)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
