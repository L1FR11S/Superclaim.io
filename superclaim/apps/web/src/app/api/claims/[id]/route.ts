import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

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

        const { data: claim, error } = await admin
            .from('claims')
            .select('*')
            .eq('id', id)
            .eq('org_id', org.id)
            .single()

        if (error || !claim) {
            return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
        }

        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(claim.due_date).getTime()) / 86400000))

        const { data: timelineRows } = await admin
            .from('claim_communications')
            .select('*')
            .eq('claim_id', id)
            .order('created_at', { ascending: true })

        const timeline = (timelineRows || []).map((r: any) => ({
            step: r.step,
            channel: r.channel || 'email',
            subject: r.subject || '',
            body: r.body || '',
            sentAt: r.created_at,
            openedAt: r.opened_at || null,
        }))

        return NextResponse.json({
            claim: { ...claim, days_overdue: daysOverdue },
            timeline,
            source: 'database',
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

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
        const { action } = body

        const updates: Record<string, any> = { updated_at: new Date().toISOString() }

        switch (action) {
            case 'pause': updates.paused = true; break
            case 'resume': updates.paused = false; break
            case 'cancel': updates.status = 'cancelled'; break
            case 'escalate': updates.status = 'escalated'; break
            default: return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
        }

        const { error } = await admin
            .from('claims')
            .update(updates)
            .eq('id', id)
            .eq('org_id', org.id)

        if (error) throw error

        return NextResponse.json({ message: `Ärende ${action}` })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
