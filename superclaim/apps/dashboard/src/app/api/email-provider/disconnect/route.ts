import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: org } = await admin
            .from('organizations').select('id').eq('email', user.email).single()
        if (!org) return NextResponse.json({ error: 'No org' }, { status: 404 })

        await admin.from('org_settings').update({
            email_provider: 'agentmail',
            email_provider_address: null,
            email_provider_tokens: null,
        }).eq('org_id', org.id)

        return NextResponse.json({ message: 'E-postleverantör frånkopplad' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
