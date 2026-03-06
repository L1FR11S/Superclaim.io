import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['agentmail'],
  images: {
    remotePatterns: [],
  },
}

export default withSentryConfig(nextConfig, {
  org: 'superclaimio',
  project: 'superclaim-app',
  silent: !process.env.CI,
  widenClientFileUpload: true,
  automaticVercelMonitors: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})

