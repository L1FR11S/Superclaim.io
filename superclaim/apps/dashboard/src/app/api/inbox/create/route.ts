import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { createPod, createAgentInbox } from '@/lib/email/agentmail'

/**
 * POST /api/inbox/create
 * Creates a Pod + unique AgentMail inbox for the authenticated user's org.
 * Called during onboarding (step 3: Activate).
 *
 * Flow: Create Pod → Create Inbox in Pod → Save both IDs
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()

        let org: { id: string; name: string } | null = null

        const { data: existingOrg } = await admin
            .from('organizations')
            .select('id, name')
            .eq('email', user.email)
            .single()

        if (existingOrg) {
            org = existingOrg
        } else {
            const orgName = user.user_metadata?.company_name || user.email?.split('@')[0] || 'My Org'
            const { data: newOrg, error } = await admin
                .from('organizations')
                .insert({ name: orgName, email: user.email! })
                .select('id, name')
                .single()
            if (error || !newOrg) return NextResponse.json({ error: 'Could not create organization' }, { status: 500 })
            org = newOrg
        }

        const { data: settings } = await admin
            .from('org_settings')
            .select('agentmail_inbox_id, agentmail_pod_id')
            .eq('org_id', org.id)
            .single()

        if (settings?.agentmail_inbox_id) {
            return NextResponse.json({
                message: 'Inbox redan skapad',
                inbox_id: settings.agentmail_inbox_id,
                pod_id: settings.agentmail_pod_id,
                already_exists: true,
            })
        }

        const body = await request.json().catch(() => ({}))
        const displayName = body.displayName || `${org.name} Inkasso`

        // 1. Create a Pod for this customer
        const pod = await createPod(org.name)
        const podId = (pod as any).podId || (pod as any).pod_id

        // 2. Create inbox within the Pod
        const inbox = await createAgentInbox({
            displayName,
            podId,
            domain: body.domain || undefined,
        })
        const inboxId = (inbox as any).inboxId || (inbox as any).inbox_id

        // 3. Save both IDs in org_settings
        await admin
            .from('org_settings')
            .upsert({
                org_id: org.id,
                agentmail_inbox_id: inboxId,
                agentmail_pod_id: podId,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })

        return NextResponse.json({
            message: 'Pod & inbox skapad!',
            pod_id: podId,
            inbox_id: inboxId,
            display_name: (inbox as any).displayName || displayName,
        })
    } catch (err: any) {
        console.error('[Inbox Create Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
