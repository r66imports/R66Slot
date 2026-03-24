import type { Metadata } from 'next'
import { Assistant, Play } from 'next/font/google'
import { CartProvider } from '@/context/cart-context'
import { LocalCartProvider } from '@/context/local-cart-context'
import { WhatsAppButton } from '@/components/layout/whatsapp-button'
import { HeroProvider } from '@/contexts/HeroContext'
import { getRuleValue } from '@/lib/site-rules'
import './globals.css'

const assistant = Assistant({
  subsets: ['latin'],
  variable: '--font-assistant',
  display: 'swap',
})

const play = Play({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-play',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'R66SLOT - Premium Slot Cars & Collectibles',
  description: 'Shop the finest selection of slot cars, tracks, and accessories for collectors and enthusiasts.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Rule 0 — Site Font: read configured font value and apply the matching class
  const fontValue = await getRuleValue('site_font').catch(() => 'Play')
  const bodyFontClass = fontValue === 'Assistant' ? assistant.className : play.className

  return (
    <html lang="en" className={`${assistant.variable} ${play.variable}`}>
      <body className={bodyFontClass}>
        <CartProvider>
          <LocalCartProvider>
            <HeroProvider>
              {children}
              <WhatsAppButton />
            </HeroProvider>
          </LocalCartProvider>
        </CartProvider>
      </body>
    </html>
  )
}
