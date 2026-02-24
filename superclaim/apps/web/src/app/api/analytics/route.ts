import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(mockAnalytics())
        }

        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) {
            return NextResponse.json(mockAnalytics())
        }

        const { data: claims } = await supabase
            .from('claims')
            .select('*')
            .eq('org_id', org.id)

        if (!claims || claims.length === 0) {
            return NextResponse.json(mockAnalytics())
        }

        // Calculate monthly stats
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

        return NextResponse.json({
            monthlyCollected: Object.entries(monthlyData).map(([month, data]) => ({ month, amount: data.collected })),
            monthlyClaims: Object.entries(monthlyData).map(([month, data]) => ({ month, count: data.created })),
            successRate,
            avgDaysToCollect: avgDays,
            totalClaims: claims.length,
            totalCollected: paid.reduce((s, c) => s + (c.amount || 0), 0),
            source: 'database',
        })
    } catch {
        return NextResponse.json(mockAnalytics())
    }
}

function mockAnalytics() {
    return {
        monthlyCollected: [
            { month: 'Jul', amount: 32000 },
            { month: 'Aug', amount: 48000 },
            { month: 'Sep', amount: 67000 },
            { month: 'Okt', amount: 45200 },
            { month: 'Nov', amount: 58000 },
            { month: 'Dec', amount: 72000 },
        ],
        monthlyClaims: [
            { month: 'Jul', count: 8 },
            { month: 'Aug', count: 12 },
            { month: 'Sep', count: 15 },
            { month: 'Okt', count: 11 },
            { month: 'Nov', count: 18 },
            { month: 'Dec', count: 14 },
        ],
        successRate: 78,
        avgDaysToCollect: 12,
        totalClaims: 78,
        totalCollected: 322200,
        source: 'mock',
    }
}
