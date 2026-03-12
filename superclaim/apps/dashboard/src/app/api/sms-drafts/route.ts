import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { sendSms } from '@/lib/sms/elks'

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
            const { data: draft, error: draftError } = await admin
                .from('sms_drafts')
                .select('*')
                .eq('id', draftId)
                .single()

            if (draftError || !draft) {
                return NextResponse.json({ error: `Draft not found: ${draftError?.message}`, step: 'fetch_draft' }, { status: 404 })
            }

            // Fetch sender name from org_settings
            const { data: orgSettings } = await admin
                .from('org_settings')
                .select('sms_sender_name')
                .eq('org_id', draft.org_id)
                .single()

            // Send SMS via 46elks
            let smsResult: Awaited<ReturnType<typeof sendSms>>
            try {
                smsResult = await sendSms({
                    from: orgSettings?.sms_sender_name || 'Superclaim',
                    to: draft.to,
                    message: draft.body,
                })
            } catch (smsErr: any) {
                console.error('[sms-drafts] sendSms failed:', smsErr.message)
                return NextResponse.json({ error: `46elks: ${smsErr.message}`, step: 'send_sms' }, { status: 500 })
            }

            // Update draft status
            const { error: updateErr } = await admin
                .from('sms_drafts')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', draftId)
            if (updateErr) {
                console.error('[sms-drafts] update draft failed:', updateErr.message)
                return NextResponse.json({ error: `DB update: ${updateErr.message}`, step: 'update_draft' }, { status: 500 })
            }

            // Log to claim_communications
            const { error: insertErr } = await admin.from('claim_communications').insert({
                claim_id: draft.claim_id,
                org_id: draft.org_id,
                step: draft.step,
                channel: 'sms',
                direction: 'outbound',
                body: draft.body,
                metadata: { elks_id: smsResult.id, cost: smsResult.cost },
            })
            if (insertErr) {
                console.error('[sms-drafts] insert communication failed:', insertErr.message)
                // Don't fail — SMS was sent, just log the error
            }

            return NextResponse.json({ message: 'SMS godkänt och skickat', smsId: smsResult.id })
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
        return NextResponse.json({
            error: err.message,
            name: err.name,
            stack: err.stack?.substring(0, 300),
        }, { status: 500 })
    }
}
