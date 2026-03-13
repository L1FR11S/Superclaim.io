import { NextResponse } from 'next/server'
import { processInboundEmail, findClaimByThreadId } from '@/lib/email/inbound'

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

        console.info('[Webhook/AgentMail] Received:', JSON.stringify(payload).slice(0, 500))

        if (eventType === 'message.received') {
            const message = payload.message || payload.data || payload
            const threadId = message.thread_id
            const body = message.text || message.body || message.text_body || ''
            const subject = message.subject || ''
            const from = message.from_ || message.from || ''

            console.info(`[Webhook/AgentMail] Parsed: thread_id=${threadId}, from=${from}, subject=${subject}`)

            if (!threadId) {
                console.warn('[Webhook/AgentMail] No thread_id found in payload')
                return NextResponse.json({ message: 'No thread_id, skipping' })
            }

            const claim = await findClaimByThreadId(threadId)
            if (!claim) {
                console.warn(`[Webhook/AgentMail] No claim found for thread ${threadId}`)
                return NextResponse.json({ message: 'No matching claim' })
            }

            const result = await processInboundEmail({
                claimId: claim.id,
                orgId: claim.org_id,
                currentStep: claim.current_step,
                debtorName: claim.debtor_name,
                claimStatus: claim.status,
                subject,
                body,
                from,
                messageId: message.message_id,
                threadId,
                provider: 'agentmail',
            })

            return NextResponse.json({
                message: result.skipped ? 'Duplicate, skipped' : 'Reply logged, claim paused, notification created',
                claimId: claim.id,
            })
        }

        return NextResponse.json({ message: `Event ${eventType} acknowledged` })
    } catch (err: any) {
        console.error('[Webhook/AgentMail Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

