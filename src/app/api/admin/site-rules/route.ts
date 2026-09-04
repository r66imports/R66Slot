import { NextResponse } from 'next/server'
import { blobRead, blobWrite } from '@/lib/blob-storage'

const KEY = 'data/site-rules.json'

export interface SiteRule {
  id: string
  name: string
  description: string
  active: boolean
  appliesTo: string[]
  value?: string
  options?: Array<{ label: string; value: string }>
  category?: string
  sortOrder?: number
}

const DEFAULT_RULES: SiteRule[] = [
  {
    id: 'site_font',
    name: 'Rule 0 \u2014 Site Font',
    description: 'The global font used across all pages of the store, admin, and customer-facing areas. Currently set to Play (Google Fonts). Applied via the root layout body class \u2014 affects headings, body text, and UI elements site-wide.',
    active: true,
    appliesTo: ['Online Store', 'Admin', 'Customer Account', 'All Pages'],
    value: 'Play',
    category: 'System',
  },
  {
    id: 'enforce_stock_limit',
    name: 'Rule 1 \u2014 Enforce Stock Limits',
    description: 'Prevent selling more items than what is available in stock. Invoices are ALWAYS hard-blocked — this part is not toggleable. If a line item asks for more than the product holds (including stock 0), the invoice is refused and the offending SKUs are named. That applies everywhere an invoice is raised: Create Invoice, Quote → Send to Invoice (both Create New and Add to Existing), and Pre-Order Dashboard → Send to Invoice. Exceptions: converting a Sales Order that already reserved the stock, and site orders that already deducted at checkout (Rule 31) — those stock movements have happened already. Sales Orders are NOT blocked — an SO legitimately reserves stock that has not landed yet. The toggle controls the softer limits: capping quantity at stock level in the invoice line-item picker and blocking POS sales at 0.',
    active: true,
    appliesTo: ['Admin Invoices', 'POS / Scanner', 'Online Store'],
    category: 'Inventory',
  },
  {
    id: 'auto_create_product',
    name: 'Rule 2 \u2014 Auto-Create Product from Invoice',
    description: 'When a new invoice is created, any line item whose SKU does not already exist in the Products inventory is automatically created as a draft product. Flow: Create Invoice \u2192 line items checked against Products DB \u2192 SKU not found \u2192 draft product created with SKU, title (from description), and price (from line item unit price) \u2192 product visible in Products admin with status Draft \u2192 you can edit and complete the product details at any time. Only runs on new invoices \u2014 editing an existing invoice does not re-trigger auto-creation.',
    active: true,
    appliesTo: ['Admin Invoices', 'Products'],
    category: 'Inventory',
  },
  {
    id: 'invoice_stock_deduction',
    name: 'Rule 3 \u2014 Stock Deduction on Invoice & Sales Order',
    description: 'Automatically adjusts inventory when documents are created, edited, or cancelled. Flow: Quote created \u2192 no stock impact. Sales Order created \u2192 stock reserved (deducted immediately, pending delivery). Invoice created \u2192 stock confirmed as sold (deducted). Line items edited on active SO/Invoice \u2192 old quantities restored, new quantities deducted. Document archived or rejected \u2192 stock fully restored. Use the "Sync Inventory" button on the Orders page to apply deductions to all historical invoices and sales orders that predate this rule.',
    active: true,
    appliesTo: ['Admin Invoices', 'Sales Orders'],
    category: 'Inventory',
  },
  {
    id: 'backorder_to_invoice',
    name: 'Rule 4 \u2014 Backorder \u2192 Send to Invoice',
    description: 'Allows selected backorder items to be converted directly into an invoice without going through the Quote \u2192 Sales Order flow. Flow: Back Orders page \u2192 tick item checkboxes for a client \u2192 click "Send to Invoice (n)" \u2192 Create Invoice modal opens pre-filled with selected items and client details \u2192 save the invoice \u2192 stock is automatically deducted (Rule 2) \u2192 backorder items are marked as invoiced. Applies only to the checked items; unchecked items in the same client group remain as active backorders.',
    active: true,
    appliesTo: ['Back Orders', 'Admin Invoices'],
    category: 'Invoices',
  },
  {
    id: 'document_shipping',
    name: 'Rule 5 \u2014 Shipping & Discounts on Quotes, Sales Orders & Invoices',
    description: 'Discount and shipping can be applied to any document type. Discount %: applied to the line items subtotal only \u2014 reduces the base total before shipping is added. Shipping Cost: added after discount and is never discounted. Formula: Total = Subtotal \u2212 Discount + Shipping. Flow: Create or Edit Quote / Sales Order / Invoice \u2192 scroll to Line Items totals \u2192 enter Discount % (optional) \u2192 select Shipping Method (Pudo Locker-to-Locker, Pudo Door-to-Door, The Courier Guy, Fastway, Aramex, PostNet, Collection, Other) \u2192 enter Shipping Cost \u2192 enter Tracking Number (hidden for Collection) \u2192 final Total = Subtotal \u2212 Discount + Shipping \u2192 appears correctly in the document list, PDF, print, and email. Tracking number field only appears when a shipping method is selected and method is not Collection.',
    active: true,
    appliesTo: ['Admin Invoices', 'Quotes', 'Sales Orders'],
    category: 'Invoices',
  },
  {
    id: 'configurable_dropdowns',
    name: 'Rule 7 \u2014 Configurable Dropdown Options',
    description: 'All dropdown menus across the admin can have their options managed inline. Each dropdown shows a + Add and trash Delete icon directly inside the dropdown popup. Adding a new option: type the label, choose a colour dot, press + or Enter. Deleting: hover the option and click the trash icon. Changes save automatically. Applies to: Status, Instructions, Courier (Shipment Log), Box Sizes, and any future dropdown fields.',
    active: true,
    appliesTo: ['Admin', 'Shipment Log', 'All Dropdowns'],
    category: 'System',
  },
  {
    id: 'inventory_count_sync',
    name: 'Rule 9 \u2014 Inventory Count (Cross-Reference Only)',
    description: 'Inventory Count is a cross-reference / audit column only \u2014 it never updates Shop Inventory. Use it during a physical stock take to record your counted quantities and compare them against the Shop Inventory column. Stock is only moved by POS sales, invoice deductions (Rule 3), or manual edits on the product. The last stock-take date is shown above the Inventory Count column header. Mouse wheel scrolling is disabled on count inputs to prevent accidental changes \u2014 use the up/down arrows or type directly. Values autosave 1.5 seconds after the last keystroke.',
    active: true,
    appliesTo: ['Inventory Page'],
    category: 'Inventory',
  },
  {
    id: 'button_alignment',
    name: 'Rule 10 \u2014 Button Alignment in Page Editor',
    description: 'Enables the Left / Center / Right alignment control for Button elements in the Page Editor. When ON: each button element can be independently aligned using the Alignment picker in the properties panel (right sidebar). When OFF: buttons default to center-aligned. This rule is always enforced \u2014 the alignment picker is visible in the editor regardless, but this rule documents the feature and allows it to be toggled for new defaults.',
    active: true,
    appliesTo: ['Page Editor'],
    category: 'Elements',
  },
  {
    id: 'worksheet_wholesale_sync',
    name: 'Rule 12 \u2014 Worksheet Wholesale Price \u2192 Inventory & Product Sync',
    description: 'Wholesale Price on the Worksheet is always shown in the supplier\u2019s selected currency (e.g. EUR for Sideways, USD for US suppliers). Every time a Worksheet is saved, Update Costing is run, or Send to Inventory is triggered, the Wholesale Price for each line item is automatically written to the Inventory pricelist \u2014 the Inventory page \u2018Wholesale (EUR/USD)\u2019 column always reflects the exact wholesale price from the Worksheet, not a calculated ZAR value. The Wholesale Price also reflects on the Price (Rand) card on the Product add and edit pages in the admin \u2014 it is used for cost calculations (Landed, Final Landed, Landed Retail). Wholesale Price is strictly an internal/admin field and is NEVER shown on the customer-facing website or any public product page. Applies per supplier: the supplier selected on the Worksheet determines which pricelist and product rows are updated.',
    active: true,
    appliesTo: ['Worksheet', 'Inventory', 'Products'],
    category: 'Inventory',
  },
  {
    id: 'product_grid_show_stock',
    name: 'Rule 11 \u2014 Show Stock Quantity in Product Grid',
    description: 'Displays the available stock quantity beneath the price on each product card in the online store Product Grid. When ON: products show a green \u201cX in stock\u201d label (or a gray \u201cOut of stock\u201d label when qty is 0). Pre-order products are excluded \u2014 they never show a stock count. When OFF: stock counts are hidden and only the price is shown.',
    active: true,
    appliesTo: ['Online Store', 'Page Editor'],
    category: 'Online Store',
  },
  {
    id: 'preorder_checkout_separation',
    name: 'Rule 8 \u2014 In-Stock vs Pre-Order Checkout Routing',
    description: 'Separates the checkout flow for in-stock items and pre-order items in the online store. In-stock items route to /checkout. Pre-order items route to /book. Mixed cart: both buttons shown with a notice to checkout separately. This ensures pre-order bookings are handled through the booking form while in-stock purchases go through standard checkout.',
    active: true,
    appliesTo: ['Online Store', 'Cart'],
    category: 'System',
  },
  {
    id: 'header_sticky_top',
    name: 'Rule 17 \u2014 Header Always Locked to Top of Page',
    description: 'The website header (navigation bar) is permanently locked to the top of the viewport using CSS sticky positioning. As the user scrolls down any page, the header remains visible at the top at all times. Implemented via sticky top-0 z-50 on the header element. The sticky behaviour is controlled by the sticky flag in the header config (Admin \u2192 Settings \u2192 Site Settings \u2192 Header). Default is always ON. Applies to all customer-facing pages that use the DynamicHeader component (Content and Store layouts). The admin layout uses its own fixed sidebar and is not affected.',
    active: true,
    appliesTo: ['Online Store', 'All Pages'],
    category: 'System',
  },
  {
    id: 'reports_column_sort',
    name: 'Rule 16 \u2014 Column Sort (Sales Reports + Products)',
    description: 'Clickable column sort applies to two admin pages. (1) Sales Reports: SKU column sorts A\u2192Z / Z\u2192A; overrides the Sort dropdown when active. (2) Products: all column headers are sortable \u2014 SKU, Product, Category (Brand), Item Categories (Unit), Price, ETA, Qty, Status. The Item Categories (Unit) column is labelled "Unit" in the table header (Sage terminology) and sorts alphabetically by the first unit value. Sort direction toggles on each click (\u2191 \u2193). The \u2195 icon indicates no active sort.',
    active: true,
    appliesTo: ['Sales Reports', 'Products'],
    category: 'System',
  },
  {
    id: 'worksheet_tracking_url',
    name: 'Rule 16 \u2014 Worksheet Tracking URL',
    description: 'URL template used to turn a tracking number on the Worksheet into a clickable link. Use {tracking} as the placeholder for the tracking number — e.g. https://www.fedex.com/fedextrack/?trknbr={tracking}. If the tracking field already contains a full URL (starts with http) it is used as-is. Leave value blank to disable link generation for bare tracking numbers.',
    active: true,
    appliesTo: ['Worksheet'],
    value: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
    category: 'Inventory',
  },
  {
    id: 'products_supplier_filter',
    name: 'Rule 15 \u2014 Products Page Supplier Filter',
    description: 'A Supplier dropdown on the Products page filters the product list to show only items belonging to the selected supplier. The supplier-to-SKU mapping is sourced from the inventory pricelist (written by worksheets via Send to Inventory). Flow: Products page loads \u2192 fetches all suppliers and inventory pricelist entries \u2192 Supplier dropdown appears in the filter bar \u2192 select a supplier \u2192 only products whose SKU appears in that supplier\u2019s pricelist are shown. Selecting \u201cAll Suppliers\u201d removes the filter. The supplier filter combines with existing search, brand, category, and Revo filters. Products not yet assigned to any supplier via a worksheet will not appear under any supplier filter \u2014 they are visible under All Suppliers only.',
    active: true,
    appliesTo: ['Products'],
    category: 'Inventory',
  },
  {
    id: 'worksheet_csv_export',
    name: 'Rule 14 \u2014 Worksheet CSV Export',
    description: 'Defines the columns included when exporting a Worksheet to CSV. Exported columns: #, SKU, Description, Retail (ZAR) \u2014 the saved retail price from the Products database, In Stock \u2014 current inventory quantity, Unit, Category, Qty (order quantity), Wholesale (supplier currency), Landed (ZAR) \u2014 wholesale \u00d7 exchange rate, Calc Retail (ZAR) \u2014 landed \u00d7 markup \u00d7 VAT, Final Landed (ZAR), Landed Retail (ZAR), Total (supplier currency). The TOTAL row at the bottom shows grand total in supplier currency and ZAR equivalent. File is named worksheet-{supplier}-{date}.csv.',
    active: true,
    appliesTo: ['Worksheet'],
    category: 'Inventory',
  },
  {
    id: 'event_sku_drill_down',
    name: 'Rule 13 \u2014 Event SKU Invoice Drill-down',
    description: 'When ON: clicking any SKU in the Events sales table opens a popup showing every invoice that included that product during the event period \u2014 date, client, quantity, unit price, and line total. Also shows the current stock quantity for that SKU so you can immediately see how much is left after the event. When OFF: SKUs are plain text with no drill-down.',
    active: true,
    appliesTo: ['Events', 'Admin Invoices', 'Inventory'],
    category: 'Invoices',
  },
  {
    id: 'invoice_price_type',
    name: 'Rule 6 \u2014 Invoice Default Price Type',
    description: 'Sets the default price type applied when adding products to an invoice. Choose between Retail, Cost, or Pre-Order as the default. Can be overridden per-invoice using the Retail | Cost | Pre-Order selector in the Line Items header. Per-row quick-switch buttons also appear under each line item showing all available prices. Products without a Pre-Order price configured will fall back to Retail when Pre-Order mode is selected.',
    active: true,
    appliesTo: ['Admin Invoices'],
    value: 'retail',
    options: [
      { label: 'Retail Price', value: 'retail' },
      { label: 'Cost Price', value: 'cost' },
      { label: 'Pre-Order Price', value: 'preorder' },
    ],
    category: 'Invoices',
  },
  {
    id: 'so_renumber_format',
    name: 'Rule 19 — Sales Order Numbering & Master PDF Format',
    description: 'Sales Orders are numbered in the format SO001, SO002, SO003… in chronological order (oldest = SO001). New Sales Orders auto-generate the next SO number. Use the "Renumber SO" button on the Sales Orders tab to re-sequence all existing SOs by date. PDF format (Download, Print, Email): matches the modal preview — brand image block shown below the header, white background on Subtotal/Discount rows with grey text, red Discount text, dark (#1f2937) TOTAL row with white text. The old blue autotable footer background is removed. Applies to all document output types: Print, Print & Email, Email, Download.',
    active: true,
    appliesTo: ['Sales Orders', 'Admin Orders'],
    category: 'Orders',
  },
  {
    id: 'product_wholesale_price_display',
    name: 'Rule 20 — Supplier Wholesale Price on Product Pages',
    description: 'Displays the Wholesale Price from the Inventory Pricelist next to the Supplier field on both Add and Edit Product pages. The price shown is the value stored via the Worksheet (Send to Inventory) for the current SKU + Supplier combination. Currency is determined by the supplier\'s Preferred Currency setting (e.g. Sideways = EUR shown as €, USD suppliers shown as $). If no pricelist entry exists for the SKU, the field shows "Not in pricelist". The field is read-only — it reflects the pricelist and is updated via the Worksheet.',
    active: true,
    appliesTo: ['Products', 'Inventory', 'Worksheet'],
    category: 'Inventory',
  },
  {
    id: 'packing_list_autosave',
    name: 'Rule 21 — Packing List Cell Autosave',
    description: 'Every cell edit on the Packing List page (/admin/shipments) is saved automatically — no Save button required. Flow: click any cell to edit → type or select a value → changes are written to the database immediately on blur or dropdown select. Applies to all editable columns: Account, Name, Invoice, Wix Ref, Status, Instructions, Box Size, Tracking Number, Send Via, Notes. The footer hint "Click any cell to edit — changes auto-save" is always shown to remind users that no manual save is needed.',
    active: true,
    appliesTo: ['Packing List', 'Shipping Network'],
    category: 'Shipping',
  },
  {
    id: 'hover_tooltips',
    name: 'Rule 22 — Hover Tooltip Icons',
    description: 'Status and action icons across the admin show a descriptive tooltip on hover. Examples: the shipping box icon under an invoice status shows "Sent to Packing List", payment method badges show the method name, and action icon buttons show their function. Tooltips are rendered as native HTML title attributes — no extra UI elements are added. When ON: all tooltip-enabled icons are active. When OFF: icons remain visible but no tooltip text appears on hover.',
    active: true,
    appliesTo: ['Admin Invoices', 'Orders', 'Packing List', 'Admin'],
    category: 'Admin UI',
  },
  {
    id: 'columns_media_library',
    name: 'Rule 23 — Columns Component: Media Library Image Picker',
    description: 'Enables the Media Library image picker inside the page editor Columns component. When ON: each column in the Columns block shows a "Choose from Media Library" button (empty state) and a "Library" button on hover (when an image is already set). Clicking either opens the full Media Library modal — browse, search by name, filter by folder, or upload a new image directly from the picker. Selecting an image sets it as the column image. When OFF: the Library button is hidden and only direct file upload is available. The media library fetches all images from /api/admin/media (media_files table). Applies to the Columns element in the Page Editor.',
    active: true,
    appliesTo: ['Page Editor', 'Columns', 'Media Library'],
    category: 'Page Editor',
  },
  {
    id: 'item_categories_unit',
    name: 'Rule 27 — Item Categories (Unit): Import Mapping & Display',
    description: 'Governs two behaviours for the Item Categories (Unit) field on Products. (1) CSV Import mapping: the field is read from column headers in priority order — "item categories (unit)" (exported header), "item categories", "unit", "type". Previously only "unit" and "type" were checked, so re-importing an exported CSV would silently skip the field. Fix applied Apr 2026 across all 6 import profiles (generic, NSR, Revo, BRM, Pioneer, Sideways). (2) Display: Item Categories (Unit) badges in the products table are always rendered as plain grey tags — no hyperlinks. Previously, if a category name matched a page category with a URL it would render as a blue link, which was incorrect for unit-type values like Bushing, Bushings, Slot Car.',
    active: true,
    appliesTo: ['Products', 'Import'],
    category: 'Products',
  },
  {
    id: 'inventory_shop_inventory_unlock',
    name: 'Rule 26 — Inventory: Shop Inventory Unlock Editing',
    description: 'Adds a padlock toggle to the Shop Inventory column header on the Inventory page (both supplier mode and base mode). When locked (default): the Shop Inventory column shows the actual stock quantity as a read-only value. When unlocked: each row shows an editable input (blue-tinted) allowing manual stock correction. Changes are saved when the Save button is clicked — the updated quantity is written to the products table via PUT /api/admin/products/{id}. Row highlight: if the Inventory Count value for a row does not match the Shop Inventory quantity, the entire row is highlighted red and the Shop Inventory value is shown in red text — this flags a stock discrepancy between the physical count and the system record.',
    active: true,
    appliesTo: ['Inventory', 'Products'],
    category: 'Inventory',
  },
  {
    id: 'product_grid_auto_rows',
    name: 'Rule 25 — Product Grid: Auto-Expand Rows',
    description: 'The Product Grid component on live pages automatically shows ALL matching active products — there is no "Rows to Show" cap. As new products are added and assigned to a page or category, they appear in the grid immediately on the next page load without any editor changes required. The grid respects the columns setting (Desktop / Tablet / Mobile), the Category filter, and the Image Fit / Card Size / Gap / Padding settings. The "Rows to Show" field has been removed from the editor; the grid grows vertically to accommodate every product that matches the current filter. In the page editor, the preview shows a fixed 2-row placeholder to indicate the layout. Category Filter list in the Settings tab is automatically sorted A→Z so categories are easy to find.',
    active: true,
    appliesTo: ['Page Editor', 'Product Grid', 'Online Store'],
    category: 'Page Editor',
  },
  {
    id: 'export_supplier_csv',
    name: 'Rule 24 — Export Supplier CSV Format',
    description: 'Controls the column set exported by the "Export Supplier" button on the Products page. Current columns (Apr 2026): Code, Description, Brand, Category (Brand), Item Categories (Unit), Categories, Price (Retail), Average Cost, Cost Per Item, Pre Order Price, Barcode, Supplier, Car Class, Sales Account, Purchases Account. Qty (stock quantity) is intentionally excluded from the supplier export — it is an internal inventory figure not relevant to supplier ordering. Filename format: supplier-{supplier-name}-products-{date}.csv. The export respects the active supplier filter so you can export per-supplier by selecting a supplier first.',
    active: true,
    appliesTo: ['Products', 'Export'],
    category: 'Products',
  },
  {
    id: 'columns_per_viewport',
    name: 'Rule 34 \u2014 Columns Element: Per-Viewport Column Count',
    description: 'The Columns element supports independent column counts for Desktop, Tablet, and Mobile viewports. Desktop sets the actual number of child columns (1\u20134). Tablet inherits the desktop value if not explicitly set. Mobile defaults to min(2, desktop) if not set. Each setting is saved independently \u2014 changing mobile columns never affects the desktop layout. The renderer injects a scoped CSS \u003cstyle\u003e block with @media queries so the grid collapses correctly on real devices without relying on Tailwind breakpoint classes. Use Case: a 4-column desktop grid can show 2 columns on mobile (2\u00d72 layout) or 1 column (stacked) without any change to the desktop view. Applies to the Columns element in the Page Editor.',
    active: true,
    appliesTo: ['Page Editor', 'Columns', 'Online Store'],
    category: 'Page Editor',
  },
  {
    id: 'product_grid_mobile_cols',
    name: 'Rule 33 \u2014 Product Grid: Mobile = 1 Column',
    description: 'Forces all Product Grid elements across every page to display 1 column on mobile devices. On desktop, the grid uses its configured column count (e.g. 3 or 4). On tablet, it inherits the desktop value unless overridden. On mobile, this rule locks the column count to 1 so products stack in a single column and are not squeezed into multiple columns on small screens. Use the "Apply to All Pages" button to immediately update every Product Grid on every published and draft page. The setting is saved directly to each page\'s component data — no further page editing is required.',
    active: true,
    appliesTo: ['Page Editor', 'Product Grid', 'Online Store'],
    category: 'Page Editor',
  },
  {
    id: 'hero_image_display',
    name: 'Rule 29 — Hero Element: Full-Width Image Display',
    description: 'Hero elements are always rendered full-width (no left/right padding or auto margins) — they bleed edge-to-edge on every screen size. Image Display modes: Fill (cover — crops edges to fill canvas), Fit All (contain — shows complete image), Stretch (100%×100% — distorts to exact canvas size). Image Position: 3×3 grid (top-left to bottom-right) controls background-position. Height is set in px (desktop); on mobile/tablet the browser scales proportionally. The Layout Mode panel (Flow/Freeform) has been removed from Hero — it was non-functional. Text content (title/subtitle/buttons) is stacked and respects the Alignment setting (Left/Center/Right) in the Style tab.',
    active: true,
    appliesTo: ['Pages', 'Editor', 'Hero'],
    category: 'Editor',
  },
  {
    id: 'quote_auto_archive',
    name: 'Rule 28 — Quote Auto-Archive on Conversion',
    description: `When a Quote is converted to a Sales Order or Invoice via "Send to Sales Order" or "Send to Invoice" in the Actions menu: (1) The original Quote is automatically archived - it moves out of the active Quotes list and into the Archive. (2) The resulting Sales Order or Invoice stores the source Quote number as "sourceQuoteNumber". This reference is displayed on the document header as "Quote Ref: Q-XXXX", in the PDF, and as a small label under the document number in the Orders table. This creates a complete audit trail from Quote to Sales Order / Invoice. (3) Consolidating several Quotes onto ONE Invoice keeps that trail complete: each further Quote merged in via "Send to Invoice > Add to Existing" (Orders) or the Pre-Order Dashboard Send-to dropdown APPENDS its number to sourceQuoteNumber, so "Quote Ref:" reads "QR66126, QR66100, QR66131" rather than naming only the Quote that created the Invoice. (4) Every payment carried across from a Quote (Rule 50(1)) is stamped in its notes with "From Quote QR66xxx" on ALL carry-over paths - convert-to-new-Invoice and add-to-existing alike - so the Payments list on a consolidated Invoice shows which Quote each deposit came from. The stamp is applied once and is never duplicated by a re-merge.`,
    active: true,
    appliesTo: ['Orders', 'Quotes'],
    category: 'Orders',
  },
  {
    id: 'site_orders_stock_deduction',
    name: 'Rule 31 \u2014 Site Orders: Stock Deducted at Checkout',
    description: 'When a customer places an order on the website via /checkout, stock is immediately deducted from the product inventory at the time of order submission. This means Site Orders arrive in /admin/site-orders with stock already deducted. When you click "Send to Invoice" on a Site Order, the resulting invoice is created with stockDeducted=true so that the stock is NOT deducted a second time. Flow: Customer submits order \u2192 stock deducted immediately \u2192 order saved to data/checkout-orders.json \u2192 appears in Site Orders admin \u2192 "Send to Invoice" creates invoice (no re-deduction) \u2192 order status changes to Invoiced with invoice reference.',
    active: true,
    appliesTo: ['Online Store', 'Admin Invoices', 'Products'],
    category: 'Inventory',
  },
  {
    id: 'auto_preorder_on_oos',
    name: 'Rule 30 \u2014 Sold Out at Zero Stock (Pre-Order is Manual)',
    description: 'When a product\'s stock quantity reaches 0 (via invoice deduction, site checkout, POS sale, or direct inventory edit) the storefront shows it as Sold Out: QTY reads 0, the Add to Cart button is disabled, and it cannot be purchased. Selling out NEVER converts a product to Pre-Order. The Pre-Order flag is owned by the product record and is only ever set deliberately \u2014 it is not derived from the stock level, and restoring stock no longer clears it. Pre Order / Book Now is reserved for products genuinely offered as pre-orders \u2014 those show a "Book Now" button and route through /book instead of /checkout. IMPORTANT — Pre-Order checkout goes to Back Orders, NOT Invoices: when a customer books via /book, the submission is saved directly to the Back Orders list (/admin/backorders) so you can manage it like any other backorder (quote → sales order → invoice once stock arrives). You cannot invoice a client for stock you do not have — pre-orders sit in Back Orders until stock is received, then follow the normal fulfilment flow.',
    active: true,
    appliesTo: ['Online Store', 'Admin Invoices', 'Sales Orders', 'POS / Scanner', 'Products'],
    category: 'Inventory',
  },
  {
    id: 'sku_stats_include_archived',
    name: 'Rule 32 \u2014 SKU Sales History Includes Archived Invoices',
    description: 'When viewing the SKU Stats popup on the Inventory page (click any SKU), the Sales History table includes ALL invoices for that SKU \u2014 both active and archived. Archived invoices represent completed or cancelled sales that have been filed away from the main Orders view, but they are still part of the full sales record. Including them ensures the Total Units Sold, Total Revenue, and Invoice Count figures are accurate for the entire lifetime of the product. Flow: click SKU in Inventory \u2192 popup opens \u2192 GET /api/admin/products/sku-stats?sku= \u2192 all invoices (regardless of status) are scanned \u2192 Sales History table shows INV0001 onwards. This rule is always enforced \u2014 archived invoice data is never excluded from historical reporting.',
    active: true,
    appliesTo: ['Inventory', 'Admin Invoices', 'Sales Reports'],
    category: 'Invoices',
  },
  {
    id: 'sku_on_documents',
    name: 'Rule 38 — SKU Shown on All Documents',
    description: 'All Quotes, Sales Orders, and Invoices must display the item SKU as a separate column alongside the description. The SKU is extracted from the line item description (format: "SKU – Description"). This applies to: the document preview modal, the printed/emailed HTML document, the jsPDF download, and the create/edit modal line items table. The SKU column appears in indigo monospace font. If a line item has no SKU prefix, a dash is shown.',
    active: true,
    appliesTo: ['Quotes', 'Sales Orders', 'Invoices', 'Admin Orders'],
    category: 'Invoices',
  },
  {
    id: 'booking_retail_price',
    name: 'Rule 37 — Booking Uses Retail Price',
    description: 'All "Book for Next Shipment" booking pages display and submit the retail price (product.price) — never the cost price, pre-order price, or wholesale price. This applies to the booking confirmation page (/book/product/[id]) and any booking form across the site. The price shown to the customer when booking must always match the retail price displayed on the product page.',
    active: true,
    appliesTo: ['Online Store', 'Bookings', 'Products'],
    category: 'Pricing',
  },
  {
    id: 'site_search_live_dropdown',
    name: 'Rule 36 — Site Search Live SKU Dropdown',
    description: 'When a customer types in any site search bar (header search, /products page), results appear instantly as a live dropdown. Each result shows: product thumbnail, SKU (indigo mono), brand, title, price, and an orange "NEXT SHIPMENT" badge for pre-order items. Clicking a result navigates directly to the product page. If exactly one result matches, pressing Enter navigates directly. If 8+ results exist, a "See all results" link appears. This behaviour applies to the header search overlay and the /products page search bar.',
    active: true,
    appliesTo: ['Online Store', 'Header', 'Products Page'],
    category: 'Search',
  },
  {
    id: 'product_archive',
    name: 'Rule 35 — Product Archive',
    description: 'When a product is set to "Archived" status it is permanently removed from the website storefront, the Inventory page, all SKU dropdowns (Backorders, Worksheet, Orders), and any product grids. Archived products are not deleted — they are stored in a separate Product Archive (/admin/products/archive) where they can be viewed and unarchived if the supplier restocks the item in future. Use archiving when an item is discontinued or no longer available from the supplier. Archived products do NOT appear in stock counts, sales reports SKU lists, or any customer-facing page. To unarchive: go to /admin/products/archive → find the product → click Unarchive → set status back to Draft or Active.',
    active: true,
    appliesTo: ['Products', 'Inventory', 'Online Store', 'Back Orders', 'Worksheet'],
    category: 'Products',
  },
  {
    id: 'media_editor',
    name: 'Rule 39 — Media Library Image Editor',
    description: 'Enables the Image Editor panel inside the Media Library (/admin/media). When ON: every image in the library shows an Edit button (hover overlay on grid, inline on list view). Clicking Edit opens a slide-in drawer with: full image preview + pixel dimensions, a link to the Photo Editor (/admin/photo-editor), aspect ratio crop presets (Original / 1:1 / 4:3 / 16:9) using canvas center-crop, custom pixel size inputs (width × height), Apply & Save (canvas crop → upload to R2 → new URL), Where Used scanner (scans Products + Pages and lists every location this image appears), and Sync to Website button (POST /api/admin/media/sync) which replaces the old URL with the new URL across all products (imageUrl + images array) and all pages (components JSONB) simultaneously. Multi-select: when multiple files are selected the toolbar shows a batch Edit Image button. The sync ensures that a single crop/resize operation immediately updates every product image and page component that references the original URL — no manual re-assignment required.',
    active: true,
    appliesTo: ['Media Library', 'Products', 'Pages'],
    category: 'Admin UI',
  },
  {
    id: 'category_box_two_line',
    name: 'Rule 18 — Category Box Two-Line Text Display',
    description: 'Category cards on the Categories admin page display the full category name across up to two lines. Previously, long names were truncated with an ellipsis (…) making them unreadable. With this rule active: the label area at the bottom of each card grows to accommodate two lines of text — no name is cut off. Card image height is set to h-28 to compensate. Applies to the Categories grid at /admin/categories.',
    active: true,
    appliesTo: ['Categories'],
    category: 'Admin UI',
  },
  {
    id: 'element_background_image',
    name: 'Rule 40 — Page Elements: Background Image',
    description: 'Enables a Background Image on three Page Editor elements: Content Block, Columns, and Divider/Rule. Each element\'s properties panel shows a "Background Image" section below the existing settings. Controls: Background Image (pick from Media Library or upload directly), Image Fit (Cover — fills and crops, Contain — shows full image, Stretch, Original size), Image Position (9 presets: Centre, Top, Bottom, Left, Right, and all four corners), Dark Overlay slider (0–100%) — a transparent black layer placed above the background image and below the content, ensuring text remains readable over busy photos. The overlay is a position:absolute div; the content is positioned above it via z-index. All three elements use position:relative on the outer container when a background image is set, so the overlay clips correctly to the element bounds (including any border-radius). Applies to: Content Block, Columns, and Divider/Rule elements in the Page Editor.',
    active: true,
    appliesTo: ['Page Editor', 'Content Block', 'Columns', 'Divider'],
    category: 'Page Editor',
  },
  {
    id: 'item_category_brand',
    name: 'Rule 41 — Item Category (Brand)',
    description: 'Defines how Category (Brand) is used across the system. Category (Brand) is the Sage accounting category linked to a product\'s brand name (e.g. NSR, Carrera, Slot.it). It maps directly to the Sage Category field in CSV exports. In the Worksheet "Update Product Information" modal, selecting a Category (Brand) automatically auto-fills the Sage Sales Account and Sage Purchase Account for that product row — these mappings are configured via the "Brand Accounts" button in the modal header. Category (Brand) is stored in the products table as the categoryBrands JSONB column and appears in the Sage Accounts card on the Edit Product page.',
    active: true,
    appliesTo: ['Worksheet', 'Products', 'Sage Accounts', 'CSV Export'],
    category: 'Products',
  },
  {
    id: 'header_typography',
    name: 'Rule 43 — Header Typography & Fonts',
    description: 'Full font customisation for the site header navigation. Settings are configured in Edit Header → Typography card. Nav Font Family: choose from 21 fonts including system defaults (System Default, Arial, Georgia), Google Sans-Serif fonts (Inter, Roboto, Open Sans, Lato, Montserrat, Poppins, Nunito, Raleway, Work Sans, Oswald), Serif fonts (Playfair Display, Merriweather, Lora), and Display/Handwritten fonts (Bebas Neue, Anton, Dancing Script, Pacifico, Lobster). Google Fonts are loaded on-demand via the Google Fonts API (display=swap). Font Size: 10–32px slider (default 14px). Font Weight: Regular (400), Medium (500), Semi-Bold (600), Bold (700). Hover Color: any color picker value (default brand red #ef4444). Hover Effect: Color Change (text switches to hover color), Underline (colored underline), Background (translucent highlight behind link), Bold (text weight becomes 700 + hover color). All settings stored in the header object in site-settings.json under navFontFamily, navFontSize, navFontWeight, navHoverColor, navHoverEffect. Applied to all desktop nav links, mobile nav links, and the Editor link if admin is logged in.',
    active: true,
    appliesTo: ['Header', 'Navigation', 'Typography'],
    category: 'Header',
  },
  {
    id: 'item_category_unit',
    name: 'Rule 42 — Item Category (Unit)',
    description: 'Defines how Item Category (Unit) is used across the system. Item Category (Unit) is the Sage item category that represents the product\'s unit type (e.g. Accessories, Axle, Body Kit, Brushings, Controllers, Decals, Gear). It maps to the Sage Unit field in CSV exports. In the Worksheet "Update Product Information" modal, the Item Category (Unit) column is populated from the inventory item categories list — the same options available on the Products admin page under Sage Accounts → Item Categories (Unit). Selecting an item category here updates the product\'s itemCategories JSONB column. On the Products admin Edit page, Item Categories (Unit) appears in the Sage Accounts card.',
    active: true,
    appliesTo: ['Worksheet', 'Products', 'Sage Accounts', 'CSV Export'],
    category: 'Products',
  },
  {
    id: 'preorder_dashboard_image_upload',
    name: 'Rule 43 — Pre-Order Dashboard: Image Upload',
    description: 'Controls image upload behaviour on the Pre-Order Dashboard cards. Three methods are supported: (1) Click the image zone to open a file browser. (2) Hover over the image zone and press Ctrl+V to paste an image from clipboard. (3) Drag an image file or URL from anywhere and drop it onto the image zone. Size toggle (S / M / L) appears on hover to resize the image zone — S = compact (144px), M = medium (208px), L = large (288px). Hover over an existing image to reveal Replace and Remove buttons.',
    active: true,
    appliesTo: ['Pre-Order Dashboard'],
    category: 'Admin UI',
  },
  {
    id: 'payments_record_payment_only',
    name: 'Rule 44 — Payments Recorded via Record Payment Only',
    description: `All payments against an invoice are captured exclusively through the Record Payment action (Orders → invoice row → Actions → Record Payment). Each submission is appended to the invoice's payments[] history array (date, amount, method, reference) and the invoice's amountPaid, creditApplied and overpaymentCredit fields are updated cumulatively — never overwritten. No other flow (Create Invoice, Edit Invoice, line-item changes, PATCH from other pages) writes to amountPaid. Flow: open Record Payment → enter amount/method/reference → save → payment appended to history → amountPaid recalculated as the sum of all payments + credit applied. The invoice list, invoice detail/print view, and the customer's Order History page all read from this single source of truth to show the Balance Due / Outstanding amount (red "Due R..." badge) or a green "Paid" badge once the outstanding balance reaches zero. The Payment Method / Amount / Payment Method 2 / Amount fields have been removed from the Create/Edit Quote, Sales Order and Invoice form — these documents no longer capture or display payment information; Status is the only field remaining in that row. Payment recording happens solely after the fact via Record Payment.`,
    active: true,
    appliesTo: ['Admin Invoices', 'Customer Payments', 'Customer Account'],
    category: 'Invoices',
  },
  {
    id: 'payments_carry_over_and_consistent_output',
    name: 'Rule 45 — Payments Carry Over on Conversion & Match Across View/Print/Download/Email',
    description: `(1) Carry-over on conversion: when a Quote is converted to a Sales Order or Invoice ("Send to Invoice" / "Send to Sales Order"), any amountPaid, creditApplied, overpaymentCredit, payments[] history and depositPaid already recorded against the source Quote (via Record Payment) are copied onto the new document so deposits/payments taken on the quote are immediately reflected — they are never lost or re-requested. (2) No manual deposit/payment entry: the Create/Edit Quote, Sales Order and Invoice modal has no manual "Deposit Paid" or payment-amount input for standard documents — Amount Paid, Credit Applied and Balance Due are read-only, sourced entirely from Record Payment (Rule 44). The only exception is Pre-Order Deposit quotes (preOrderDeposit flag), where the deposit amount is auto-computed from Deposit % — that feature is unrelated and untouched. (3) Consistent output everywhere: the View modal, Print, Print & Email, Email, and Download (PDF) for a document must all show the same Amount Paid, Credit Applied and Balance Due (or omit them and show "PAID IN FULL" / no balance row when fully settled) — computed from the same fields (amountPaid, creditApplied, depositPaid) using the same "whichever is larger of amountPaid/depositPaid, plus creditApplied" rule to avoid double-counting a deposit that has since been folded into amountPaid via Record Payment. If a future field is added to the totals block, it must be added to all four output paths (generateDocHTML for view/print, doEmail, doDownload/PDF, and the React preview) — not just one.`,
    active: true,
    appliesTo: ['Admin Invoices', 'Customer Payments', 'Customer Account'],
    category: 'Invoices',
  },
  {
    id: 'document_totals_block_order',
    name: 'Rule 46 — Document Totals Block: Fixed Row Order & Colours',
    description: `Every Quote, Sales Order and Invoice — including Pre-Order Deposit quotes — renders one single totals block in this fixed order: Subtotal, Discount, Shipping, TOTAL, Deposit to Pay / Deposit Paid, Credit Applied, the individual payment lines, Amount Paid, BALANCE ON ARRIVAL / BALANCE DUE. When more than one payment has been recorded, each payment is itemised on its own indented line (date · method, negative amount) directly above the Amount Paid row, which continues to show the cumulative total — a single payment is not itemised because it repeats the Amount Paid row. The deposit row always sits between TOTAL and the balance row — never below the balance. Colours are fixed: TOTAL is a dark navy bar (#1f2937) with white bold text, the deposit row is a RED bar (#dc2626) with white bold text, and the balance row is an orange bar (#ea580c) with white bold text. Pre-Order Deposit docs have no separate layout — the only thing that differs is the document title ("PRE ORDER DEPOSIT") and that the deposit amount is auto-computed from Deposit % rather than entered. There are no "Full Order Total", "DEPOSIT DUE", "% Deposit Payable", "BALANCE ON DELIVERY" or "BALANCE DUE ON ARRIVAL" variants. Rows are omitted when their value is zero. Per Rule 45(3) this block must be identical across all four output paths — the React preview (DocumentBody), Print / View (generateDocHTML), Email (doEmail) and Download PDF (jsPDF footRows + didParseCell) — so any change to the order or colours must be made in all four.`,
    active: true,
    appliesTo: ['Admin Invoices', 'Admin Quotes', 'Admin Sales Orders'],
    category: 'Invoices',
  },
  {
    id: 'petty_cash_cash_book',
    name: 'Rule 47 — Petty Cash: Cash Book & Running Balance',
    description: `Accounting → 💵 Petty Cash is a cash book for controlling the physical cash float, stored in the data/petty-cash.json blob via /api/admin/petty-cash (GET list newest-first, POST add, PATCH edit, DELETE ?id=…). Every entry is { date, type: 'in' | 'out', description, category, reference, amount } and the amount is ALWAYS stored positive — direction lives only in the type field, so a sign error can never corrupt the balance. Cash In records money put into the tin (float top-ups, cash banked to the float); Cash Out records money taken out (fuel, courier, refreshments, stationery, parking, staff, banking, etc.). Balance on Hand = total Cash In − total Cash Out, and the card turns red with an "Overdrawn — float needs a top-up" note when it goes negative. The table is a proper cash book — Date, Description, Category, Reference/Received By, Cash In, Cash Out, running Balance — where the running balance is computed over EVERY entry in chronological order (date, then createdAt), never just the visible rows, so filtering by type or category still shows the true balance after each movement. The footer separately reports the net for the filtered view and the true balance on hand, so the two are never confused. Filters are All / Cash In / Cash Out plus a category dropdown that lists the ten defaults merged with any category already used by an existing entry. Entries are editable in place (the ✏ Edit button reloads the form) and deletable. Amounts are single-currency ZAR in the standard R1 000.00 spacing format. The tab has TWO views, toggled in the toolbar: 📒 Cash Book (everything above) and 🧾 Invoice Cash (Rule 48).`,
    active: true,
    appliesTo: ['Accounting', 'Petty Cash'],
    category: 'Payments & Credits',
  },
  {
    id: 'petty_cash_invoice_cash_import',
    name: 'Rule 48 — Petty Cash: Invoice Cash Payments & Booking',
    description: `Accounting → Petty Cash → 🧾 Invoice Cash lists every payment recorded against an invoice with Payment Type = Cash, and lets those payments be booked into the cash book. WHERE THE DATA COMES FROM: exactly the same fields the Orders list "Payment Type" column reads — payments[] is the source of truth per Rule 44 (an entry counts when its paymentMethod matches and amountPaid > 0.005), and the flat paymentMethod / paymentMethod2 pair is ONLY read for legacy docs that have no payment history at all. ARCHIVED INVOICES ARE INCLUDED — only cancelled ones are excluded. This differs deliberately from the Statistics tab: archiving is a filing action and does not un-receive the money, so excluding archived docs would hide most of the cash ever taken in. Archived rows carry an "archived" marker beside the invoice number. A method counts as cash when it matches /^cash\\b/i — so "Cash", "Cash Deposit" and "cash payment" all qualify, but "Cashback" does not. LEGACY SPLIT-PAYMENT GUARD: when method 1 is Cash but paymentMethod1Amount is blank, the full amountPaid is used ONLY if there is no second method — if a second method exists, the cash amount is treated as zero rather than booking the other method's money as cash. THE VIEW: four cards (Total Cash Received, Cash Payments count, Invoices count, Not Yet in Cash Book), a chip strip listing every distinct invoice number paid with cash, and a table of Date, Invoice #, Client, Payment Type, Amount and Cash Book status. Search is a From/To date range plus a text box matching invoice number or client name; the cards and footer always reflect the FILTERED view. BOOKING IS OPT-IN, never automatic — cash taken on an invoice does not necessarily go into the physical petty cash tin, so the operator decides. "↓ Book" books one payment; "↓ Book N to Cash Book" books every unbooked payment in the current filtered view. Booked payments become Cash In entries with category "Invoice Cash" and reference = the invoice number, so they flow into Balance on Hand. IDEMPOTENCY: every payment carries a sourceId (\`docId:paymentIndex\`, or \`docId:m1\`/\`docId:m2\` for legacy docs) which is stored on the petty cash entry. POST { action: 'import' } skips any sourceId already booked and reports { imported, skipped }; a single POST carrying a duplicate sourceId returns 409. The same cash therefore can NEVER be booked twice, however many times the button is pressed. Deleting an imported entry releases its sourceId so the payment can be booked again.`,
    active: true,
    appliesTo: ['Accounting', 'Petty Cash', 'Admin Invoices'],
    category: 'Payments & Credits',
  },
  {
    id: 'quote_to_supplier_order',
    name: 'Rule 49 — Quote → Supplier Order',
    description: `Quotes (and Pre Order Deposit quotes, which are Quotes) carry an "Add to Supplier Order" tick box directly beneath the Pre Order Deposit tick box. It exists ONLY on Quotes — Sales Orders and Invoices never show it, because a supplier order is raised to BUY stock, which happens before the customer document is committed. Ticking it reveals a Supplier dropdown (from data/supplier-network.json) and a choice of target: "Create New Supplier Order", which takes an editable name defaulting to "Supplier – DD/MM/YYYY", or "Add to Existing Supplier Order", which lists only that supplier's currently open orders with their line counts and is disabled when the supplier has none. Nothing is sent while the box is being configured — the push happens on Save, and Save is blocked with an error if no supplier is chosen or the quote has no line items. ON SAVE every line on the quote is POSTed to /api/admin/backorders carrying supplierId, supplierName, supplierOrderRef, supplierOrderName, the quote number and source 'quote-supplier-order'. PRICE: the line's cost price is used where it has one, falling back to the unit price — a supplier order is a purchasing document, so it must never carry retail. WHAT MAKES AN ORDER DISCRETE: backorder lines are grouped on /admin/suppliers by supplierName PLUS supplierOrderRef, so two orders raised for the same supplier stay separate accordions with their own names, Send to Worksheet and Download Order buttons. Legacy lines that carry no ref fall into that supplier's default unnamed order exactly as before, so nothing already in the system moves. NO DOUBLE SENDING: the quote is stamped supplierOrderSent once the lines land, the tick box locks and reads "✓ Sent to Supplier Orders", and re-saving or re-opening the quote will not push the lines again. If any line fails to post, the stamp is rolled back and the modal reports the failure instead of closing, so the send can be retried cleanly. DELETING AN ORDER: every supplier order accordion on /admin/suppliers carries a red Delete button next to Send to Worksheet and Download Order. It opens a confirm modal naming the order and its line count, and on confirm DELETEs /api/admin/suppliers/orders with a body of { ids, ref }. The ids are the backorder lines the accordion is currently showing, so exactly the lines on screen are removed and anything added since the page loaded is never caught. When the order carries a ref, supplierOrderSent / supplierOrderRef / supplierOrderName / supplierOrderSupplier are cleared on any quote stamped with it, so that quote can be sent to a supplier order again. Stock, pre-orders and customer documents are untouched. PRE-ORDER DASHBOARD SENDS: 'Send to Supplier Order' on /admin/preorder-dashboard/[supplier] stamps a fresh supplierOrderRef and a supplierOrderName of 'Supplier – DD/MM/YYYY' on every line it posts, so each send lands as its own discrete order rather than merging into the supplier's default group.`,
    active: true,
    appliesTo: ['Admin Quotes', 'Supplier Orders', 'Back Orders'],
    category: 'Orders',
  },
  {
    id: 'preorder_dashboard_doc_relink',
    name: 'Rule 51 — Pre-Order Dashboard: Cards Follow the Document',
    description: `A Quote covers every SKU the customer reserved, but on the Pre-Order Dashboard that is one customer entry per card, each carrying its own linkedDocId / linkedDocNumber and showing it as the chip beside Send to. WHEN A QUOTE IS CONVERTED, ALL OF ITS CARDS MOVE TOGETHER: sending a Quote to an Invoice from any card — "Add to Existing Invoice" or "Create New Invoice" — re-points every dashboard entry on that Quote to the resulting Invoice, not only the card whose dropdown was used. Otherwise the customer's other cards keep showing a Quote number for a Quote that has already been archived into the Invoice, while its lines sit on that Invoice. The relink runs server-side via /api/admin/preorder-dashboard/relink over the WHOLE blob, not just the supplier page on screen, because one Quote can span suppliers; entries are matched on linkedDocId and fall back to linkedDocNumber for entries saved before the id was stored. Cards already rendered are updated through a window event rather than a reload, so unsaved edits on other cards are not discarded. WHAT DOES NOT RELINK: adding a single card's line to an existing document is not a conversion — only that entry links. A Quote that is still open keeps its own number on every card; only an archived (converted) Quote resolves forward. RESOLVING HISTORIC LINKS: the forward pointer from a Quote to the Invoice that absorbed it is the Invoice's sourceQuoteNumber, which under Rule 28 names every Quote merged in, so a consolidated Invoice resolves all of its Quotes. Where one Quote number somehow appears on more than one Invoice the entry is left alone and reported rather than guessed at.`,
    active: true,
    appliesTo: ['Pre-Order Dashboard', 'Admin Quotes', 'Invoices'],
    category: 'Orders',
  },
  {
    id: 'site_order_invoice_reallocation',
    name: 'Rule 52 — Site Orders: Re-Allocate to a Different Invoice',
    description: `A Site Order stays re-pointable after it has been invoiced. The Send to Invoice button remains on the row once the order is Invoiced, where it reads "Change Invoice", and once it is Cancelled; only Archived orders lose it. The picker offers Create New Invoice or any of that client's open invoices EXCEPT the one the order already sits on. CHOOSING A TARGET MOVES THE ORDER: its line items are pulled off the invoice they were on and placed on the chosen one, and the order's invoiceRef is re-pointed. Lines raised from a Site Order are stamped with sourceOrderId so they can be found again; invoices raised before the stamp existed are matched on line description instead, one line per ordered item. A move always asks first — the picker opens even when the client has no other invoices — and names the invoice the lines are leaving. AN EMPTIED INVOICE IS BINNED: if the move leaves the old invoice with no lines and it has taken no money (no amountPaid, creditApplied, depositPaid or payment history) it is deleted to the Invoice Bin, where it can be restored. An invoice that HAS taken money is left in place, empty, to be dealt with by hand. The new invoice number is worked out before the detach, so a binned number is never reused. STOCK DOES NOT MOVE. Under Rule 31 a site order's stock is deducted at checkout and held by the ORDER, not by the invoice it happens to be attached to, so shuffling lines between invoices touches no inventory: these PATCHes carry skipStockAdjust (a request-only hint, never persisted) so the document layer leaves stock alone, and new invoices carry stockAlreadyReserved as before. This is also why "Add to Existing" no longer deducts on top of the checkout deduction. THE ONE EXCEPTION is an order that was Cancelled AND had its stock restored: invoicing it again has to take that stock back out. /api/checkout is PATCHed with deductStock, which re-checks availability first and refuses with a 409 naming the shortfall when the items have since been sold elsewhere, and the stock is handed straight back if the invoice then fails to create. The picker warns with a blue banner before this happens.`,
    active: true,
    appliesTo: ['Online Store', 'Admin Invoices'],
    category: 'Orders',
  },
  {
    id: 'customer_saved_addresses_to_contact',
    name: 'Rule 53 \u2014 Customer Saved Addresses vs the Contact Address',
    description: `A customer's address lives in TWO separate stores and they are deliberately not the same thing. (1) SAVED ADDRESSES — what the customer types into Account → Saved Addresses in their own back office. Stored in data/addresses.json, one row per address, keyed by customerId, using the field names address1, address2, city, state, zip, country, phone, isDefault. These are the customer's real physical addresses. (2) THE CONTACT ADDRESS — the single address on the contact record in data/contacts.json, fields addressStreet, addressCity, addressProvince, addressPostalCode, addressCountry. This is the address invoices, quotes, statements and the Contacts card autofill from. THE CONTACT ADDRESS IS OFTEN NOT A HOME ADDRESS. It is frequently the Courier Guy kiosk, PUDO locker or PostNet branch the admin captured to match the customer's delivery preference — a contact showing K2K with a Courier Guy branch as its street address is correct, not stale data. That is why the sync is FILL-ONLY AND NEVER OVERWRITES. src/lib/customer-address-sync.ts mirrors a customer's DEFAULT saved address onto their contact ONLY when the contact has no address at all; it runs from all three account address routes (POST /api/account/addresses, PUT and DELETE /api/account/addresses/[id], POST /api/account/addresses/[id]/default) and is non-fatal — the customer's address is already saved before it runs, so a failure there must never fail their request. Contacts are matched to customers by customerId first, then by email, which is how the rest of the app links the two stores. When the contact already has an address, the customer's saved addresses are instead shown READ-ONLY on the admin Contacts card under "Saved Addresses — entered by the customer" (fed by GET /api/admin/contact-addresses, admin-session gated), default first, each with a "Use" button. Pressing Use is the only path that overwrites the contact address — a human decides, never the code. An address already on the contact shows "✓ In use" instead of a button. PATCH /api/admin/contacts/[id] falls back to an email lookup and then creates the row, so Use also works on a virtual contact merged in from customers.json by GET. Before this rule, nothing on the admin side read data/addresses.json at all, so an address a customer entered themselves was invisible to admin forever.`,
    active: true,
    appliesTo: ['Admin', 'Customer Account', 'Contacts'],
    category: 'System',
  },
  {
    id: 'customer_preferred_shipping',
    name: 'Rule 54 \u2014 Customer Preferred Shipping',
    description: `The customer chooses how their orders ship, in their own back office at Account → Saved Addresses → Preferred Shipping, and that choice prints on the invoice. THERE ARE EXACTLY SIX OPTIONS and they live in ONE place — SHIPPING_OPTIONS in src/lib/shipping-options.ts. RAM — Door to Door; RAM — Door to PostNet; Courier Guy — Kiosk to Kiosk; Courier Guy — Door to Door (flagged "More expensive" to the customer); Courier Guy — Door to Door with Insurance; Courier Guy — Kiosk to Kiosk with Insurance. The customer picker, the admin Contacts card and the admin Edit Customer form all render that one array, so a label can never drift between what the customer chose and what prints on the invoice — never hard-code these strings anywhere else. BOTH KIOSK TO KIOSK OPTIONS REQUIRE A COURIER GUY BRANCH. requiresBranch is set on those two; a kiosk choice with no branch is refused by PUT /api/account/shipping-preference and by the admin Edit Customer form, and the customer picker holds the save until the branch is typed rather than saving a preference the invoice cannot use. shippingLabel(id, branch) is the single formatter: it returns the option label with the branch appended in brackets for kiosk options. Switching away from a kiosk option clears the stored branch so a stale one never prints. THE PICKER AUTOSAVES — there is no Save button. Choosing an option PUTs immediately; the branch field debounces 800ms. Storage is preferredShipping + courierGuyBranch on the customer record in data/customers.json, mirrored onto the contact in data/contacts.json by syncShippingPreferenceToContact. That mirror DOES overwrite, unlike the address sync in Rule 53, and deliberately: only the customer sets this field, so there is no admin-captured value to protect. Both fields must stay in the PATCH allowedFields whitelist in /api/admin/contacts/[id] or an admin edit saves and silently vanishes on reload. ON THE INVOICE: THESE SIX ARE NOT MENU ENTRIES IN THE SHIPPING DROPDOWN — that keeps its own Pudo / network courier / Collection / Other list. Selecting a client in the Create Invoice client autofill prefills the shipping method from their preference, but ONLY when no method has been chosen on that document yet — a method already set is never overwritten. Because the prefilled label is not one of the dropdown's own entries it is rendered as a single extra option, or the select would show blank. When the document differs from the client's preference a blue "Client prefers" row appears under the shipping line with the preference and a Use button, so the difference is visible rather than silent. From there it rides the existing shippingMethod field, which already prints on the invoice HTML, the emailed copy and the PDF. The preference is also shown on the admin Contacts card and is editable in the Edit Customer form for orders taken over the phone. Preferred Shipping is SEPARATE from the older Delivery Options tick boxes (deliveryDoorToDoor / deliveryKioskToKiosk / deliveryPudoLocker / deliveryPostnetAramex), which stay as they are — those are broad admin tags, this is the one specific method that prints.`,
    active: true,
    appliesTo: ['Customer Account', 'Admin Invoices', 'Contacts'],
    category: 'System',
  },
]

