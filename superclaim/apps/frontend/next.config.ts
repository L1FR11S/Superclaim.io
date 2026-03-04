import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['agentmail'],
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.superclaim.io' }],
        destination: 'https://superclaim.io/:path*',
        permanent: true,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  org: 'superclaimio',
  project: 'superclaim-frontend',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  automaticVercelMonitors: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
