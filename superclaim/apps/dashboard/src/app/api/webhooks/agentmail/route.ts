import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/webhooks/agentmail
 * Receives incoming email events from AgentMail (e.g. debtor replies)
 */
export async function POST(request: Request) {
    try {
        const payload = await request.json()
        const eventType = payload.event_type || payload.type

        if (eventType === 'message.received') {
            const message = payload.data || payload
            const threadId = message.thread_id
            const inboxId = message.inbox_id
            const body = message.text || message.body || ''
            const subject = message.subject || ''
            const from = message.from || ''

            if (!threadId) {
                return NextResponse.json({ message: 'No thread_id, skipping' })
            }

            // Find the claim associated with this thread
            const { data: claim } = await supabaseAdmin
                .from('claims')
                .select('id, org_id, current_step, debtor_name')
                .eq('agentmail_thread_id', threadId)
                .single()

            if (!claim) {
                console.log(`[Webhook] No claim found for thread ${threadId}`)
                return NextResponse.json({ message: 'No matching claim' })
            }

            // Log the inbound communication
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

            console.log(`[Webhook] Logged reply from ${from} on claim ${claim.id} (${claim.debtor_name})`)

            return NextResponse.json({ message: 'Reply logged', claimId: claim.id })
        }

        return NextResponse.json({ message: `Event ${eventType} not handled` })
    } catch (err: any) {
        console.error('[Webhook Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
