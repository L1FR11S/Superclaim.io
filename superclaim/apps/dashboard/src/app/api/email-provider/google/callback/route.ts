import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeGoogleCode, getGoogleProfile, watchGmailInbox } from '@/lib/email/gmail'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code || !state) {
            return NextResponse.redirect(new URL('/dashboard/settings?tab=channels&error=missing_params', request.url))
        }

        const { orgId } = JSON.parse(Buffer.from(state, 'base64url').toString())
        const tokens = await exchangeGoogleCode(code)
        const { email, name } = await getGoogleProfile(tokens.access_token!)

        const admin = createAdminClient()

        // Read existing tokens to preserve other providers
        const { data: existing } = await admin
            .from('org_settings').select('email_provider_tokens').eq('org_id', orgId).single()
        const allTokens = existing?.email_provider_tokens || {}

        // Start Gmail watch for inbox push notifications
        let watchExpiration = ''
        let watchHistoryId = ''
        const topicName = process.env.GOOGLE_PUBSUB_TOPIC || ''

        if (topicName && tokens.access_token && tokens.refresh_token) {
            try {
                const watch = await watchGmailInbox({
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    topicName,
                })
                watchExpiration = watch.expiration
                watchHistoryId = watch.historyId
                console.info(`[Google Callback] Gmail watch started, expires: ${watchExpiration}`)
            } catch (watchErr: any) {
                console.error('[Google Callback] Failed to start Gmail watch:', watchErr.message)
                // Continue anyway — watch can be retried by cron
            }
        }

        await admin.from('org_settings').update({
            email_provider: 'google',
            email_provider_address: email,
            email_provider_tokens: {
                ...allTokens,
                google: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                    email,
                    name: name || undefined,
                    watch_expiration: watchExpiration || undefined,
                    watch_history_id: watchHistoryId || undefined,
                },
            },
        }).eq('org_id', orgId)

        return new NextResponse(
            `<html><body><script>window.close();</script><p>Ansluten! Du kan stänga detta fönster.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        )
    } catch (err: any) {
        console.error('[google-callback] Error:', err.message)
        return new NextResponse(
            `<html><body><script>window.close();</script><p>Fel: ${err.message}</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        )
    }
}

