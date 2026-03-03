import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Public routes — skip all auth logic
    const publicRoutes = ['/', '/login', '/registrera', '/auth/callback']
    const isPublicRoute = publicRoutes.some(route => path === route)
    const isApiRoute = path.startsWith('/api/')
    const isStaticFile = path.startsWith('/_next/') || path.includes('.')

    if (isPublicRoute || isApiRoute || isStaticFile) {
        return NextResponse.next()
    }

    // Protected route — check auth
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({ request })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Not logged in → redirect to login
    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirectTo', path)
        return NextResponse.redirect(url)
    }

    // Logged in → check onboarding status (skip if already on /onboarding)
    const onboardingPaths = ['/onboarding', '/api/', '/_next/']
    const isOnboardingOrApi = onboardingPaths.some(p => path.startsWith(p))

    if (!isOnboardingOrApi) {
        try {
            const { data: org } = await supabase
                .from('organizations')
                .select('onboarding_step')
                .ilike('email', user.email || '')
                .single()

            // Only redirect if org exists AND onboarding is explicitly incomplete
            if (org && typeof org.onboarding_step === 'number' && org.onboarding_step < 3) {
                const url = request.nextUrl.clone()
                url.pathname = '/onboarding'
                return NextResponse.redirect(url)
            }
        } catch {
            // No org found or column missing — allow through
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|icon.png|logo.svg|erp|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