export async function GET() {
  try {
    const stored = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    // Merge in any new default rules not yet in the stored data
    const merged = DEFAULT_RULES.map((def) => {
      const found = stored.find((r) => r.id === def.id)
      if (!found) return def
      return {
        ...def,
        ...found,
        options: def.options,
        // Fall back to default category if stored rule has none
        category: found.category ?? def.category,
      }
    })
    // Sort by rule number (extract from name "Rule N — …")
    const getRuleNum = (name: string) => { const m = name.match(/Rule\s+(\d+)/i); return m ? parseInt(m[1], 10) : 999 }
    merged.sort((a, b) => getRuleNum(a.name) - getRuleNum(b.name))

    // Deduplicate by rule number — keep first occurrence if any duplicates crept in
    const seen = new Set<number>()
    const deduped = merged.filter((r) => {
      const n = getRuleNum(r.name)
      if (seen.has(n)) return false
      seen.add(n)
      return true
    })

    // Assign initial sortOrder per category if not yet set
    const catCounters: Record<string, number> = {}
    for (const rule of deduped) {
      const cat = rule.category || 'Uncategorized'
      if (rule.sortOrder === undefined || rule.sortOrder === null) {
        catCounters[cat] = catCounters[cat] ?? 0
        rule.sortOrder = catCounters[cat]++
      } else {
        catCounters[cat] = Math.max(catCounters[cat] ?? 0, rule.sortOrder + 1)
      }
    }

    // Write back if any new rules were added or sortOrders initialised
    const hasNew = DEFAULT_RULES.some((def) => !stored.find((r) => r.id === def.id))
    const needsSortInit = deduped.some((r) => stored.find((s) => s.id === r.id && s.sortOrder === undefined))
    if (hasNew || needsSortInit) await blobWrite(KEY, deduped)
    return NextResponse.json(deduped)
  } catch {
    return NextResponse.json(DEFAULT_RULES)
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const current = await blobRead<SiteRule[]>(KEY, DEFAULT_RULES)
    // Merge patches; preserve options from defaults
    const updated = DEFAULT_RULES.map((def) => {
      const stored = current.find((r) => r.id === def.id) || def
      const patch = body.find((b: any) => b.id === def.id)
      return patch
        ? { ...def, ...stored, ...patch, options: def.options }
        : { ...def, ...stored, options: def.options, category: stored.category ?? def.category }
    })
    await blobWrite(KEY, updated)
    return NextResponse.json(updated)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
