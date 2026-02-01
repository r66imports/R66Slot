import type { Metadata } from 'next'
import { Assistant, Play } from 'next/font/google'
import { CartProvider } from '@/context/cart-context'
import { WhatsAppButton } from '@/components/layout/whatsapp-button'
import { HeroProvider } from '@/contexts/HeroContext'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${assistant.variable} ${play.variable}`}>
      <body className={assistant.className}>
        <CartProvider>
          <HeroProvider>
            {children}
            <WhatsAppButton />
          </HeroProvider>
        </CartProvider>
      </body>
    </html>
  )
}
