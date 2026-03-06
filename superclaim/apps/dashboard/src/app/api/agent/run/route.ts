import { NextRequest, NextResponse } from 'next/server'
import { runAgentForAllOrgs } from '@/lib/agent/engine'

/**
 * GET /api/agent/run
 * Triggered by Vercel Cron at 06:00 UTC every day.
 * Vercel Cron sends GET requests with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET

        // Validate cron secret in production
        if (cronSecret) {
            const authHeader = request.headers.get('authorization')
            if (authHeader !== `Bearer ${cronSecret}`) {
                console.error('[Agent Cron] Unauthorized — invalid or missing CRON_SECRET')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
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
 * Allow manual trigger from dashboard / testing.
 */
export async function POST(request: NextRequest) {
    try {
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret) {
            const authHeader = request.headers.get('authorization')
            if (authHeader !== `Bearer ${cronSecret}`) {
                // Allow unauthenticated in dev
                if (process.env.NODE_ENV === 'production') {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
                }
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
