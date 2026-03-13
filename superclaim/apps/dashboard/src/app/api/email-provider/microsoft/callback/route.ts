import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeMicrosoftCodeDirect, getMicrosoftEmail, createGraphSubscription } from '@/lib/email/microsoft'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code || !state) {
            return NextResponse.redirect(new URL('/dashboard/settings?tab=channels&error=missing_params', request.url))
        }

        const { orgId } = JSON.parse(Buffer.from(state, 'base64url').toString())
        
        // Use direct OAuth2 exchange to get refresh_token
        const result = await exchangeMicrosoftCodeDirect(code)
        const email = await getMicrosoftEmail(result.accessToken)

        const admin = createAdminClient()

        // Read existing tokens to preserve other providers
        const { data: existing } = await admin
            .from('org_settings').select('email_provider_tokens').eq('org_id', orgId).single()
        const allTokens = existing?.email_provider_tokens || {}

        // Start Graph subscription for inbox monitoring
        let subscriptionId = ''
        let subscriptionExpiration = ''
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.superclaim.io'}/api/webhooks/microsoft`
        const webhookSecret = process.env.MICROSOFT_WEBHOOK_SECRET || ''

        try {
            const sub = await createGraphSubscription({
                accessToken: result.accessToken,
                webhookUrl,
                secret: webhookSecret,
            })
            subscriptionId = sub.subscriptionId
            subscriptionExpiration = sub.expiration
            console.info(`[Microsoft Callback] Graph subscription created: ${subscriptionId}`)
        } catch (subErr: any) {
            console.error('[Microsoft Callback] Failed to create Graph subscription:', subErr.message)
            // Continue anyway — subscription can be retried by cron
        }

        await admin.from('org_settings').update({
            email_provider: 'microsoft',
            email_provider_address: email,
            email_provider_tokens: {
                ...allTokens,
                microsoft: {
                    access_token: result.accessToken,
                    refresh_token: result.refreshToken,
                    expires_on: result.expiresOn,
                    email,
                    subscription_id: subscriptionId || undefined,
                    subscription_expiration: subscriptionExpiration || undefined,
                },
            },
        }).eq('org_id', orgId)

        return new NextResponse(
            `<html><body><script>window.close();</script><p>Ansluten! Du kan stänga detta fönster.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        )
    } catch (err: any) {
        console.error('[microsoft-callback] Error:', err.message)
        return new NextResponse(
            `<html><body><script>window.close();</script><p>Fel: ${err.message}</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
        )
    }
}

