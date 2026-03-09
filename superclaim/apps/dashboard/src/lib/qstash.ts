import { Client, Receiver } from '@upstash/qstash'

// ─── QStash Client (for publishing/scheduling) ────────

let _client: Client | null = null

export function getQStashClient() {
    if (!_client) {
        _client = new Client({
            token: process.env.QSTASH_TOKEN!,
        })
    }
    return _client
}

// ─── QStash Receiver (for verifying incoming requests) ─

let _receiver: Receiver | null = null

function getReceiver() {
    if (!_receiver) {
        _receiver = new Receiver({
            currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
            nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
        })
    }
    return _receiver
}

/**
 * Verify that an incoming request is genuinely from QStash.
 * Returns true if valid, false otherwise.
 */
export async function verifyQStashRequest(req: Request): Promise<boolean> {
    try {
        const signature = req.headers.get('upstash-signature')
        if (!signature) return false

        const body = await req.clone().text()

        await getReceiver().verify({
            signature,
            body,
        })

        return true
    } catch (err) {
        console.error('[QStash] Signature verification failed:', err)
        return false
    }
}

// ─── Schedule Definitions ──────────────────────────────

export interface QStashSchedule {
    /** Unique ID for this schedule (used for idempotent creates) */
    scheduleId: string
    /** Target URL path (appended to APP_URL) */
    destination: string
    /** Cron expression */
    cron: string
    /** Human-readable description */
    description: string
}

export const QSTASH_SCHEDULES: QStashSchedule[] = [
    {
        scheduleId: 'fortnox-sync-payments',
        destination: '/api/fortnox/sync-payments',
        cron: '*/5 7-16 * * *',   // Var 5:e minut, 08:00–16:55 svensk tid (UTC+1)
        description: 'Synka Fortnox-betalningar',
    },
    {
        scheduleId: 'fortnox-auto-import',
        destination: '/api/fortnox/auto-import',
        cron: '0 7,12,17 * * *', // 3 gånger/dag (07:00, 12:00, 17:00)
        description: 'Auto-importera förfallna fakturor från Fortnox',
    },
    {
        scheduleId: 'fortnox-refresh-tokens',
        destination: '/api/fortnox/refresh-all',
        cron: '0 3 * * *',       // Dagligen kl 03:00
        description: 'Uppfriskar Fortnox OAuth-tokens',
    },
    {
        scheduleId: 'agent-run',
        destination: '/api/agent/run',
        cron: '*/5 7-16 * * *',   // Var 5:e minut, 08:00–16:55 svensk tid (UTC+1)
        description: 'Kör AI-agenten på alla aktiva ärenden',
    },
]
