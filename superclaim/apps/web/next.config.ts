import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  turbopack: {
    root: process.cwd(),
  },
}

export default nextConfig
