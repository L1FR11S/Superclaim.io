import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Shared cookie options — domain allows session sharing between
// superclaim.io and app.superclaim.io
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN // e.g. ".superclaim.io"

export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: cookieDomain ? { domain: cookieDomain } : undefined,
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, {
                                ...options,
                                ...(cookieDomain ? { domain: cookieDomain } : {}),
                            })
                        )
                    } catch {
                        // Called from a Server Component - safe to ignore
                    }
                },
            },
        }
    )
}
