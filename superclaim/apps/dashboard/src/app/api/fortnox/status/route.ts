import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/fortnox/status
 * Check if Fortnox is connected for the current org
 */
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ connected: false })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ connected: false })

        const { data: settings } = await admin
            .from('org_settings')
            .select('fortnox_connected, fortnox_last_import_at, fortnox_auto_import')
            .eq('org_id', org.id)
            .single()

        return NextResponse.json({
            connected: settings?.fortnox_connected || false,
            lastImportAt: settings?.fortnox_last_import_at || null,
            autoImport: settings?.fortnox_auto_import || false,
        })
    } catch {
        return NextResponse.json({ connected: false })
    }
}
