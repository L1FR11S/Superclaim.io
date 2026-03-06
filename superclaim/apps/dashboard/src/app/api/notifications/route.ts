import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ notifications: [], pendingDrafts: 0 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ notifications: [], pendingDrafts: 0 })

        const { count: pendingDrafts } = await admin
            .from('email_drafts')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('status', 'pending')

        const notifications: any[] = []

        const { data: paidClaims } = await admin
            .from('claims')
            .select('id, debtor_name, amount, currency, updated_at')
            .eq('org_id', org.id)
            .eq('status', 'paid')
            .order('updated_at', { ascending: false })
            .limit(3)

        paidClaims?.forEach(c => {
            notifications.push({
                id: `paid-${c.id}`,
                type: 'paid',
                title: `${c.debtor_name} betalade`,
                description: `${c.amount?.toLocaleString('sv-SE')} ${c.currency}`,
                time: c.updated_at,
            })
        })

        const { data: escalated } = await admin
            .from('claims')
            .select('id, debtor_name, updated_at')
            .eq('org_id', org.id)
            .eq('status', 'escalated')
            .order('updated_at', { ascending: false })
            .limit(3)

        escalated?.forEach(c => {
            notifications.push({
                id: `escalated-${c.id}`,
                type: 'escalated',
                title: `${c.debtor_name} eskalerad`,
                description: 'Ärendet har eskalerat till nästa nivå',
                time: c.updated_at,
            })
        })

        const { data: replies } = await admin
            .from('claim_communications')
            .select('id, subject, created_at, claims(debtor_name)')
            .eq('org_id', org.id)
            .eq('direction', 'inbound')
            .order('created_at', { ascending: false })
            .limit(3)

        replies?.forEach(r => {
            notifications.push({
                id: `reply-${r.id}`,
                type: 'reply',
                title: `Svar från ${(r as any).claims?.debtor_name || 'gäldenär'}`,
                description: r.subject || 'Nytt svar mottaget',
                time: r.created_at,
            })
        })

        notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

        return NextResponse.json({
            notifications: notifications.slice(0, 5),
            pendingDrafts: pendingDrafts || 0,
        })
    } catch (err: any) {
        console.error('[Notifications Error]', err.message)
        return NextResponse.json({ notifications: [], pendingDrafts: 0 })
    }
}
