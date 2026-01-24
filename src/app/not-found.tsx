import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Sorry, we couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Button size="lg" asChild>
          <Link href="/">Return Home</Link>
        </Button>
      </div>
    </div>
  )
}
