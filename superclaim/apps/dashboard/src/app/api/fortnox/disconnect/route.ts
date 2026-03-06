import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * POST /api/fortnox/disconnect
 * Remove Fortnox connection for the current org
 */
export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ error: 'Organisation saknas' }, { status: 400 })

        await admin
            .from('org_settings')
            .update({
                fortnox_access_token: null,
                fortnox_refresh_token: null,
                fortnox_token_expires_at: null,
                fortnox_connected: false,
                fortnox_auto_import: false,
                updated_at: new Date().toISOString(),
            })
            .eq('org_id', org.id)

        return NextResponse.json({ message: 'Fortnox frånkopplat' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
