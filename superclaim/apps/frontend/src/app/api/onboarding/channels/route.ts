import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { createPod, createAgentInbox } from '@/lib/email/agentmail'

/**
 * PUT /api/onboarding/channels
 * Auto-create AgentMail inbox during onboarding step 2.
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
        const { preferred_erp } = body

        // Check if inbox already exists
        const { data: existingSettings } = await admin
            .from('org_settings')
            .select('agentmail_inbox_id, agentmail_pod_id')
            .eq('org_id', org.id)
            .single()

        let inboxId = existingSettings?.agentmail_inbox_id
        let podId = existingSettings?.agentmail_pod_id

        // Auto-create AgentMail inbox if not exists
        if (!inboxId) {
            try {
                // Derive a clean inbox ID from the company name
                // e.g. "Karlsson Bygg AB" → "karlssonbygg"
                const baseId = org.name
                    .toLowerCase()
                    .replace(/\s+/g, '')         // remove spaces
                    .replace(/[^a-z0-9]/g, '')   // only alphanumeric
                    .slice(0, 30)                 // max 30 chars

                const pod = await createPod(org.name)
                podId = (pod as any).podId || (pod as any).pod_id

                const inbox = await createAgentInbox({
                    inboxId: baseId || undefined,
                    displayName: `${org.name} Inkasso`,
                    podId,
                })
                inboxId = (inbox as any).inboxId || (inbox as any).inbox_id
            } catch (emailErr: any) {
                console.error('[AgentMail Error]', emailErr)
                // Don't block onboarding if email setup fails
            }
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
