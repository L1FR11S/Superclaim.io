import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/notifications — hämta notiser från tabellen
 * PATCH /api/notifications — markera notiser som lästa
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ notifications: [], unreadCount: 0 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()
        if (!org) return NextResponse.json({ notifications: [], unreadCount: 0 })

        // Hämta senaste 20 notiser
        const { data: notifications } = await admin
            .from('notifications')
            .select('*')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })
            .limit(20)

        // Räkna olästa
        const { count: unreadCount } = await admin
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', org.id)
            .is('read_at', null)

        // Räkna pending drafts (för bell badge)
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

        const pendingDraftsCount = (pendingEmailDrafts || 0) + (pendingSmsDrafts || 0)

        return NextResponse.json({
            notifications: (notifications || []).map(n => ({
                id: n.id,
                type: n.type,
                text: n.text,
                href: n.href,
                time: n.created_at,
                read: !!n.read_at,
            })),
            unreadCount: unreadCount || 0,
            pendingDraftsCount,
        })
    } catch (err: any) {
        console.error('[Notifications Error]', err.message)
        return NextResponse.json({ notifications: [], unreadCount: 0, pendingDraftsCount: 0 })
    }
}

/**
 * PATCH /api/notifications — markera notiser som lästa
 * Body: { ids: string[] } eller { all: true }
 */
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()
        if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

        const body = await request.json()
        const now = new Date().toISOString()

        if (body.all) {
            // Markera alla som lästa
            await admin
                .from('notifications')
                .update({ read_at: now })
                .eq('org_id', org.id)
                .is('read_at', null)
        } else if (body.ids?.length > 0) {
            // Markera specifika som lästa
            await admin
                .from('notifications')
                .update({ read_at: now })
                .eq('org_id', org.id)
                .in('id', body.ids)
        }

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[Notifications PATCH Error]', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
