import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGmailHistoryMessages, refreshGoogleToken } from '@/lib/email/gmail'
import { processInboundEmail, findClaimByThreadId } from '@/lib/email/inbound'

/**
 * POST /api/webhooks/google
 * Receives Gmail Pub/Sub push notifications when new emails arrive.
 * 
 * Payload from Google Pub/Sub:
 * { message: { data: base64({ emailAddress, historyId }), messageId, publishTime } }
 */
export async function POST(request: NextRequest) {
    try {
        const payload = await request.json()
        const pubsubMessage = payload.message

        if (!pubsubMessage?.data) {
            return NextResponse.json({ message: 'No data in message' })
        }

        // Decode the Pub/Sub data
        const decoded = JSON.parse(
            Buffer.from(pubsubMessage.data, 'base64').toString('utf-8')
        )
        const emailAddress = decoded.emailAddress
        const historyId = decoded.historyId

        console.info(`[Webhook/Google] Notification for ${emailAddress}, historyId=${historyId}`)

        if (!emailAddress || !historyId) {
            return NextResponse.json({ message: 'Missing emailAddress or historyId' })
        }

        // Find the org that owns this Gmail account
        const { data: settings } = await supabaseAdmin
            .from('org_settings')
            .select('org_id, email_provider_tokens')
            .eq('email_provider', 'google')
            .eq('email_provider_address', emailAddress)
            .single()

        if (!settings) {
            console.warn(`[Webhook/Google] No org found for ${emailAddress}`)
            return NextResponse.json({ message: 'No matching org' })
        }

        const googleTokens = settings.email_provider_tokens?.google
        if (!googleTokens?.access_token || !googleTokens?.refresh_token) {
            console.warn(`[Webhook/Google] No Google tokens for ${emailAddress}`)
            return NextResponse.json({ message: 'No tokens' })
        }

        // Refresh access token if needed
        let accessToken = googleTokens.access_token
        if (googleTokens.expiry_date && Date.now() >= googleTokens.expiry_date) {
            const refreshed = await refreshGoogleToken(googleTokens.refresh_token)
            accessToken = refreshed.access_token || accessToken

            // Update stored token
            await supabaseAdmin.from('org_settings').update({
                email_provider_tokens: {
                    ...settings.email_provider_tokens,
                    google: {
                        ...googleTokens,
                        access_token: accessToken,
                        expiry_date: refreshed.expiry_date || googleTokens.expiry_date,
                    },
                },
            }).eq('org_id', settings.org_id)
        }

        // Get stored historyId to fetch messages since last check
        const startHistoryId = googleTokens.watch_history_id || historyId
        
        // Fetch new messages
        const { messages, newHistoryId } = await getGmailHistoryMessages({
            accessToken,
            refreshToken: googleTokens.refresh_token,
            startHistoryId,
        })

        // Update stored historyId
        await supabaseAdmin.from('org_settings').update({
            email_provider_tokens: {
                ...settings.email_provider_tokens,
                google: {
                    ...googleTokens,
                    access_token: accessToken,
                    watch_history_id: newHistoryId,
                },
            },
        }).eq('org_id', settings.org_id)

        console.info(`[Webhook/Google] Found ${messages.length} new messages for ${emailAddress}`)

        // Process each message — check if it's a reply to one of our claims
        let repliesProcessed = 0
        for (const msg of messages) {
            if (!msg.threadId) continue

            // Try to match by Gmail thread ID stored in claim_communications
            const claim = await findClaimByThreadId(msg.threadId)
            if (!claim) continue

            // Skip our own outbound messages
            const fromLower = msg.from.toLowerCase()
            if (fromLower.includes(emailAddress.toLowerCase())) continue

            const result = await processInboundEmail({
                claimId: claim.id,
                orgId: claim.org_id,
                currentStep: claim.current_step,
                debtorName: claim.debtor_name,
                claimStatus: claim.status,
                subject: msg.subject,
                body: msg.body,
                from: msg.from,
                messageId: msg.messageId,
                threadId: msg.threadId,
                provider: 'google',
            })

            if (!result.skipped) repliesProcessed++
        }

        return NextResponse.json({
            message: `Processed ${messages.length} messages, ${repliesProcessed} replies logged`,
        })
    } catch (err: any) {
        console.error('[Webhook/Google Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
