import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  serverExternalPackages: ['agentmail'],
  images: {
    remotePatterns: [],
  },
}

export default withSentryConfig(nextConfig, {
  // Sentry organisationsslug och projektnamn
  org: 'superclaim',
  project: 'superclaim-app',

  // Tysta Sentry-loggar under bygget
  silent: !process.env.CI,

  // Ladda upp source maps till Sentry för bättre stacktraces
  widenClientFileUpload: true,

  // Source map-uppladdning
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Minska storleken på Sentry-bundeln
  disableLogger: true,

  // Automatisk instrumentering av Vercel Cron Monitors
  automaticVercelMonitors: true,
})

