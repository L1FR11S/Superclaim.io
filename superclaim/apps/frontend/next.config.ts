import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['agentmail'],
  images: {
    remotePatterns: [],
  },
}

export default nextConfig
