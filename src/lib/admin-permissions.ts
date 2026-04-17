/** Shared permission constants — no server imports, safe for client components */

export const ALL_PERMISSIONS: { group: string; name: string; href: string }[] = [
  // Site
  { group: 'Site', name: 'Edit Site', href: '/admin/pages' },
  { group: 'Site', name: 'Edit Header', href: '/admin/header' },
  { group: 'Site', name: 'Dashboard', href: '/admin' },
  // Content
  { group: 'Content', name: 'Homepage', href: '/admin/homepage' },
  { group: 'Content', name: 'Products', href: '/admin/products' },
  { group: 'Content', name: 'Task List', href: '/admin/task-list' },
  { group: 'Content', name: 'Inventory', href: '/admin/inventory' },
  { group: 'Content', name: 'Categories', href: '/admin/categories' },
  { group: 'Content', name: 'POS / Scanner', href: '/admin/pos' },
  { group: 'Content', name: 'Reports', href: '/admin/reports' },
  { group: 'Content', name: 'Stock Audit', href: '/admin/stock-audit' },
  // Order Network
  { group: 'Order Network', name: 'Site Orders', href: '/admin/site-orders' },
  { group: 'Order Network', name: 'Orders (Sales)', href: '/admin/orders' },
  { group: 'Order Network', name: 'Pre Orders', href: '/admin/preorder-list' },
  { group: 'Order Network', name: 'Pre Order Dashboard', href: '/admin/preorder-dashboard' },
  { group: 'Order Network', name: 'Back Orders', href: '/admin/backorders' },
  { group: 'Order Network', name: 'Suppliers Orders', href: '/admin/suppliers' },
  { group: 'Order Network', name: 'Work Sheet', href: '/admin/worksheet' },
  { group: 'Order Network', name: 'Price Lists', href: '/admin/price-lists' },
  // Business & Store
  { group: 'Business & Store', name: 'Flyer Generator', href: '/admin/social' },
  { group: 'Business & Store', name: 'Media Library', href: '/admin/media' },
  { group: 'Business & Store', name: 'Customers', href: '/admin/contacts' },
  { group: 'Business & Store', name: 'Suppliers', href: '/admin/supplier-contacts' },
  { group: 'Business & Store', name: 'Events', href: '/admin/events' },
  { group: 'Business & Store', name: 'Payments', href: '/admin/payments' },
  { group: 'Business & Store', name: 'Sage Accounting', href: '/admin/sage' },
  // Shipping
  { group: 'Shipping', name: 'Shipping Network', href: '/admin/shipping-network' },
  { group: 'Shipping', name: 'Local Shipping', href: '/admin/shipping' },
  { group: 'Shipping', name: 'Packing List', href: '/admin/shipments' },
  // Auctions
  { group: 'Auctions', name: 'Auctions', href: '/admin/auctions' },
  // Blog
  { group: 'Blog', name: 'Blog', href: '/admin/blog' },
]

/** Default permissions granted to new staff users */
export const DEFAULT_PERMISSIONS = ['/admin/inventory', '/admin/orders']

/** Routes always accessible regardless of permissions */
export const ALWAYS_ALLOWED = ['/admin', '/admin/account', '/admin/login']
