import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Only API and static files are truly public on app.superclaim.io
    const isApiRoute = path.startsWith('/api/')
    const isStaticFile = path.startsWith('/_next/') || path.includes('.')

    if (isApiRoute || isStaticFile) {
        return NextResponse.next()
    }

    // Protected route — check auth
    let supabaseResponse = NextResponse.next({ request })

    const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, {
                            ...options,
                            ...(cookieDomain ? { domain: cookieDomain } : {}),
                        })
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Not logged in → redirect to frontend login
    if (!user) {
        const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'
        const loginUrl = new URL(`${frontendUrl}/login`)
        loginUrl.searchParams.set('redirectTo', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${path}`)
        return NextResponse.redirect(loginUrl.toString())
    }

    // Logged in → check onboarding status
    const isOnboardingOrApi = path.startsWith('/api/') || path.startsWith('/_next/')

    if (!isOnboardingOrApi) {
        try {
            const { data: org } = await supabase
                .from('organizations')
                .select('onboarding_step')
                .ilike('email', user.email || '')
                .single()

            if (org && typeof org.onboarding_step === 'number' && org.onboarding_step < 3) {
                const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3001'
                return NextResponse.redirect(`${frontendUrl}/onboarding`)
            }
        } catch {
            // No org found — allow through
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.png|logo.svg|erp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
