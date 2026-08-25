// A line on a supplier order. Supplier orders are purchasing documents: lines are pushed here
// from a Quote's "Add to Supplier Order" tick box and stay put until the order is deleted.
// Lines sharing a supplierOrderRef form one order on /admin/suppliers.
//
// This is deliberately separate from Backorder — supplier orders used to be stored as
// backorder rows, and that store is being retired.
export interface SupplierOrderLine {
  id: string
  // Supplier
  supplierId?: string
  supplierName: string
  supplierOrderRef: string
  supplierOrderName: string
  // Product
  sku: string
  description: string
  brand?: string
  qty: number
  price: number
  // Where it came from
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  quoteNumber?: string
  notes?: string
  source?: string
  // Meta
  status: 'active' | 'complete' | 'cancelled'
  createdAt: string
  updatedAt: string
}
