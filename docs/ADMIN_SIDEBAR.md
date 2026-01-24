# Admin Back Office - Wix-Style Sidebar

## Overview
The R66SLOT admin panel now features a Wix-inspired sidebar layout with organized sections and a prominent "Edit Site" feature for managing the frontend.

## Sidebar Structure

### Site Section (Top)
- **Edit Site** ✏️ - Primary action button (blue highlight)
  - Links to `/admin/pages`
  - Access the visual page editor
  - Create and manage frontend pages
- **Dashboard** 📊 - Overview and quick stats

### Content Section
Group label: "Content"
- **Homepage** 🏠 - Edit homepage content
- **Blog** 📝 - Manage blog posts

### Business & Store Section
Group label: "Business & Store"
- **Products** 🛍️ - Product management

### Settings Section
Group label: "Settings"
- **Site Settings** ⚙️ - Configure site-wide settings

### Bottom Section
- **Shopify Admin** 🛒 - External link to Shopify dashboard
- **View Live Site** 👁️ - Preview the live customer-facing site

## Edit Site Features

When clicking "Edit Site", you'll access the visual page editor where you can:

### Page Management
- Create new custom pages
- Edit existing pages
- Delete pages
- Publish/unpublish pages
- View page URLs and component counts

### Visual Page Editor Features
- **Drag & Drop Components** - Move components around easily
- **Live Preview** - See changes in real-time
- **Pre-built Templates** - Start with professional layouts
- **Undo/Redo** - Keyboard shortcuts (Ctrl+Z / Ctrl+Y)
- **Custom Styling** - Full control over appearance
- **Component Library** - 9 component types:
  - Text blocks
  - Images
  - Buttons
  - Hero sections
  - Two/Three column layouts
  - Card grids
  - Videos
  - Dividers
  - Quotes
  - Icon + Text
  - Galleries

## Quick Actions on Dashboard

The dashboard now features a highlighted "Edit Site" button at the top of Quick Actions:
- **✏️ Edit Site - Visual Page Editor** (Blue button)
- ⚙️ Edit Site Settings
- 🏠 Edit Homepage Content
- 📝 Create Blog Post
- 📦 Manage Products (Shopify)

## Design Principles

The sidebar follows Wix's design approach:
- Clean, minimalist aesthetic
- Grouped navigation with section labels
- Icon + text labels for clarity
- Prominent primary action (Edit Site)
- Consistent spacing and hover states
- Active state highlighting

## Access

- **Admin Login**: http://localhost:3001/admin/login
- **Credentials**: Username: `Admin`, Password: `admin123`
- **Edit Site Direct Link**: http://localhost:3001/admin/pages

## Customer vs Admin

- **Customers** use `/account/login` for shopping accounts
- **Staff/Admin** use `/admin/login` for back office management
- Both login pages are cross-linked for easy navigation
