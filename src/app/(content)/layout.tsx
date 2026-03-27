import { DynamicHeader } from '@/components/layout/header/dynamic-header'
import { Footer } from '@/components/layout/footer'

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Dynamic header - editable from admin settings */}
      <DynamicHeader />
      <main className="min-h-screen bg-white">{children}</main>
      <Footer />
    </>
  )
}
