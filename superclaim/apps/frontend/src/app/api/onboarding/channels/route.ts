import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { createPod, createAgentInbox } from '@/lib/email/agentmail'

/**
 * PUT /api/onboarding/channels
 * Create AgentMail pod + inbox with customer-chosen username and display name.
 */
export async function PUT(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id, name')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ error: 'Organisation saknas – slutför steg 1 först' }, { status: 400 })

        const body = await request.json()
        const { preferred_erp, inbox_username, inbox_display_name } = body

        // Check if inbox already exists
        const { data: existingSettings } = await admin
            .from('org_settings')
            .select('agentmail_inbox_id, agentmail_pod_id')
            .eq('org_id', org.id)
            .single()

        let inboxId = existingSettings?.agentmail_inbox_id
        let podId = existingSettings?.agentmail_pod_id

        // Create AgentMail pod + inbox with customer's chosen identity
        if (!inboxId) {
            // Sanitize username from form (or fall back to company name)
            const username = inbox_username
                ? inbox_username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)
                : org.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 30)

            const displayName = inbox_display_name || org.name

            // Create the customer's dedicated pod (clientId = org.id for matching)
            const pod = await createPod(org.name, org.id)
            podId = (pod as any).podId

            // Create inbox inside the pod — throws if username is taken
            const inbox = await createAgentInbox({
                username,
                displayName,
                podId,
            })
            inboxId = (inbox as any).inboxId
        }

        await admin
            .from('org_settings')
            .upsert({
                org_id: org.id,
                ...(preferred_erp !== undefined && { preferred_erp }),
                ...(inboxId && { agentmail_inbox_id: inboxId }),
                ...(podId && { agentmail_pod_id: podId }),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })

        await admin
            .from('organizations')
            .update({ onboarding_step: 2 })
            .eq('id', org.id)

        return NextResponse.json({
            message: 'Kanaler konfigurerade',
            onboarding_step: 2,
            inbox_id: inboxId || null,
            preferred_erp: preferred_erp || null,
        })
    } catch (err: any) {
        console.error('[Onboarding Channels Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
