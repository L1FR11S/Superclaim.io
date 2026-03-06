import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ notifications: [], pendingEmailsCount: 0 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ notifications: [], pendingEmailsCount: 0 })

        // ─── Räkna utkast (E-post + SMS) ─────────────────────────────
        const { count: pendingEmailDrafts } = await admin
            .from('email_drafts')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('status', 'pending')

        const { count: pendingSmsDrafts } = await admin
            .from('sms_drafts')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .eq('status', 'pending')

        const pendingEmailsCount = (pendingEmailDrafts || 0) + (pendingSmsDrafts || 0)

        // ─── Bygga notis-listan ────────────────────────────────────────
        const notifications: {
            id: string
            text: string
            time: string
            type: 'info' | 'success' | 'warning' | 'paid'
            href?: string
        }[] = []

        // Utkast väntar på godkännande
        if (pendingEmailsCount > 0) {
            notifications.push({
                id: 'pending-drafts',
                type: 'info',
                text: `${pendingEmailsCount} ${pendingEmailsCount === 1 ? 'mejl/SMS väntar' : 'mejl/SMS väntar'} på godkännande`,
                time: 'nu',
                href: '/dashboard/drafts',
            })
        }

        // Betalda ärenden (senaste 3)
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
                text: `${c.debtor_name} betalade ${c.amount?.toLocaleString('sv-SE')} ${c.currency}`,
                time: c.updated_at,
                href: `/dashboard/claims/${c.id}`,
            })
        })

        // Eskalerade ärenden (senaste 3)
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
                type: 'warning',
                text: `${c.debtor_name} har eskalerats`,
                time: c.updated_at,
                href: `/dashboard/claims/${c.id}`,
            })
        })

        // Svar från gäldenär (senaste 3)
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
                type: 'info',
                text: `Svar från ${(r as any).claims?.debtor_name || 'gäldenär'}`,
                time: r.created_at,
                href: '/dashboard/drafts',
            })
        })

        notifications.sort((a, b) => {
            if (a.time === 'nu') return -1
            if (b.time === 'nu') return 1
            return new Date(b.time).getTime() - new Date(a.time).getTime()
        })

        return NextResponse.json({
            notifications: notifications.slice(0, 6),
            pendingEmailsCount,
            // Totalt antal aktiva ärenden (för "nya ärenden"-toasten i layout)
            claimsCount: (paidClaims?.length || 0) + (escalated?.length || 0),
        })
    } catch (err: any) {
        console.error('[Notifications Error]', err.message)
        return NextResponse.json({ notifications: [], pendingEmailsCount: 0, claimsCount: 0 })
    }
}
