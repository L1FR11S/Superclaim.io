import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['agentmail'],
  images: {
    remotePatterns: [],
  },
}

export default withSentryConfig(nextConfig, {
  org: 'superclaim',
  project: 'superclaim-frontend',

  silent: !process.env.CI,

  widenClientFileUpload: true,

  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  disableLogger: true,

  automaticVercelMonitors: true,
})
