import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Fånga 100 % av traces i dev, sänk i produktion vid behov
    tracesSampleRate: 1.0,

    // Spela in sessionen vid fel
    replaysOnErrorSampleRate: 1.0,

    // Spela in 10 % av alla sessioner
    replaysSessionSampleRate: 0.1,

    integrations: [
        Sentry.replayIntegration(),
        Sentry.feedbackIntegration({
            colorScheme: 'system',
        }),
    ],

    // Logga Sentry-händelser i konsolen under utveckling
    debug: process.env.NODE_ENV === 'development',
})
