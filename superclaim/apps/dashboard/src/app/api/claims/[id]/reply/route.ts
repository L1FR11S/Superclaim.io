import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { sendCollectionEmail, replyToMessage } from '@/lib/email/agentmail'

/**
 * POST /api/claims/[id]/reply
 * Send a manual reply to a debtor from the dashboard.
 * If messageId is provided, replies in the same thread via reply-all.
 * Otherwise sends a new email.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()

        // Get org
        const { data: org } = await admin
            .from('organizations')
            .select('id, name')
            .eq('email', user.email)
            .single()
        if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

        // Get claim
        const { data: claim } = await admin
            .from('claims')
            .select('id, org_id, debtor_email, debtor_name, current_step, agentmail_thread_id')
            .eq('id', id)
            .eq('org_id', org.id)
            .single()
        if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

        // Get org settings for inbox
        const { data: settings } = await admin
            .from('org_settings')
            .select('agentmail_inbox_id')
            .eq('org_id', org.id)
            .single()

        if (!settings?.agentmail_inbox_id) {
            return NextResponse.json({ error: 'Ingen AgentMail-inbox konfigurerad' }, { status: 400 })
        }

        const body = await request.json()
        const { subject, message, messageId } = body

        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Meddelande krävs' }, { status: 400 })
        }

        let sent: any

        if (messageId) {
            // Reply in same thread via reply-all
            sent = await replyToMessage({
                inboxId: settings.agentmail_inbox_id,
                messageId,
                body: message,
            })
        } else {
            // New email
            sent = await sendCollectionEmail({
                inboxId: settings.agentmail_inbox_id,
                to: claim.debtor_email,
                subject: subject || `Re: Ärende ${claim.debtor_name}`,
                body: message,
            })
        }

        // Log as outbound communication
        await admin.from('claim_communications').insert({
            claim_id: claim.id,
            org_id: claim.org_id,
            step: claim.current_step,
            channel: 'email',
            direction: 'outbound',
            subject: subject || sent.subject || `Re: Ärende ${claim.debtor_name}`,
            body: message,
            agentmail_message_id: sent.messageId || sent.message_id,
            agentmail_thread_id: sent.threadId || sent.thread_id,
        })

        return NextResponse.json({
            message: 'Svar skickat',
            messageId: sent.messageId || sent.message_id,
        })
    } catch (err: any) {
        console.error('[Reply Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
