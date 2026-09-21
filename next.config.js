/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Redirect bare domain to www
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'r66slot.co.za' }],
        destination: 'https://www.r66slot.co.za/:path*',
        permanent: true,
      },
      // The /book booking pages were deleted in 41e1d51d (2 July 2026), but the
      // URL is printed on every pre-order poster and was shared into WhatsApp
      // and Facebook posts, so links already in customers' hands still point
      // here. Catches /book, /book/<poster code> and /book/product/<id>.
      {
        source: '/book/:path*',
        destination: '/pre-orders',
        permanent: true,
      },
    ]
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '*.r2.cloudflarestorage.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  eslint: {
    // Warning: This allows production builds to complete even with ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow builds with TypeScript errors (warnings treated as errors)
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
