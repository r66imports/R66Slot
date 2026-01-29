'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="bg-secondary border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold">
            <span className="text-white">R66</span>
            <span className="text-primary">SLOT</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/products"
              className="text-white hover:text-primary transition-colors"
            >
              Products
            </Link>
            <Link
              href="/brands"
              className="text-white hover:text-primary transition-colors"
            >
              Brands
            </Link>
            <Link
              href="/collections/new-arrivals"
              className="text-white hover:text-primary transition-colors"
            >
              New Arrivals
            </Link>
            <Link
              href="/slotify-preorders"
              className="text-white hover:text-primary transition-colors"
            >
              Slotify Pre-Orders
            </Link>
            <Link
              href="/about"
              className="text-white hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-white hover:text-primary transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4">
            <button className="text-white hover:text-primary transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            <Link
              href="/account"
              className="text-white hover:text-primary transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </Link>
            <button className="text-white hover:text-primary transition-colors relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                0
              </span>
            </button>

            {/* Mobile menu button */}
            <button
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-700">
            <nav className="flex flex-col gap-3">
              <Link
                href="/products"
                className="text-white hover:text-primary transition-colors py-2"
              >
                Products
              </Link>
              <Link
                href="/brands"
                className="text-white hover:text-primary transition-colors py-2"
              >
                Brands
              </Link>
              <Link
                href="/collections/new-arrivals"
                className="text-white hover:text-primary transition-colors py-2"
              >
                New Arrivals
              </Link>
              <Link
                href="/slotify-preorders"
                className="text-white hover:text-primary transition-colors py-2"
              >
                Slotify Pre-Orders
              </Link>
              <Link
                href="/about"
                className="text-white hover:text-primary transition-colors py-2"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-white hover:text-primary transition-colors py-2"
              >
                Contact
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
