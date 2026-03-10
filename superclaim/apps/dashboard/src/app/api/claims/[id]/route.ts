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

        const { data: emailDraftRows } = await admin
            .from('email_drafts')
            .select('*')
            .eq('claim_id', id)
            .order('created_at', { ascending: true })

        const { data: smsDraftRows } = await admin
            .from('sms_drafts')
            .select('*')
            .eq('claim_id', id)
            .order('created_at', { ascending: true })

        const timeline = [
            ...(timelineRows || []).map((r: any) => ({
                step: r.step,
                channel: r.channel || 'email',
                direction: r.direction || 'outbound',
                subject: r.subject || '',
                body: r.body || '',
                sentAt: r.created_at,
                openedAt: r.opened_at || null,
                status: 'sent',
                agentmail_message_id: r.agentmail_message_id || null,
            })),
            ...(emailDraftRows || []).map((r: any) => ({
                step: r.step,
                channel: 'email' as const,
                subject: r.subject || '',
                body: r.body || '',
                sentAt: r.created_at,
                openedAt: null,
                status: r.status === 'sent' ? 'sent' : r.status === 'rejected' ? 'rejected' : 'draft',
                draftId: r.status === 'pending' ? r.id : undefined,
                draftType: r.status === 'pending' ? 'email' as const : undefined,
            })),
            ...(smsDraftRows || []).map((r: any) => ({
                step: r.step,
                channel: 'sms' as const,
                subject: '',
                body: r.body || '',
                sentAt: r.created_at,
                openedAt: null,
                status: r.status === 'sent' ? 'sent' : r.status === 'rejected' ? 'rejected' : 'draft',
                draftId: r.status === 'pending' ? r.id : undefined,
                draftType: r.status === 'pending' ? 'sms' as const : undefined,
            })),
        ].filter(e => e.status !== 'rejected')
            .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())

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
            case 'skip_delay': updates.next_action_at = new Date().toISOString(); break
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

export async function DELETE(
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

        const { error } = await admin
            .from('claims')
            .delete()
            .eq('id', id)
            .eq('org_id', org.id)

        if (error) {
            console.error('[DELETE claims] Supabase error:', JSON.stringify(error))
            return NextResponse.json({
                error: error.message,
                code: error.code,
                details: error.details,
            }, { status: 500 })
        }

        return NextResponse.json({ message: 'Ärende borttaget' })
    } catch (err: any) {
        console.error('[DELETE claims] Unexpected error:', err.message)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
