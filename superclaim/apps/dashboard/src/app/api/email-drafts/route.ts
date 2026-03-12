import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ drafts: [], source: 'unauthorized' })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ drafts: [], source: 'no-org' })

        const { data: drafts } = await admin
            .from('email_drafts')
            .select('*, claims(debtor_name, debtor_email, amount, currency, invoice_number)')
            .eq('org_id', org.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        return NextResponse.json({ drafts: drafts || [], source: 'database' })
    } catch (err: any) {
        return NextResponse.json({ drafts: [], source: 'error', error: err.message })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const body = await request.json()
        const { draftId, action } = body

        if (action === 'approve') {
            const { data: draft } = await admin
                .from('email_drafts')
                .select('*, claims(debtor_email, org_id, current_step, agentmail_thread_id)')
                .eq('id', draftId)
                .single()

            if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

            const { data: settings } = await admin
                .from('org_settings')
                .select('agentmail_inbox_id, step_delays, email_provider, email_provider_address, email_provider_tokens')
                .eq('org_id', draft.org_id)
                .single()

            let sentResult: { messageId?: string; threadId?: string } = {}

            const { sendEmailViaProvider } = await import('@/lib/email/send')
            sentResult = await sendEmailViaProvider({
                to: draft.to,
                subject: draft.subject,
                body: draft.body,
                orgSettings: {
                    email_provider: settings?.email_provider ?? 'agentmail',
                    email_provider_address: settings?.email_provider_address,
                    email_provider_tokens: settings?.email_provider_tokens,
                    agentmail_inbox_id: settings?.agentmail_inbox_id,
                },
            })

            // Uppdatera draften till 'sent'
            await admin
                .from('email_drafts')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', draftId)

            // Logga till claim_communications så det syns i kommunikationshistoriken
            await admin.from('claim_communications').insert({
                claim_id: draft.claim_id,
                org_id: draft.org_id,
                step: draft.step,
                channel: 'email',
                direction: 'outbound',
                subject: draft.subject,
                body: draft.body,
                agentmail_message_id: sentResult.messageId || null,
                agentmail_thread_id: sentResult.threadId || null,
            })

            const delays = settings?.step_delays || { step1: 3, step2: 7, step3: 7, step4: 8 }
            const delayKey = `step${draft.step}`
            const delayDays = (delays as Record<string, number>)[delayKey] ?? 7
            const nextActionAt = new Date()
            nextActionAt.setDate(nextActionAt.getDate() + delayDays)

            await admin
                .from('claims')
                .update({
                    current_step: draft.step,
                    last_action_at: new Date().toISOString(),
                    next_action_at: nextActionAt.toISOString(),
                    agentmail_thread_id: sentResult.threadId || (draft.claims as any)?.agentmail_thread_id,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', draft.claim_id)

            return NextResponse.json({ message: 'Mejl godkänt och skickat' })

        }

        if (action === 'reject') {
            await admin.from('email_drafts').update({ status: 'rejected' }).eq('id', draftId)
            return NextResponse.json({ message: 'Mejl avslaget' })
        }

        if (action === 'edit') {
            const { subject, body: newBody } = body
            if (typeof subject !== 'string' || typeof newBody !== 'string')
                return NextResponse.json({ error: 'Subject and body required' }, { status: 400 })
            await admin.from('email_drafts').update({ subject, body: newBody, status: 'pending' }).eq('id', draftId)
            return NextResponse.json({ message: 'Utkast uppdaterat' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
