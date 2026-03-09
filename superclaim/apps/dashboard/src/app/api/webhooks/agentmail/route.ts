import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/webhooks/agentmail
 * Receives incoming email events from AgentMail (e.g. debtor replies).
 * 
 * When a debtor replies:
 * 1. Logs the reply in claim_communications
 * 2. Pauses the claim (sets paused=true) to prevent further escalation
 * 3. Creates a notification for the user
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json()
        const eventType = payload.event_type || payload.type

        if (eventType === 'message.received') {
            const message = payload.data || payload
            const threadId = message.thread_id
            const body = message.text || message.body || ''
            const subject = message.subject || ''
            const from = message.from || ''

            if (!threadId) {
                return NextResponse.json({ message: 'No thread_id, skipping' })
            }

            // Find the claim associated with this thread
            const { data: claim } = await supabaseAdmin
                .from('claims')
                .select('id, org_id, current_step, debtor_name, status')
                .eq('agentmail_thread_id', threadId)
                .single()

            if (!claim) {
                console.warn(`[Webhook] No claim found for thread ${threadId}`)
                return NextResponse.json({ message: 'No matching claim' })
            }

            // 1. Log the inbound communication
            await supabaseAdmin.from('claim_communications').insert({
                claim_id: claim.id,
                org_id: claim.org_id,
                step: claim.current_step,
                channel: 'email',
                direction: 'inbound',
                subject,
                body,
                agentmail_message_id: message.message_id,
                agentmail_thread_id: threadId,
            })

            // 2. Pause the claim to stop further auto-escalation
            if (claim.status === 'active') {
                await supabaseAdmin.from('claims').update({
                    paused: true,
                    updated_at: new Date().toISOString(),
                }).eq('id', claim.id)
            }

            // 3. Create a notification
            await supabaseAdmin.from('notifications').insert({
                org_id: claim.org_id,
                type: 'reply',
                text: `📩 ${claim.debtor_name} har svarat på ärende`,
                href: `/dashboard/claims/${claim.id}`,
            })

            console.info(`[Webhook] Reply from ${from} on claim ${claim.id} (${claim.debtor_name}) — claim paused`)

            return NextResponse.json({
                message: 'Reply logged, claim paused, notification created',
                claimId: claim.id,
            })
        }

        // Acknowledge all other event types without processing
        return NextResponse.json({ message: `Event ${eventType} acknowledged` })
    } catch (err: any) {
        console.error('[Webhook Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
