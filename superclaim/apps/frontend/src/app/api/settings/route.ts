import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

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

        if (!org) {
            return NextResponse.json({
                tone: 'professional',
                step_delays: { step1: 3, step2: 7, step3: 7, step4: 8 },
                email_preview: true,
                agentmail_inbox_id: null,
                source: 'default',
            })
        }

        const { data: settings } = await admin
            .from('org_settings')
            .select('*')
            .eq('org_id', org.id)
            .single()

        if (!settings) {
            return NextResponse.json({
                tone: 'professional',
                step_delays: { step1: 3, step2: 7, step3: 7, step4: 8 },
                email_preview: true,
                agentmail_inbox_id: null,
                source: 'default',
            })
        }

        return NextResponse.json({ ...settings, source: 'database' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
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
        const { tone, step_delays, email_preview, agent_flow, sms_preview } = body

        const { data, error } = await admin
            .from('org_settings')
            .upsert({
                org_id: org.id,
                ...(tone !== undefined && { tone }),
                ...(step_delays !== undefined && { step_delays }),
                ...(email_preview !== undefined && { email_preview }),
                ...(agent_flow !== undefined && { agent_flow }),
                ...(sms_preview !== undefined && { sms_preview }),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ message: 'Inställningar sparade', settings: data })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
