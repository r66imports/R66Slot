export interface Backorder {
  id: string
  // Client reference
  clientId?: string
  // Client Details
  clientName: string
  clientEmail: string
  clientPhone: string
  // Home Address
  address: string
  suburb: string
  city: string
  postalCode: string
  // Club Info
  clubName: string
  clubMemberId: string
  // Company Info
  companyName: string
  companyVAT: string
  companyAddress: string
  // Product Details
  sku: string
  description: string
  brand: string
  supplierLink: string
  qty: number
  price: number
  // Phase Tracking
  phaseQuote: boolean
  phaseQuoteDate?: string
  phaseSalesOrder: boolean
  phaseSalesOrderDate?: string
  phaseInvoice: boolean
  phaseInvoiceDate?: string
  phaseDepositPaid: boolean
  phaseDepositPaidDate?: string
  // Order tracking
  orderStatus?: 'booked' | 'confirmed' | 'shipping' | 'tracking' | 'in_stock' | 'not_available'
  quoteNumber?: string
  salesOrderNumber?: string
  invoiceNumber?: string
  // Item status
  itemFound?: 'yes' | 'no'
  // Supplier
  supplierId?: string
  supplierName?: string
  // Meta
  notes?: string
  source?: string
  status: 'active' | 'complete' | 'cancelled'
  createdAt: string
  updatedAt: string
}
