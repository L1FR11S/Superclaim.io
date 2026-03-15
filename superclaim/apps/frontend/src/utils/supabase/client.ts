import { createBrowserClient } from '@supabase/ssr'

// No cookie domain — session is passed via URL token to app.superclaim.io
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
    )
}
