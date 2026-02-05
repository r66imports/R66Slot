import { Footer } from '@/components/layout/footer'

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Header is now controlled through the page editor - add a 'header' component to your page */}
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  )
}
