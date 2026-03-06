import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { createDomain, getDomain, verifyDomain } from '@/lib/email/agentmail'

/**
 * GET /api/domains
 * Fetch the current custom domain status + DNS records for the org.
 */
export async function GET() {
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
        if (!org) return NextResponse.json({ domain: null })

        const { data: settings } = await admin
            .from('org_settings')
            .select('custom_domain, custom_domain_status, custom_domain_records')
            .eq('org_id', org.id)
            .single()

        if (!settings?.custom_domain) {
            return NextResponse.json({ domain: null })
        }

        // Refresh status from AgentMail
        try {
            const domainData = await getDomain(settings.custom_domain)
            const records = (domainData as any).records || []
            const status = (domainData as any).status || settings.custom_domain_status

            // Update cached status
            await admin
                .from('org_settings')
                .update({ custom_domain_status: status, custom_domain_records: records })
                .eq('org_id', org.id)

            return NextResponse.json({
                domain: settings.custom_domain,
                status,
                records,
            })
        } catch {
            // Return cached data if AgentMail API fails
            return NextResponse.json({
                domain: settings.custom_domain,
                status: settings.custom_domain_status,
                records: settings.custom_domain_records || [],
            })
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * POST /api/domains
 * Register a new custom domain with AgentMail.
 */
export async function POST(request: Request) {
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
        if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

        const body = await request.json()
        const { domain } = body
        if (!domain || typeof domain !== 'string') {
            return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
        }

        const result = await createDomain(domain)
        const records = (result as any).records || []
        const status = (result as any).status || 'NOT_STARTED'

        await admin
            .from('org_settings')
            .upsert({
                org_id: org.id,
                custom_domain: domain,
                custom_domain_status: status,
                custom_domain_records: records,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })

        return NextResponse.json({
            message: 'Domän registrerad! Lägg till DNS-posterna nedan.',
            domain,
            status,
            records,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

/**
 * PUT /api/domains
 * Trigger DNS verification and optionally create a new inbox with the verified domain.
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
        if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

        const { data: settings } = await admin
            .from('org_settings')
            .select('custom_domain, agentmail_inbox_id')
            .eq('org_id', org.id)
            .single()

        if (!settings?.custom_domain) {
            return NextResponse.json({ error: 'No domain registered' }, { status: 400 })
        }

        // Trigger verification
        await verifyDomain(settings.custom_domain)

        // Check status after verification
        const domainData = await getDomain(settings.custom_domain)
        const status = (domainData as any).status || 'NOT_STARTED'
        const records = (domainData as any).records || []

        // Update cached status
        await admin
            .from('org_settings')
            .update({
                custom_domain_status: status,
                custom_domain_records: records,
                updated_at: new Date().toISOString(),
            })
            .eq('org_id', org.id)

        // If verified, create a new inbox with the custom domain
        if (status === 'VERIFIED' || status === 'ACTIVE') {
            const { createAgentInbox } = await import('@/lib/email/agentmail')
            const displayName = `${org.name} Inkasso`
            const inbox = await createAgentInbox({ displayName, domain: settings.custom_domain })

            await admin
                .from('org_settings')
                .update({ agentmail_inbox_id: (inbox as any).inboxId || (inbox as any).inbox_id })
                .eq('org_id', org.id)

            return NextResponse.json({
                message: 'Domän verifierad! Ny inbox skapad.',
                status,
                records,
                inbox_id: (inbox as any).inboxId || (inbox as any).inbox_id,
            })
        }

        return NextResponse.json({
            message: status === 'NOT_STARTED' ? 'DNS-posterna har inte lagts till ännu.' : 'Verifiering pågår, kontrollera DNS-posterna.',
            status,
            records,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
