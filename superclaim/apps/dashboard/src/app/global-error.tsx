'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        Sentry.captureException(error)
    }, [error])

    return (
        <html>
            <body
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    fontFamily: 'sans-serif',
                    backgroundColor: '#0a0a0a',
                    color: '#fff',
                    gap: '16px',
                }}
            >
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    Något gick fel
                </h2>
                <p style={{ color: '#888', maxWidth: 400, textAlign: 'center' }}>
                    Felet har rapporterats automatiskt. Försök igen eller kontakta support.
                </p>
                <button
                    onClick={reset}
                    style={{
                        padding: '10px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#6c47ff',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '1rem',
                    }}
                >
                    Försök igen
                </button>
            </body>
        </html>
    )
}
