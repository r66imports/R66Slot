# R66SLOT Theme - Racing Red Design System

## Theme Overview

The R66SLOT theme is a bold, racing-inspired design system featuring racing red and dark gray colors that evoke the excitement and intensity of slot car racing.

## Color Palette

### Primary Colors (Racing Red)
```
primary: #DC2626        - Main racing red
primary-red: #DC2626    - Racing red (same as primary)
primary-dark: #991B1B   - Darker red for hovers
primary-light: #EF4444  - Lighter red for accents
```

### Secondary Colors (Dark Gray)
```
secondary: #1F2937      - Dark gray/almost black
secondary-gray: #1F2937 - Dark gray (same as secondary)
```

### Accent Colors
```
accent: #FBBF24         - Chrome yellow accent
accent-yellow: #FBBF24  - Yellow accent
accent-silver: #D1D5DB  - Silver/light gray
```

### Base Colors
```
black: #000000
white: #FFFFFF
```

## Typography

- **Font Family**: Assistant (system-ui fallback)
- **Headings**: Bold weights for impact
- **Body Text**: Regular weight for readability

## Component Styling

### Buttons

**Primary Button** (Racing Red)
- Background: `bg-primary` (#DC2626)
- Text: `text-white`
- Hover: `hover:bg-primary-dark` (#991B1B)

**Secondary Button** (Dark Gray)
- Background: `bg-secondary` (#1F2937)
- Text: `text-white`
- Hover: `hover:bg-secondary/90`

**Outline Button**
- Border: `border-gray-300`
- Background: `bg-transparent`
- Hover: `hover:bg-gray-100`

### Header & Navigation

- Background: `bg-secondary` (#1F2937 - Dark Gray)
- Logo: "R66" (white) + "SLOT" (racing red)
- Links: White text with racing red hover
- Icons: White with racing red hover

### Footer

- Background: `bg-secondary` (#1F2937 - Dark Gray)
- Text: White and gray-400
- Links: Racing red hover states
- Border: `border-gray-700`

### Hero Sections

- Background: `bg-secondary` (Dark Gray)
- Text: White
- CTA Buttons: Racing red primary buttons
- Accent Text: Racing red for emphasis

### Cards & Components

- Background: White or light gray
- Borders: `border-gray-200` or `border-gray-300`
- Hover: Racing red accents
- Active States: Racing red highlights

## Admin Panel Styling

### Sidebar

- Background: White
- Active Items: Gray-100 background
- **Edit Site Button**: Racing red (#DC2626) with white text - prominently highlighted
- Hover States: Light gray backgrounds
- Section Labels: Gray-400 text

### Header

- Background: Dark gray (#1F2937)
- Logo: "R66" (white) + "SLOT" (racing red) + "Admin" (gray)
- Actions: Racing red buttons

## Brand Identity

### Logo Usage
```html
<span class="text-white">R66</span>
<span class="text-primary">SLOT</span>
```

### Color Psychology
- **Racing Red**: Energy, speed, passion, excitement
- **Dark Gray**: Professionalism, sophistication, power
- **Chrome Yellow**: Highlight, premium quality, attention

## Design Principles

1. **High Contrast**: Red on dark gray creates strong visual hierarchy
2. **Racing Heritage**: Colors inspired by racing flags and track signage
3. **Professional**: Dark gray provides sophisticated foundation
4. **Energetic**: Red accents add excitement and urgency
5. **Clear CTAs**: Red buttons stand out for conversions

## Usage Examples

### Homepage Hero
```tsx
<section className="bg-secondary text-white">
  <h1>Welcome to R66SLOT</h1>
  <Button className="bg-primary hover:bg-primary-dark">Shop Now</Button>
</section>
```

### Product Cards
```tsx
<Card>
  <h3 className="hover:text-primary">Product Name</h3>
  <span className="bg-primary text-white">NEW</span>
</Card>
```

### Navigation Links
```tsx
<Link className="text-white hover:text-primary">
  Products
</Link>
```

## Accessibility

- **Contrast Ratios**: All color combinations meet WCAG AA standards
- **Red on White**: 4.5:1 (AAA for large text)
- **White on Red**: 4.5:1 (AAA for large text)
- **White on Dark Gray**: 12.6:1 (AAA)

## Files Updated

1. `tailwind.config.ts` - Color system definition
2. `src/components/ui/button.tsx` - Button variants
3. `src/components/layout/header.tsx` - Site header
4. `src/components/layout/footer.tsx` - Site footer
5. `src/app/(store)/page.tsx` - Homepage sections
6. `src/app/(admin)/admin/layout.tsx` - Admin panel
7. `src/app/(admin)/admin/pages/page.tsx` - Admin pages manager

## Brand Assets

### Primary Use Cases
- **Racing Red**: CTAs, buttons, highlights, "SLOT" in logo
- **Dark Gray**: Headers, footers, backgrounds
- **Chrome Yellow**: Special badges, accents
- **White**: Clean backgrounds, text on dark

### Don't
- Don't use yellow as primary color
- Don't mix too many colors in one section
- Don't use racing red for large text blocks
- Don't use low-contrast color combinations

## Future Enhancements

Potential additions to the theme:
- Gradient overlays for hero sections
- Racing stripe patterns
- Checkered flag motifs
- Speed lines / motion graphics
- Metallic textures for premium feel
