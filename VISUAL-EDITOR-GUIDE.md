# Visual Page Editor - Enhanced Features Guide

## 🎨 New Components Added

### Basic Components
- **Heading** - Large title text with customizable styling
- **Text** - Paragraph text blocks
- **Button** - Clickable buttons with links
- **Image** - Images with upload support
- **Spacer** - Empty spacing between elements
- **Divider** - Horizontal line separator

### Layout Components
- **Section** - Container for grouping elements
- **Two Column** - Split content into 2 columns
- **Three Column** - Split content into 3 columns
- **Card** - Styled box with shadow and border
- **Hero Banner** - Full-width hero section with background support

### Content Components
- **Quote** - Styled blockquote/testimonial
- **Icon + Text** - Icon with descriptive text (features)
- **Video** - YouTube/Vimeo embed support
- **Gallery Grid** - Image grid with customizable columns

## 🎯 Advanced Styling Controls

### Spacing Controls
- **Padding** - All sides or individual (top, right, bottom, left)
- **Margin** - All sides or individual controls
- **Gap** - Spacing between child elements

### Size Controls
- **Width** / **Max Width** - Element width constraints
- **Height** / **Min Height** - Element height constraints

### Visual Effects
- **Border** - Full border or individual width/color
- **Border Radius** - Rounded corners
- **Box Shadow** - 5 preset shadow sizes + custom
- **Background Color** - Color picker + hex input
- **Text Color** - Color picker + hex input

### Layout Controls
- **Display** - Block, Flex, Grid, Inline-block
- **Flex Direction** - Row or Column
- **Justify Content** - Start, Center, End, Space Between, Space Around
- **Align Items** - Start, Center, End, Stretch
- **Text Align** - Left, Center, Right

### Typography
- **Font Size** - Custom size in px, rem, em
- **Font Weight** - Normal, Bold, custom weights

## 🛠️ Component-Specific Settings

### Image Component
- Image URL input
- Direct file upload
- Alt text

### Button Component
- Link URL destination
- Custom styling (colors, padding, rounded corners)

### Video Component
- YouTube/Vimeo embed URL support
- Full responsive width

### Icon + Text Component
- Icon picker with 12+ preset emojis
- Custom icon support

### Hero Banner Component
- Background image URL support
- Background size/position controls
- Full-width display

### Gallery Component
- Adjustable column count (1-6 columns)
- Automatic responsive grid

### Column Layouts
- Dynamic column count adjustment
- Child components managed individually

## 🎨 Component Categories

Components are organized in the left sidebar by category:

1. **Basic** - Essential building blocks
2. **Layout** - Structural components
3. **Content** - Rich content elements
4. **Media** - Upload section at bottom

## 📱 How to Use

1. **Add Components** - Click any component in the left sidebar to add it to your page
2. **Select Component** - Click on any component in the canvas to select it
3. **Edit Properties** - Use the right sidebar to edit content and styles
4. **Reorder** - Use ↑ ↓ buttons to move components up/down
5. **Delete** - Click ✕ to remove components
6. **Save** - Click "Save Draft" or "Publish" to save your work

## 🚀 Pro Tips

- Use **Sections** to group related components together
- **Card** components are perfect for feature blocks
- **Hero Banner** works great as the first component on landing pages
- **Two/Three Column** layouts are ideal for features, benefits, or team sections
- **Gallery Grid** automatically creates responsive image grids
- Use **Box Shadow** presets for quick professional styling
- Combine **Padding** and **Margin** for perfect spacing
- Use **Max Width** to constrain wide content on large screens

## 🎯 Common Layouts

### Landing Page Hero
1. Hero Banner (with background image)
2. Heading + Text
3. Button (CTA)

### Features Section
1. Section (with padding)
2. Three Column layout
3. Icon + Text in each column

### Testimonials
1. Quote component
2. Text (author name)
3. Spacer

### Gallery/Portfolio
1. Gallery Grid (3-4 columns)
2. Image components as children

### Call to Action
1. Card component
2. Heading + Text inside
3. Button

## 🔧 Technical Notes

- All components support full CSS customization
- Styles cascade from parent to child components
- Components save as JSON with full style/content data
- Background images use CSS `url()` format
- Video embeds require `/embed/` URLs from YouTube/Vimeo
