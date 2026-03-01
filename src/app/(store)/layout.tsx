import { Footer } from '@/components/layout/footer'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
      <div style={{ position: 'relative', zIndex: 2 }}>
        <Footer />
      </div>
    </>
  )
}
