'use client'
export default function SentryTestPage() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'sans-serif', background: '#0a0a0a', color: '#fff' }}>
            <h1>Sentry Test</h1>
            <button
                onClick={() => {
                    // @ts-expect-error intentional test error for Sentry verification
                    myUndefinedFunction()
                }}
                style={{ padding: '10px 24px', background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
            >
                Trigga testfel → Sentry
            </button>
        </div>
    )
}
