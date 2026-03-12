import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { exchangeGoogleCode, getGoogleEmail } from '@/lib/email/gmail'

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
        const email = await getGoogleEmail(tokens.access_token!)

        const admin = createAdminClient()
        await admin.from('org_settings').update({
            email_provider: 'google',
            email_provider_address: email,
            email_provider_tokens: {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date,
            },
        }).eq('org_id', orgId)

        // Redirect back to settings with success
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        return NextResponse.redirect(`${baseUrl}/dashboard/settings?tab=channels&provider=google&connected=true`)
    } catch (err: any) {
        console.error('[google-callback] Error:', err.message)
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
        return NextResponse.redirect(`${baseUrl}/dashboard/settings?tab=channels&error=${encodeURIComponent(err.message)}`)
    }
}
