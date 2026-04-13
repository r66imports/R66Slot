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
    description: 'Prevent selling more items than what is available in stock. Quantity is capped at the current stock level. If stock is 0, the item cannot be added to an invoice or sold at POS.',
    active: false,
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
    description: 'When a Quote is converted to a Sales Order or Invoice via "Send to Sales Order" or "Send to Invoice" in the Actions menu: (1) The original Quote is automatically archived — it moves out of the active Quotes list and into the Archive. (2) The resulting Sales Order or Invoice stores the source Quote number as "sourceQuoteNumber". This reference is displayed on the document header as "Quote Ref: Q-XXXX", in the PDF, and as a small label under the document number in the Orders table. This creates a complete audit trail from Quote → Sales Order / Invoice.',
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
    name: 'Rule 30 \u2014 Auto Pre-Order When Out of Stock',
    description: 'When a product\'s stock quantity reaches 0 (via invoice deduction, POS sale, or direct inventory edit), it is automatically marked as Pre-Order so customers can still book ahead instead of seeing a dead "Out of Stock" button. When stock is later restored above 0, the Pre-Order flag is automatically cleared and the product returns to normal. Applies to: Invoice/SO stock deductions, Inventory Sync, and POS Sell mode. Pre-Order status means the product shows a "Book Now" button on the store and routes through /book instead of /checkout. IMPORTANT — Pre-Order checkout goes to Back Orders, NOT Invoices: when a customer books via /book, the submission is saved directly to the Back Orders list (/admin/backorders) so you can manage it like any other backorder (quote → sales order → invoice once stock arrives). You cannot invoice a client for stock you do not have — pre-orders sit in Back Orders until stock is received, then follow the normal fulfilment flow.',
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
    id: 'item_category_unit',
    name: 'Rule 42 — Item Category (Unit)',
    description: 'Defines how Item Category (Unit) is used across the system. Item Category (Unit) is the Sage item category that represents the product\'s unit type (e.g. Accessories, Axle, Body Kit, Brushings, Controllers, Decals, Gear). It maps to the Sage Unit field in CSV exports. In the Worksheet "Update Product Information" modal, the Item Category (Unit) column is populated from the inventory item categories list — the same options available on the Products admin page under Sage Accounts → Item Categories (Unit). Selecting an item category here updates the product\'s itemCategories JSONB column. On the Products admin Edit page, Item Categories (Unit) appears in the Sage Accounts card.',
    active: true,
    appliesTo: ['Worksheet', 'Products', 'Sage Accounts', 'CSV Export'],
    category: 'Products',
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
