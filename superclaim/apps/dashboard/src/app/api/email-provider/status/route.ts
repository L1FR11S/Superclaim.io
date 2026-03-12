import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: org } = await admin
            .from('organizations').select('id').eq('email', user.email).single()
        if (!org) return NextResponse.json({ provider: 'agentmail' })

        const { data: settings } = await admin
            .from('org_settings')
            .select('email_provider, email_provider_address')
            .eq('org_id', org.id)
            .single()

        return NextResponse.json({
            provider: settings?.email_provider || 'agentmail',
            address: settings?.email_provider_address || null,
        })
    } catch (err: any) {
        return NextResponse.json({ provider: 'agentmail', error: err.message })
    }
}
