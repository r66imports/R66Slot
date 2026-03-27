import { DynamicHeader } from '@/components/layout/header/dynamic-header'
import { Footer } from '@/components/layout/footer'

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Dynamic header - editable from admin settings */}
      <DynamicHeader />
      <main className="flex-1 bg-white">{children}</main>
      <Footer />
    </div>
  )
}
