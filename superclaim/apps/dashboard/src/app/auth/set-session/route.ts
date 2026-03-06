import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /auth/set-session
 * Called by superclaim.io after login to establish a session on app.superclaim.io.
 * Receives access_token + refresh_token as URL params, sets the session via Supabase,
 * then redirects to the intended destination.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')
    const next = searchParams.get('next') || '/dashboard'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    if (!accessToken || !refreshToken) {
        return NextResponse.redirect(`${appUrl}/auth/error?message=missing_tokens`)
    }

    try {
        const supabase = await createClient()
        const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
        })

        if (error) {
            console.error('[set-session] Error:', error.message)
            const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'
            return NextResponse.redirect(`${frontendUrl}/login?error=session_failed`)
        }

        // Session set — redirect to dashboard
        return NextResponse.redirect(`${appUrl}${next}`)
    } catch (err) {
        console.error('[set-session] Unexpected error:', err)
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'
        return NextResponse.redirect(`${frontendUrl}/login?error=session_error`)
    }
}
