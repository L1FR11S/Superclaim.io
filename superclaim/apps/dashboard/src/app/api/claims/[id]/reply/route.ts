import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { sendCollectionEmail, replyToMessage } from '@/lib/email/agentmail'
import { sendEmailViaProvider } from '@/lib/email/send'

/**
 * POST /api/claims/[id]/reply
 * Send a manual reply to a debtor from the dashboard.
 * If messageId is provided, replies in the same thread via reply-all.
 * Otherwise sends a new email via selected provider.
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

        // Get org settings for inbox + email provider
        const { data: settings } = await admin
            .from('org_settings')
            .select('agentmail_inbox_id, email_provider, email_provider_address, email_provider_tokens')
            .eq('org_id', org.id)
            .single()

        const body = await request.json()
        const { subject, message, messageId } = body

        if (!message || !message.trim()) {
            return NextResponse.json({ error: 'Meddelande krävs' }, { status: 400 })
        }

        let sent: any

        if (messageId && settings?.agentmail_inbox_id && (settings?.email_provider ?? 'agentmail') === 'agentmail') {
            // Reply in same thread via AgentMail reply-all (only when provider is AgentMail)
            sent = await replyToMessage({
                inboxId: settings.agentmail_inbox_id,
                messageId,
                body: message,
            })
        } else {
            // For Gmail/other: find original thread to reply in-thread
            let gmailThreadId: string | undefined
            let inReplyToId: string | undefined
            if (messageId) {
                // Lookup the original communication for its threadId
                const { data: origComm } = await admin
                    .from('claim_communications')
                    .select('agentmail_thread_id, agentmail_message_id')
                    .eq('claim_id', id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()
                if (origComm?.agentmail_thread_id) gmailThreadId = origComm.agentmail_thread_id
                if (origComm?.agentmail_message_id) inReplyToId = origComm.agentmail_message_id
            }

            // Send via configured provider (Gmail, etc.)
            sent = await sendEmailViaProvider({
                to: claim.debtor_email,
                subject: subject || `Re: Ärende ${claim.debtor_name}`,
                body: message,
                orgSettings: {
                    email_provider: settings?.email_provider ?? 'agentmail',
                    email_provider_address: settings?.email_provider_address,
                    email_provider_tokens: settings?.email_provider_tokens,
                    agentmail_inbox_id: settings?.agentmail_inbox_id,
                },
                threadId: gmailThreadId,
                inReplyTo: inReplyToId,
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
