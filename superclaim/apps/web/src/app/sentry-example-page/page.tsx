'use client'
import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'

export default function SentryTestPage() {
    const [sent, setSent] = useState(false)

    const trigger = () => {
        try {
            // @ts-expect-error intentional undefined function
            myUndefinedFunction()
        } catch (e) {
            Sentry.captureException(e)
            setSent(true)
        }
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'sans-serif', background: '#0a0a0a', color: '#fff' }}>
            <h1>Sentry Test (App)</h1>
            {sent
                ? <p style={{ color: '#4ade80' }}>✅ Error skickat till Sentry! Kolla Issues.</p>
                : <button onClick={trigger} style={{ padding: '10px 24px', background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}>
                    Trigga testfel → Sentry
                </button>
            }
        </div>
    )
}
