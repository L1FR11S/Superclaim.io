import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { stopGmailWatch } from '@/lib/email/gmail'
import { deleteGraphSubscription } from '@/lib/email/microsoft'

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
            // Disconnect specific provider — cleanup watch/subscription, then remove tokens
            const { data: settings } = await admin
                .from('org_settings').select('email_provider, email_provider_tokens').eq('org_id', org.id).single()
            const allTokens = settings?.email_provider_tokens || {}

            // Cleanup watch/subscription before removing tokens
            if (provider === 'google' && allTokens.google?.access_token && allTokens.google?.refresh_token) {
                try {
                    await stopGmailWatch({
                        accessToken: allTokens.google.access_token,
                        refreshToken: allTokens.google.refresh_token,
                    })
                    console.info(`[Disconnect] Stopped Gmail watch for org ${org.id}`)
                } catch (err: any) {
                    console.warn(`[Disconnect] Failed to stop Gmail watch:`, err.message)
                }
            }

            if (provider === 'microsoft' && allTokens.microsoft?.access_token && allTokens.microsoft?.subscription_id) {
                try {
                    await deleteGraphSubscription({
                        accessToken: allTokens.microsoft.access_token,
                        subscriptionId: allTokens.microsoft.subscription_id,
                    })
                    console.info(`[Disconnect] Deleted Graph subscription for org ${org.id}`)
                } catch (err: any) {
                    console.warn(`[Disconnect] Failed to delete Graph subscription:`, err.message)
                }
            }

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

