import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json(emptyAnalytics('no_auth'))

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json(emptyAnalytics('no_org'))

        const { data: claims } = await admin
            .from('claims')
            .select('*')
            .eq('org_id', org.id)

        if (!claims || claims.length === 0) {
            return NextResponse.json(emptyAnalytics('empty'))
        }

        const monthlyData: Record<string, { collected: number; created: number }> = {}
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']

        claims.forEach((c) => {
            const date = new Date(c.created_at)
            const key = months[date.getMonth()]
            if (!monthlyData[key]) monthlyData[key] = { collected: 0, created: 0 }
            monthlyData[key].created++
            if (c.status === 'paid') monthlyData[key].collected += c.amount || 0
        })

        const paid = claims.filter(c => c.status === 'paid')
        const successRate = claims.length > 0 ? Math.round((paid.length / claims.length) * 100) : 0
        const avgDays = paid.length > 0
            ? Math.round(paid.reduce((sum, c) => {
                const created = new Date(c.created_at).getTime()
                const paidAt = c.paid_at ? new Date(c.paid_at).getTime() : Date.now()
                return sum + (paidAt - created) / (1000 * 60 * 60 * 24)
            }, 0) / paid.length)
            : 0

        const { data: runs } = await admin
            .from('agent_runs')
            .select('*')
            .eq('org_id', org.id)
            .order('started_at', { ascending: false })
            .limit(10)

        const { data: comms } = await admin
            .from('claim_communications')
            .select('id, channel, direction')
            .eq('org_id', org.id)

        const emailsSent = comms?.filter(c => c.direction === 'outbound' && c.channel === 'email').length || 0
        const repliesReceived = comms?.filter(c => c.direction === 'inbound').length || 0

        return NextResponse.json({
            monthlyCollected: Object.entries(monthlyData).map(([month, data]) => ({ month, amount: data.collected })),
            monthlyClaims: Object.entries(monthlyData).map(([month, data]) => ({ month, count: data.created })),
            successRate,
            avgDaysToCollect: avgDays,
            totalClaims: claims.length,
            totalCollected: paid.reduce((s, c) => s + (c.amount || 0), 0),
            emailsSent,
            repliesReceived,
            recentRuns: runs || [],
            source: 'database',
        })
    } catch (err: any) {
        console.error('[Analytics Error]', err.message)
        return NextResponse.json(emptyAnalytics('error'))
    }
}

function emptyAnalytics(source: string) {
    return {
        monthlyCollected: [],
        monthlyClaims: [],
        successRate: 0,
        avgDaysToCollect: 0,
        totalClaims: 0,
        totalCollected: 0,
        emailsSent: 0,
        repliesReceived: 0,
        recentRuns: [],
        source,
    }
}
