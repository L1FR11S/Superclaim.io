import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ drafts: [], source: 'unauthorized' })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ drafts: [], source: 'no-org' })

        const { data: drafts } = await admin
            .from('sms_drafts')
            .select('*, claims(debtor_name, debtor_phone, amount, currency, invoice_number)')
            .eq('org_id', org.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        return NextResponse.json({ drafts: drafts || [], source: 'database' })
    } catch (err: any) {
        return NextResponse.json({ drafts: [], source: 'error', error: err.message })
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const body = await request.json()
        const { draftId, action } = body

        if (action === 'approve') {
            const { data: draft } = await admin
                .from('sms_drafts')
                .select('*, claims(debtor_phone, org_id)')
                .eq('id', draftId)
                .single()

            if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

            const { data: settings } = await admin
                .from('org_settings')
                .select('sms_sender_name')
                .eq('org_id', draft.org_id)
                .single()

            const { data: org } = await admin
                .from('organizations')
                .select('name')
                .eq('id', draft.org_id)
                .single()

            const { sendSms } = await import('@/lib/sms/elks')
            const smsFrom = settings?.sms_sender_name || org?.name || 'Superclaim'

            const smsResult = await sendSms({
                from: smsFrom,
                to: draft.to,
                message: draft.body,
            })

            await admin
                .from('sms_drafts')
                .update({ status: 'approved', sent_at: new Date().toISOString() })
                .eq('id', draftId)

            await admin.from('claim_communications').insert({
                claim_id: draft.claim_id,
                org_id: draft.org_id,
                step: draft.step,
                channel: 'sms',
                direction: 'outbound',
                body: draft.body,
                metadata: { elks_id: smsResult.id, cost: smsResult.cost },
            })

            return NextResponse.json({ message: 'SMS godkänt och skickat' })
        }

        if (action === 'reject') {
            await admin.from('sms_drafts').update({ status: 'rejected' }).eq('id', draftId)
            return NextResponse.json({ message: 'SMS avslaget' })
        }

        if (action === 'edit') {
            const { body: newBody } = body
            if (typeof newBody !== 'string')
                return NextResponse.json({ error: 'Body required' }, { status: 400 })
            await admin.from('sms_drafts').update({ body: newBody, status: 'pending' }).eq('id', draftId)
            return NextResponse.json({ message: 'SMS-utkast uppdaterat' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
