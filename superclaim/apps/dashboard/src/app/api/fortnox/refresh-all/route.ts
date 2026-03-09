import { createAdminClient } from '@/utils/supabase/admin'
import { refreshAccessToken } from '@/lib/fortnox/fortnox'
import { NextResponse } from 'next/server'
import { verifyQStashRequest } from '@/lib/qstash'

/**
 * POST /api/fortnox/refresh-all
 *
 * Cron Job — refreshar Fortnox OAuth-tokens.
 * Accepterar anrop via:
 *   1. Vercel Cron (x-cron-secret header)
 *   2. QStash (upstash-signature header)
 */
export async function POST(req: Request) {
    const cronSecret = req.headers.get('x-cron-secret')
    const isQStash = await verifyQStashRequest(req)

    if (cronSecret !== process.env.CRON_SECRET && !isQStash) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Hämta alla orgs med aktiv Fortnox-koppling
    const { data: orgs, error } = await admin
        .from('org_settings')
        .select('org_id, fortnox_refresh_token, fortnox_token_expires_at, updated_at')
        .not('fortnox_refresh_token', 'is', null)

    if (error) {
        console.error('[fortnox/refresh-all] Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!orgs || orgs.length === 0) {
        return NextResponse.json({ message: 'Inga kopplade Fortnox-orgs hittades', refreshed: 0 })
    }

    const TWENTY_DAYS_MS = 20 * 24 * 60 * 60 * 1000
    const now = Date.now()

    const results: { org_id: string; status: 'refreshed' | 'skipped' | 'error'; reason?: string }[] = []

    for (const org of orgs) {
        // Hoppa över om token uppdaterades för mindre än 20 dagar sedan
        const lastUpdated = new Date(org.updated_at).getTime()
        if (now - lastUpdated < TWENTY_DAYS_MS) {
            results.push({ org_id: org.org_id, status: 'skipped', reason: 'Token nyare än 20 dagar' })
            continue
        }

        try {
            const tokens = await refreshAccessToken(org.fortnox_refresh_token)
            const newExpiresAt = new Date(now + tokens.expires_in * 1000)

            await admin
                .from('org_settings')
                .update({
                    fortnox_access_token: tokens.access_token,
                    fortnox_refresh_token: tokens.refresh_token,
                    fortnox_token_expires_at: newExpiresAt.toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('org_id', org.org_id)

            results.push({ org_id: org.org_id, status: 'refreshed' })
            console.log(`[fortnox/refresh-all] ✅ Refreshed token for org ${org.org_id}`)
        } catch (err: any) {
            results.push({ org_id: org.org_id, status: 'error', reason: err.message })
            console.error(`[fortnox/refresh-all] ❌ Failed for org ${org.org_id}:`, err.message)
        }
    }

    const refreshed = results.filter(r => r.status === 'refreshed').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const failed = results.filter(r => r.status === 'error').length

    return NextResponse.json({ refreshed, skipped, failed, results })
}
