import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getQStashClient, QSTASH_SCHEDULES } from '@/lib/qstash'

/**
 * POST /api/qstash/setup
 *
 * Registers (or updates) all QStash schedules.
 * Call once after deploy, or whenever schedules change.
 * Requires authenticated user.
 */
export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        if (!appUrl) {
            return NextResponse.json(
                { error: 'NEXT_PUBLIC_APP_URL is not configured' },
                { status: 500 }
            )
        }

        const client = getQStashClient()
        const results: { id: string; status: string; cron: string; url: string }[] = []

        for (const schedule of QSTASH_SCHEDULES) {
            try {
                const targetUrl = `${appUrl}${schedule.destination}`

                const res = await client.schedules.create({
                    destination: targetUrl,
                    cron: schedule.cron,
                    scheduleId: schedule.scheduleId,
                    retries: 3,
                })

                results.push({
                    id: schedule.scheduleId,
                    status: 'created',
                    cron: schedule.cron,
                    url: targetUrl,
                })
            } catch (err: any) {
                results.push({
                    id: schedule.scheduleId,
                    status: `error: ${err.message}`,
                    cron: schedule.cron,
                    url: `${appUrl}${schedule.destination}`,
                })
            }
        }

        return NextResponse.json({
            message: 'QStash-scheman registrerade',
            schedules: results,
        })
    } catch (err: any) {
        console.error('[QStash Setup Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * GET /api/qstash/setup
 *
 * Lists all active QStash schedules.
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const client = getQStashClient()
        const schedules = await client.schedules.list()

        return NextResponse.json({ schedules })
    } catch (err: any) {
        console.error('[QStash List Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
