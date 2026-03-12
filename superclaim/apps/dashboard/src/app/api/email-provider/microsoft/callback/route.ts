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
        await admin.from('org_settings').update({
            email_provider: 'microsoft',
            email_provider_address: email,
            email_provider_tokens: {
                access_token: result.accessToken,
                expires_on: result.expiresOn,
                account: result.account,
            },
        }).eq('org_id', orgId)

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        return NextResponse.redirect(`${baseUrl}/dashboard/settings?tab=channels&provider=microsoft&connected=true`)
    } catch (err: any) {
        console.error('[microsoft-callback] Error:', err.message)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        return NextResponse.redirect(`${baseUrl}/dashboard/settings?tab=channels&error=${encodeURIComponent(err.message)}`)
    }
}
