import { DynamicHeader } from '@/components/layout/header/dynamic-header'
import { Footer } from '@/components/layout/footer'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <DynamicHeader />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
