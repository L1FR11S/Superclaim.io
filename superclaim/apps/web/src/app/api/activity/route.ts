import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// GET — Fetch recent agent activity for the org
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ activities: [], source: 'unauthorized' })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ activities: [], source: 'no-org' })

        const { data: comms } = await admin
            .from('claim_communications')
            .select('id, claim_id, channel, direction, subject, body, step, created_at, claims(debtor_name, amount, currency, invoice_number)')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })
            .limit(50)

        const { data: runs } = await admin
            .from('agent_runs')
            .select('id, started_at, completed_at, claims_processed, emails_sent, sms_sent, errors, status')
            .eq('org_id', org.id)
            .order('started_at', { ascending: false })
            .limit(20)

        // Merge and sort by timestamp
        const activities: any[] = []

        if (comms) {
            for (const c of comms) {
                activities.push({
                    id: c.id,
                    type: c.channel, // 'email' | 'sms'
                    direction: c.direction,
                    title: c.channel === 'email'
                        ? (c.direction === 'outbound' ? 'E-post skickad' : 'Svar mottaget')
                        : (c.direction === 'outbound' ? 'SMS skickat' : 'SMS mottaget'),
                    description: c.channel === 'email' ? c.subject : (c.body?.substring(0, 80) + (c.body && c.body.length > 80 ? '...' : '')),
                    debtor: (c.claims as any)?.debtor_name || 'Okänd',
                    amount: (c.claims as any)?.amount,
                    currency: (c.claims as any)?.currency,
                    step: c.step,
                    timestamp: c.created_at,
                })
            }
        }

        if (runs) {
            for (const r of runs) {
                activities.push({
                    id: r.id,
                    type: 'agent_run',
                    direction: 'system',
                    title: 'Agentkörning',
                    description: `Bearbetade ${r.claims_processed || 0} ärenden — ${r.emails_sent || 0} mejl, ${r.sms_sent || 0} SMS${r.errors?.length ? `, ${r.errors.length} fel` : ''}`,
                    debtor: null,
                    amount: null,
                    currency: null,
                    step: null,
                    timestamp: r.started_at,
                    status: r.status,
                })
            }
        }

        // Sort by timestamp descending
        activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        return NextResponse.json({ activities: activities.slice(0, 50), source: 'database' })
    } catch (err: any) {
        return NextResponse.json({ activities: [], source: 'error', error: err.message })
    }
}
