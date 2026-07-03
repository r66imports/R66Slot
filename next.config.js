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
