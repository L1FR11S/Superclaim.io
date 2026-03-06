import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const admin = createAdminClient()

/**
 * POST /api/test/claim → skapa testärende
 * DELETE /api/test/claim?id=xxx → radera testärende
 * PATCH /api/test/claim?id=xxx → hoppa över delay (next_action_at = nu)
 */

export async function POST(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('email', user.email)
        .single()
    if (!org) return NextResponse.json({ error: 'No org' }, { status: 400 })

    const { data: orgSettings } = await admin
        .from('org_settings')
        .select('agent_flow')
        .eq('org_id', org.id)
        .single()

    // Skapa ett redan förfallet testärende
    const { data: claim, error } = await admin.from('claims').insert({
        org_id: org.id,
        debtor_name: 'Test Gäldenär AB',
        debtor_email: 'test@example.com',
        debtor_phone: '+46708229236',
        invoice_number: `TEST-${Date.now()}`,
        amount: 12345,
        currency: 'SEK',
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: 'active',
        current_step: 0,
        next_action_at: new Date().toISOString(),
        agent_flow: orgSettings?.agent_flow ?? null,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ claim })
}

export async function PATCH(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data, error } = await admin
        .from('claims')
        .update({ next_action_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ claim: data })
}

export async function DELETE(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Radera relaterade kommunikationer
    await admin.from('claim_communications').delete().eq('claim_id', id)
    await admin.from('email_drafts').delete().eq('claim_id', id)
    await admin.from('sms_drafts').delete().eq('claim_id', id)

    const { error } = await admin.from('claims').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data: claim } = await admin.from('claims').select('*').eq('id', id).single()
    const { data: comms } = await admin.from('claim_communications').select('*').eq('claim_id', id).order('created_at')
    const { data: drafts } = await admin.from('email_drafts').select('*').eq('claim_id', id).order('created_at')
    const { data: smsDrafts } = await admin.from('sms_drafts').select('*').eq('claim_id', id).order('created_at')

    return NextResponse.json({ claim, communications: comms || [], drafts: drafts || [], smsDrafts: smsDrafts || [] })
}
