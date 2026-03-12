import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: org } = await admin
            .from('organizations').select('id').eq('email', user.email).single()
        if (!org) return NextResponse.json({ error: 'No org' }, { status: 404 })

        const body = await request.json().catch(() => ({}))
        const provider = body.provider // 'google' | 'microsoft'

        if (provider) {
            // Disconnect specific provider — remove its tokens but keep others
            const { data: settings } = await admin
                .from('org_settings').select('email_provider, email_provider_tokens').eq('org_id', org.id).single()
            const allTokens = settings?.email_provider_tokens || {}
            delete allTokens[provider]

            const update: any = { email_provider_tokens: allTokens }

            // If disconnecting the active provider, fall back to agentmail
            if (settings?.email_provider === provider) {
                update.email_provider = 'agentmail'
                update.email_provider_address = null
            }

            await admin.from('org_settings').update(update).eq('org_id', org.id)
            return NextResponse.json({ message: `${provider} frånkopplad` })
        }

        // Disconnect all
        await admin.from('org_settings').update({
            email_provider: 'agentmail',
            email_provider_address: null,
            email_provider_tokens: null,
        }).eq('org_id', org.id)

        return NextResponse.json({ message: 'Alla e-postleverantörer frånkopplade' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
