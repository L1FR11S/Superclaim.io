import { createClient } from '@supabase/supabase-js'

/**
 * Service-role klient — kringgår RLS.
 * Används ENDAST i API-routes på server-sidan, aldrig i klientkod.
 */
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )
}
