import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Admin client using service role key — bypasses RLS
// Lazy-initialized to avoid build-time crash when env vars aren't available
let _client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
    if (!_client) {
        _client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
        )
    }
    return _client
}

// Named export for backwards compat
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get(_, prop) {
        return (getSupabaseAdmin() as any)[prop]
    },
})
