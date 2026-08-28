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
  { group: 'Content', name: 'SKU Photo Task List', href: '/admin/sku-photo-task-list' },
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
  { group: 'Order Network', name: 'Checklists', href: '/admin/checklists' },
  { group: 'Order Network', name: 'Price Lists', href: '/admin/price-lists' },
  // Business & Store
  { group: 'Business & Store', name: 'Flyer Generator', href: '/admin/social' },
  { group: 'Business & Store', name: 'Media Library', href: '/admin/media' },
  { group: 'Business & Store', name: 'Customers', href: '/admin/contacts' },
  { group: 'Business & Store', name: 'Customer Dashboard', href: '/admin/customer-dashboard' },
  { group: 'Business & Store', name: 'Suppliers', href: '/admin/supplier-contacts' },
  { group: 'Business & Store', name: 'Events', href: '/admin/events' },
  { group: 'Business & Store', name: 'Payments', href: '/admin/payments' },
  { group: 'Business & Store', name: 'Customer Payments', href: '/admin/customer-payments' },
  { group: 'Business & Store', name: 'Payment Mapping', href: '/admin/payment-mapping' },
  { group: 'Business & Store', name: 'Accounting', href: '/admin/accounting' },
  { group: 'Business & Store', name: 'Sage Accounting', href: '/admin/sage' },
  // Shipping
  { group: 'Shipping', name: 'Shipping Network', href: '/admin/shipping-network' },
  { group: 'Shipping', name: 'Local Shipping', href: '/admin/shipping' },
  { group: 'Shipping', name: 'Packing List', href: '/admin/shipments' },
  // Auctions
  { group: 'Auctions', name: 'Auctions', href: '/admin/auctions' },
  // Supplier Network
  { group: 'Supplier Network', name: 'Supplier Network', href: '/admin/supplier-network' },
  { group: 'Supplier Network', name: 'Stock Sheets', href: '/admin/supplier-stock-sheets' },
  // Blog
  { group: 'Blog', name: 'Blog', href: '/admin/blog' },
  // Settings
  { group: 'Settings', name: 'Site Settings', href: '/admin/settings' },
  { group: 'Settings', name: 'Email Settings', href: '/admin/settings/email' },
  { group: 'Settings', name: 'Site Rules', href: '/admin/settings/site-rules' },
  { group: 'Settings', name: 'Stock Mapping', href: '/admin/settings/stock-mapping' },
  { group: 'Settings', name: 'Pre-Orders Mapping', href: '/admin/settings/preorders-mapping' },
  { group: 'Settings', name: 'Prompts', href: '/admin/settings/prompts' },
]

/** Default permissions granted to new staff users */
export const DEFAULT_PERMISSIONS = ['/admin/inventory', '/admin/orders']

/** Routes always accessible regardless of permissions */
export const ALWAYS_ALLOWED = ['/admin', '/admin/account', '/admin/login']

/**
 * Reserved for the main Admin account. Nothing else may live here: staff must get
 * identical functionality to Admin on every feature they have been granted, so
 * permissions decide *whether* a feature is visible, never how much of it works.
 * Managing other people's accounts is the one exception.
 */
export const ADMIN_ONLY = ['/admin/settings/users']

/**
 * Single source of truth for "may this role open this link?" — used by the nav
 * filter and by the page guards so they can never drift apart.
 *
 * Query strings and hashes are stripped first. Nav entries like
 * /admin/orders?tab=quotes must resolve against the /admin/orders permission;
 * without this, staff granted Orders lose every Orders sub-item in the menu.
 */
export function canAccessPath(
  role: string | null,
  permissions: string[],
  href: string
): boolean {
  const path = href.split('?')[0].split('#')[0]
  if (role !== 'staff') return true
  if (ADMIN_ONLY.some((a) => path === a || path.startsWith(a + '/'))) return false
  if (ALWAYS_ALLOWED.includes(path)) return true
  return permissions.includes(path) || permissions.some((p) => p !== '/admin' && path.startsWith(p + '/'))
}
