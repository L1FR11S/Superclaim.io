import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export type NotificationType = 'info' | 'success' | 'warning'

export interface Notification {
    id: string
    text: string
    time: string
    type: NotificationType
    href?: string
}

function formatTime(iso: string): string {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Nu'
    if (diffMins < 60) return `${diffMins} min sedan`
    if (diffHours < 24) return `${diffHours} tim sedan`
    if (diffDays < 7) return `${diffDays} dagar sedan`
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

export async function GET() {
    const defaultNotifications: Notification[] = [
        { id: '1', text: 'Acme Corp öppnade ditt mejl', time: '2 min sedan', type: 'info' },
        { id: '2', text: 'Globex Inc har betalat 4 200 SEK', time: '1 timme sedan', type: 'success', href: '/dashboard/claims' },
        { id: '3', text: 'TechNova Solutions — steg 4 skickat', time: '3 timmar sedan', type: 'warning' },
    ]

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({
                notifications: defaultNotifications,
                pendingEmailsCount: 2,
                claimsCount: 8,
                unreadCount: 3,
            })
        }

        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) {
            return NextResponse.json({
                notifications: defaultNotifications,
                pendingEmailsCount: 2,
                claimsCount: 8,
                unreadCount: 3,
            })
        }

        const notifications: Notification[] = []
        let pendingEmailsCount = 0

        const { data: drafts } = await supabase
            .from('email_drafts')
            .select('id, created_at')
            .eq('org_id', org.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(5)

        pendingEmailsCount = drafts?.length ?? 0

        if (drafts && drafts.length > 0) {
            notifications.push({
                id: 'drafts-summary',
                text: drafts.length === 1
                    ? '1 mejl väntar på godkännande'
                    : `${drafts.length} mejl väntar på godkännande`,
                time: formatTime(drafts[0].created_at),
                type: 'warning',
                href: '/dashboard/emails',
            })
        }

        const { data: claims } = await supabase
            .from('claims')
            .select('id, debtor_name, amount, currency, status, paid_at, created_at')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (claims) {
            const paid = claims.filter((c: any) => c.status === 'paid' && c.paid_at)
            for (const c of paid.slice(0, 2)) {
                const claim = c as any
                notifications.push({
                    id: `paid-${claim.id}`,
                    text: `${claim.debtor_name} har betalat ${Number(claim.amount || 0).toLocaleString('sv-SE')} ${claim.currency || 'SEK'}`,
                    time: formatTime(claim.paid_at || claim.created_at),
                    type: 'success',
                    href: '/dashboard/claims',
                })
            }
        }

        const sorted = notifications.slice(0, 10)

        const { count } = await supabase
            .from('claims')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', org.id)

        return NextResponse.json({
            notifications: sorted.length > 0 ? sorted : defaultNotifications,
            pendingEmailsCount,
            claimsCount: count ?? 0,
            unreadCount: Math.max(sorted.length, 1),
        })
    } catch {
        return NextResponse.json({
            notifications: defaultNotifications,
            pendingEmailsCount: 2,
            claimsCount: 8,
            unreadCount: 3,
        })
    }
}
