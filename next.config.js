/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ],
  },
  async rewrites() {
    return {
      // Fallback rewrites: only trigger if no local file matches
      fallback: [
        {
          source: '/uploads/:path*',
          destination: 'https://nmzmqclsndjoijpucflt.supabase.co/storage/v1/object/public/uploads/:path*',
        },
      ],
    }
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
