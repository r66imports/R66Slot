'use client'

import React, { useState } from 'react'
import Link from 'next/link'

// ─── Mock Data ───
const MOCK_PRODUCTS = [
  {
    id: 1,
    title: 'NSR Corvette C7.R GT3',
    sku: 'NSR-0345-AW',
    price: 89.99,
    originalPrice: 99.99,
    image: '/products/nsr-corvette.jpg',
    inStock: true,
    category: 'Slot Cars',
  },
  {
    id: 2,
    title: 'NSR Porsche 997 RSR',
    sku: 'NSR-0188-SW',
    price: 94.99,
    image: '/products/nsr-porsche.jpg',
    inStock: true,
    category: 'Slot Cars',
  },
  {
    id: 3,
    title: 'NSR Ford GT GT3',
    sku: 'NSR-0412-AW',
    price: 87.99,
    image: '/products/nsr-ford-gt.jpg',
    inStock: false,
    category: 'Slot Cars',
  },
  {
    id: 4,
    title: 'NSR King EVO3 21K Motor',
    sku: 'NSR-3024',
    price: 24.99,
    image: '/products/nsr-motor.jpg',
    inStock: true,
    category: 'Parts',
  },
  {
    id: 5,
    title: 'NSR Shark 25K Motor',
    sku: 'NSR-3005',
    price: 19.99,
    image: '/products/nsr-shark.jpg',
    inStock: true,
    category: 'Parts',
  },
  {
    id: 6,
    title: 'NSR Tires - Ultragrip 19x10',
    sku: 'NSR-5223',
    price: 8.99,
    image: '/products/nsr-tires.jpg',
    inStock: true,
    category: 'Parts',
  },
  {
    id: 7,
    title: 'NSR Audi R8 LMS GT3',
    sku: 'NSR-0356-AW',
    price: 92.99,
    image: '/products/nsr-audi.jpg',
    inStock: true,
    category: 'Slot Cars',
  },
  {
    id: 8,
    title: 'NSR Chassis Hard - Medium',
    sku: 'NSR-1449',
    price: 14.99,
    image: '/products/nsr-chassis.jpg',
    inStock: true,
    category: 'Parts',
  },
]

const CATEGORIES = [
  { id: 'all', name: 'All Products', count: 8 },
  { id: 'slot-cars', name: 'Slot Cars', count: 4 },
  { id: 'parts', name: 'Parts', count: 4 },
  { id: 'motors', name: 'Motors', count: 2 },
  { id: 'tires', name: 'Tires', count: 1 },
  { id: 'chassis', name: 'Chassis', count: 1 },
]

const AVAILABILITY_OPTIONS = [
  { id: 'in-stock', name: 'In Stock', count: 7 },
  { id: 'out-of-stock', name: 'Out of Stock', count: 1 },
]

// ─── Header Component ───
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              <span className="text-white">R66</span>
              <span className="text-red-500">SLOT</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/products" className="text-sm font-medium hover:text-red-400 transition-colors">
              Products
            </Link>
            <Link href="/brands" className="text-sm font-medium hover:text-red-400 transition-colors">
              Brands
            </Link>
            <Link href="/about" className="text-sm font-medium hover:text-red-400 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-sm font-medium hover:text-red-400 transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Account */}
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>

            {/* Cart */}
            <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                3
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-slate-700">
            <div className="flex flex-col gap-2">
              <Link href="/products" className="px-4 py-2 text-sm font-medium hover:bg-slate-800 rounded-lg">
                Products
              </Link>
              <Link href="/brands" className="px-4 py-2 text-sm font-medium hover:bg-slate-800 rounded-lg">
                Brands
              </Link>
              <Link href="/about" className="px-4 py-2 text-sm font-medium hover:bg-slate-800 rounded-lg">
                About
              </Link>
              <Link href="/contact" className="px-4 py-2 text-sm font-medium hover:bg-slate-800 rounded-lg">
                Contact
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

// ─── Breadcrumb Component ───
function Breadcrumb() {
  return (
    <nav className="bg-gray-50 border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link href="/" className="text-gray-500 hover:text-red-500 transition-colors">
              Home
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href="/brands" className="text-gray-500 hover:text-red-500 transition-colors">
              Brands
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-900 font-medium">NSR</li>
        </ol>
      </div>
    </nav>
  )
}

