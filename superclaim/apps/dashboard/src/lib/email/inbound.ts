/**
 * Shared inbound email handler — used by AgentMail, Google, and Microsoft webhooks.
 * Logs the reply, pauses the claim, and creates a notification.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

interface ProcessInboundParams {
    claimId: string
    orgId: string
    currentStep: number
    debtorName: string
    claimStatus: string
    subject: string
    body: string
    from: string
    messageId?: string
    threadId?: string
    provider: 'agentmail' | 'google' | 'microsoft'
}

/**
 * Process an inbound email reply:
 * 1. Deduplication check
 * 2. Log in claim_communications
 * 3. Pause the claim
 * 4. Create notification
 * 
 * Returns { success, skipped } — skipped=true means dedup caught it.
 */
export async function processInboundEmail({
    claimId,
    orgId,
    currentStep,
    debtorName,
    claimStatus,
    subject,
    body,
    from,
    messageId,
    threadId,
    provider,
}: ProcessInboundParams): Promise<{ success: boolean; skipped: boolean }> {

    // ── Deduplication: check if this exact message was already logged ──
    if (messageId) {
        const { count } = await supabaseAdmin
            .from('claim_communications')
            .select('id', { count: 'exact', head: true })
            .eq('claim_id', claimId)
            .eq('direction', 'inbound')
            .eq('agentmail_message_id', messageId)

        if ((count || 0) > 0) {
            console.log(`[Inbound] Skipping duplicate message ${messageId} for claim ${claimId}`)
            return { success: true, skipped: true }
        }
    }

    // 1. Log the inbound communication
    await supabaseAdmin.from('claim_communications').insert({
        claim_id: claimId,
        org_id: orgId,
        step: currentStep,
        channel: 'email',
        direction: 'inbound',
        subject,
        body,
        agentmail_message_id: messageId || null,
        agentmail_thread_id: threadId || null,
        metadata: { provider, from },
    })

    // 2. Pause the claim to stop further auto-escalation
    if (claimStatus === 'active') {
        await supabaseAdmin.from('claims').update({
            paused: true,
            updated_at: new Date().toISOString(),
        }).eq('id', claimId)
    }

    // 3. Create a notification
    await supabaseAdmin.from('notifications').insert({
        org_id: orgId,
        type: 'reply',
        text: `📩 ${debtorName} har svarat på ärende`,
        href: `/dashboard/claims/${claimId}`,
    })

    console.info(`[Inbound] ${provider}: Reply from ${from} on claim ${claimId} (${debtorName}) — claim paused`)

    return { success: true, skipped: false }
}

/**
 * Find a claim by matching a thread ID from claim_communications.
 * Works for AgentMail, Gmail, and Microsoft (all store thread IDs in agentmail_thread_id).
 */
export async function findClaimByThreadId(threadId: string) {
    // First check claim_communications for outbound messages with this thread
    const { data: comm } = await supabaseAdmin
        .from('claim_communications')
        .select('claim_id, org_id')
        .eq('agentmail_thread_id', threadId)
        .eq('direction', 'outbound')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!comm) return null

    const { data: claim } = await supabaseAdmin
        .from('claims')
        .select('id, org_id, current_step, debtor_name, status')
        .eq('id', comm.claim_id)
        .single()

    return claim
}
