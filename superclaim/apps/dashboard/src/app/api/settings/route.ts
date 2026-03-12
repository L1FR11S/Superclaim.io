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
                sms_enabled: false,
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
                sms_enabled: false,
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
        const {
            tone, step_delays, sms_enabled, email_preview, agent_flow,
            sms_preview, fortnox_auto_import, sms_sender_name,
            pre_reminder_enabled, pre_reminder_days, pre_reminder_channels,
        } = body

        const { data, error } = await admin
            .from('org_settings')
            .upsert({
                org_id: org.id,
                ...(tone !== undefined && { tone }),
                ...(step_delays !== undefined && { step_delays }),
                ...(sms_enabled !== undefined && { sms_enabled }),
                ...(email_preview !== undefined && { email_preview }),
                ...(agent_flow !== undefined && { agent_flow }),
                ...(sms_preview !== undefined && { sms_preview }),
                ...(fortnox_auto_import !== undefined && { fortnox_auto_import }),
                ...(sms_sender_name !== undefined && { sms_sender_name }),
                ...(pre_reminder_enabled !== undefined && { pre_reminder_enabled }),
                ...(pre_reminder_days !== undefined && { pre_reminder_days }),
                ...(pre_reminder_channels !== undefined && { pre_reminder_channels }),
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