// ─── Brand Header Component ───
function BrandHeader() {
  return (
    <div className="bg-gradient-to-r from-red-600 to-red-500 text-white">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Brand Logo Placeholder */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
              <span className="text-3xl font-black tracking-tight">NSR</span>
            </div>
          </div>

          {/* Brand Title */}
          <h1 className="text-4xl md:text-5xl font-bold italic mb-4">
            NSR Slot Cars
          </h1>

          {/* Brand Tagline */}
          <p className="text-xl text-red-100 mb-6">
            Premium Racing Performance
          </p>

          {/* Brand Description */}
          <div className="text-red-50 leading-relaxed max-w-2xl mx-auto">
            <p>
              NSR is a world-renowned manufacturer of high-performance 1:32 scale slot cars.
              Known for their exceptional build quality, realistic details, and race-winning
              performance, NSR models are the choice of serious collectors and competitive racers alike.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Category Cards Component ───
function CategoryCards() {
  const categories = [
    {
      id: 'slot-cars',
      title: 'NSR',
      subtitle: 'Slot Cars',
      description: 'Explore our complete range of NSR racing models',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 64 64" fill="currentColor">
          <ellipse cx="16" cy="40" rx="6" ry="6" fill="currentColor" opacity="0.8" />
          <ellipse cx="48" cy="40" rx="6" ry="6" fill="currentColor" opacity="0.8" />
          <path d="M8 32 L20 24 L44 24 L56 32 L56 38 L8 38 Z" fill="currentColor" />
          <rect x="20" y="20" width="8" height="8" rx="1" fill="currentColor" opacity="0.6" />
          <circle cx="36" cy="30" r="3" fill="white" opacity="0.3" />
        </svg>
      ),
      bgColor: 'bg-red-500',
      buttonText: 'View Cars',
      link: '/brands/nsr/slot-cars',
    },
    {
      id: 'parts',
      title: 'NSR',
      subtitle: 'Parts',
      description: 'Quality replacement parts and upgrades',
      icon: (
        <svg className="w-12 h-12" viewBox="0 0 64 64" fill="currentColor" opacity="0.7">
          <path d="M32 8 L36 12 L36 20 L44 20 L48 24 L48 28 L44 32 L48 36 L48 40 L44 44 L36 44 L36 52 L32 56 L28 52 L28 44 L20 44 L16 40 L16 36 L20 32 L16 28 L16 24 L20 20 L28 20 L28 12 Z" />
          <circle cx="32" cy="32" r="8" fill="white" opacity="0.2" />
        </svg>
      ),
      bgColor: 'bg-slate-700',
      buttonText: 'View Parts',
      link: '/brands/nsr/parts',
    },
  ]

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              {/* Card Visual */}
              <div className={`${cat.bgColor} h-64 flex items-center justify-center text-white`}>
                <div className="text-center">
                  <div className="mb-4 flex justify-center opacity-80">
                    {cat.icon}
                  </div>
                  <h3 className="text-2xl font-bold">{cat.title}</h3>
                  <p className="text-white/80">{cat.subtitle}</p>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 text-center">
                <h4 className="text-xl font-bold text-gray-900 mb-2">
                  {cat.title} {cat.subtitle}
                </h4>
                <p className="text-gray-600 mb-4">{cat.description}</p>
                <Link
                  href={cat.link}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white transition-colors ${
                    cat.id === 'slot-cars' ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                >
                  {cat.buttonText}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Filter Sidebar Component ───
function FilterSidebar({ isOpen, onClose, selectedCategory, setSelectedCategory, selectedAvailability, setSelectedAvailability }) {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
          w-72 lg:w-64 bg-white lg:bg-transparent
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto lg:overflow-visible
          shadow-xl lg:shadow-none
        `}
      >
        <div className="p-6 lg:p-0">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h2 className="text-lg font-bold text-gray-900">Filters</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Categories
            </h3>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors
                    ${selectedCategory === cat.id
                      ? 'bg-red-50 text-red-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>{cat.name}</span>
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs
                    ${selectedCategory === cat.id ? 'bg-red-100' : 'bg-gray-100'}
                  `}>
                    {cat.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Availability
            </h3>
            <div className="space-y-2">
              {AVAILABILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedAvailability.includes(opt.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAvailability([...selectedAvailability, opt.id])
                      } else {
                        setSelectedAvailability(selectedAvailability.filter(id => id !== opt.id))
                      }
                    }}
                    className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-600 flex-1">{opt.name}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                    {opt.count}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Price Range
            </h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Min</label>
                <input
                  type="number"
                  placeholder="$0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Max</label>
                <input
                  type="number"
                  placeholder="$200"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Clear Filters */}
          <button className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
            Clear All Filters
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── Product Card Component ───
function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {/* Product Image with Zoom Effect */}
        <div
          className={`
            absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300
            flex items-center justify-center
            transition-transform duration-500 ease-out
            ${isHovered ? 'scale-110' : 'scale-100'}
          `}
        >
          {/* Placeholder Icon */}
          <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        {/* Availability Badge */}
        <div className="absolute top-3 left-3">
          {product.inStock ? (
            <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
              In Stock
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-gray-500 text-white text-xs font-semibold rounded-full">
              Out of Stock
            </span>
          )}
        </div>

        {/* Sale Badge */}
        {product.originalPrice && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
              Sale
            </span>
          </div>
        )}

        {/* Quick Actions (visible on hover) */}
        <div
          className={`
            absolute inset-0 bg-black/20 flex items-center justify-center gap-2
            transition-opacity duration-300
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        {/* SKU */}
        <p className="text-xs text-gray-400 mb-1 font-mono">{product.sku}</p>

        {/* Title */}
        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem] leading-tight">
          {product.title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-bold text-gray-900">
            ${product.price.toFixed(2)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              ${product.originalPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* CTA Button */}
        <button
          disabled={!product.inStock}
          className={`
            w-full py-2.5 rounded-lg font-semibold text-sm transition-colors
            ${product.inStock
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  )
}

// ─── Product Grid Section ───
function ProductGridSection() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedAvailability, setSelectedAvailability] = useState([])
  const [sortBy, setSortBy] = useState('featured')

  return (
    <section className="bg-white py-12">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">All NSR Products</h2>
            <p className="text-gray-500">Showing {MOCK_PRODUCTS.length} products</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest</option>
              <option value="name">Name: A-Z</option>
            </select>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex gap-8">
          {/* Sidebar */}
          <FilterSidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            selectedAvailability={selectedAvailability}
            setSelectedAvailability={setSelectedAvailability}
          />

          {/* Product Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {MOCK_PRODUCTS.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12 flex items-center justify-center gap-2">
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                Previous
              </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium">
                1
              </button>
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                2
              </button>
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                3
              </button>
              <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer Component ───
function Footer() {
  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold">
                <span className="text-white">R66</span>
                <span className="text-red-500">SLOT</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm mb-4">
              Your premier destination for high-quality slot cars, parts, and accessories from top brands worldwide.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                </svg>
              </a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Home</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Products</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Brands</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">About Us</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Contact</a></li>
            </ul>
          </div>

          {/* Brands */}
          <div>
            <h4 className="font-semibold text-white mb-4">Popular Brands</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">NSR</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Sideways</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Pioneer</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Revo Slot</a></li>
              <li><a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Slot.it</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-white mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-slate-400">Cape Town, South Africa</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-slate-400">info@r66slot.co.za</span>
              </li>
              <li className="flex items-start gap-3 text-sm">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-slate-400">+27 61 589 8921</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <p>&copy; 2024 R66 Slot. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Shipping Info</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── WhatsApp Button Component ───
function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/27615898921"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 p-4 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg transition-all hover:scale-110"
      aria-label="Contact us on WhatsApp"
    >
      <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    </a>
  )
}

// ─── Main NSRTest Component ───
export default function NSRTest() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Breadcrumb />
      <BrandHeader />
      <CategoryCards />
      <ProductGridSection />
      <Footer />
      <WhatsAppButton />
    </div>
  )
}
