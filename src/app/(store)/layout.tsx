import { Footer } from '@/components/layout/footer'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1">{children}</main>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Footer />
      </div>
    </div>
  )
}
