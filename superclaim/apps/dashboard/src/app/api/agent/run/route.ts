import { NextRequest, NextResponse } from 'next/server'
import { runAgentForAllOrgs } from '@/lib/agent/engine'
import { verifyQStashRequest } from '@/lib/qstash'

/**
 * GET /api/agent/run
 * Triggered by Vercel Cron or QStash.
 */
export async function GET(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET
        const isQStash = await verifyQStashRequest(request)

        // Validate either cron secret or QStash signature
        if (cronSecret) {
            const authHeader = request.headers.get('authorization')
            if (authHeader !== `Bearer ${cronSecret}` && !isQStash) {
                console.error('[Agent Cron] Unauthorized — invalid credentials')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
        } else if (!isQStash) {
            return NextResponse.json({ error: 'No auth configured' }, { status: 401 })
        }

        console.log('[Agent Cron] Starting run at', new Date().toISOString())
        const results = await runAgentForAllOrgs()
        console.log('[Agent Cron] Finished:', results)

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results,
        })
    } catch (err: any) {
        console.error('[Agent Cron Error]', err)
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        )
    }
}

/**
 * POST /api/agent/run
 * Triggered by QStash cron OR manual trigger from dashboard / Test Panel.
 * Accepts:
 *   1. QStash signature (upstash-signature header)
 *   2. Inloggad Supabase-session (för Test Panel / Dashboard)
 */
export async function POST(_request: NextRequest) {
    try {
        // Check QStash signature first (cron-anrop)
        const isQStash = await verifyQStashRequest(_request)

        if (!isQStash) {
            // Fallback: kräv inloggad Supabase-session (manuell trigger)
            const { createClient } = await import('@/utils/supabase/server')
            const supabase = await createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized — login or QStash signature required' }, { status: 401 })
            }
        }

        const results = await runAgentForAllOrgs()

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results,
        })
    } catch (err: any) {
        console.error('[Agent Run Error]', err)
        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        )
    }
}

