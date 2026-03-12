import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeMicrosoftCode, getMicrosoftEmail } from '@/lib/email/microsoft'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const state = searchParams.get('state')

        if (!code || !state) {
            return NextResponse.redirect(new URL('/dashboard/settings?tab=channels&error=missing_params', request.url))
        }

        const { orgId } = JSON.parse(Buffer.from(state, 'base64url').toString())
        const result = await exchangeMicrosoftCode(code)
        const email = await getMicrosoftEmail(result.accessToken)

        const admin = createAdminClient()

        // Read existing tokens to preserve other providers
        const { data: existing } = await admin
            .from('org_settings').select('email_provider_tokens').eq('org_id', orgId).single()
        const allTokens = existing?.email_provider_tokens || {}

        await admin.from('org_settings').update({
            email_provider: 'microsoft',
            email_provider_address: email,
            email_provider_tokens: {
                ...allTokens,
                microsoft: {
                    access_token: result.accessToken,
                    expires_on: result.expiresOn,
                    account: result.account,
                    email,
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
