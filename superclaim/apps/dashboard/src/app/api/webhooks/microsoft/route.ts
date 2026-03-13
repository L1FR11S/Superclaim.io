import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getMicrosoftMessage, refreshMicrosoftTokenViaRefreshToken } from '@/lib/email/microsoft'
import { processInboundEmail, findClaimByThreadId } from '@/lib/email/inbound'

/**
 * POST /api/webhooks/microsoft
 * Receives Microsoft Graph change notifications when new emails arrive.
 * 
 * Handles two scenarios:
 * 1. Validation: Microsoft sends ?validationToken=xxx at subscription creation → echo it back
 * 2. Change notification: process the new message
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const validationToken = searchParams.get('validationToken')

        // ── Subscription validation handshake ──
        if (validationToken) {
            console.info('[Webhook/Microsoft] Validation request, echoing token')
            return new NextResponse(validationToken, {
                status: 200,
                headers: { 'Content-Type': 'text/plain' },
            })
        }

        const payload = await request.json()
        const notifications = payload.value || []

        console.info(`[Webhook/Microsoft] Received ${notifications.length} notification(s)`)

        const webhookSecret = process.env.MICROSOFT_WEBHOOK_SECRET || ''

        for (const notification of notifications) {
            // Verify clientState if set
            if (webhookSecret && notification.clientState !== webhookSecret) {
                console.warn('[Webhook/Microsoft] Invalid clientState, skipping')
                continue
            }

            const resourceData = notification.resourceData
            if (!resourceData?.id) {
                console.warn('[Webhook/Microsoft] No resourceData.id, skipping')
                continue
            }

            const messageId = resourceData.id

            // Find the org by looking up the subscription — we store org_id context
            // via the tenantId or by matching email_provider_tokens.microsoft
            // Since Graph subscriptions are user-delegated, the notification includes tenantId
            const subscriptionId = notification.subscriptionId

            // Look up which org owns this subscription
            const { data: orgSettings } = await supabaseAdmin
                .from('org_settings')
                .select('org_id, email_provider_tokens, email_provider_address')
                .eq('email_provider', 'microsoft')
                .not('email_provider_tokens', 'is', null)

            // Find the org whose Microsoft subscription_id matches
            const matchedOrg = orgSettings?.find(s => {
                const msTokens = s.email_provider_tokens?.microsoft
                return msTokens?.subscription_id === subscriptionId
            })

            if (!matchedOrg) {
                console.warn(`[Webhook/Microsoft] No org found for subscription ${subscriptionId}`)
                continue
            }

            const msTokens = matchedOrg.email_provider_tokens?.microsoft
            if (!msTokens?.access_token) {
                console.warn(`[Webhook/Microsoft] No access token for org ${matchedOrg.org_id}`)
                continue
            }

            // Refresh token if needed
            let accessToken = msTokens.access_token
            if (msTokens.expires_on && new Date(msTokens.expires_on) <= new Date()) {
                if (!msTokens.refresh_token) {
                    console.error(`[Webhook/Microsoft] No refresh token for org ${matchedOrg.org_id}`)
                    continue
                }
                try {
                    const refreshed = await refreshMicrosoftTokenViaRefreshToken(msTokens.refresh_token)
                    accessToken = refreshed.accessToken

                    // Update stored tokens
                    await supabaseAdmin.from('org_settings').update({
                        email_provider_tokens: {
                            ...matchedOrg.email_provider_tokens,
                            microsoft: {
                                ...msTokens,
                                access_token: accessToken,
                                refresh_token: refreshed.refreshToken,
                                expires_on: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
                            },
                        },
                    }).eq('org_id', matchedOrg.org_id)
                } catch (refreshErr: any) {
                    console.error(`[Webhook/Microsoft] Token refresh failed:`, refreshErr.message)
                    continue
                }
            }

            try {
                // Fetch the full message
                const msg = await getMicrosoftMessage({ accessToken, messageId })

                // Skip our own sent messages
                const orgEmail = matchedOrg.email_provider_address?.toLowerCase() || ''
                if (msg.from.toLowerCase() === orgEmail) continue

                // Try matching by conversationId (stored as threadId in claim_communications)
                const claim = await findClaimByThreadId(msg.conversationId)
                if (!claim) {
                    console.info(`[Webhook/Microsoft] No matching claim for conversationId ${msg.conversationId}`)
                    continue
                }

                await processInboundEmail({
                    claimId: claim.id,
                    orgId: claim.org_id,
                    currentStep: claim.current_step,
                    debtorName: claim.debtor_name,
                    claimStatus: claim.status,
                    subject: msg.subject,
                    body: msg.body,
                    from: msg.from,
                    messageId: msg.messageId,
                    threadId: msg.conversationId,
                    provider: 'microsoft',
                })
            } catch (msgErr: any) {
                console.error(`[Webhook/Microsoft] Failed to process message ${messageId}:`, msgErr.message)
            }
        }

        // Microsoft requires 202 Accepted response
        return new NextResponse(null, { status: 202 })
    } catch (err: any) {
        console.error('[Webhook/Microsoft Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
