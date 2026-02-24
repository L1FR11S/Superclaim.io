import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// E-post preview/approve API
export async function GET() {
    const MOCK_DRAFTS = [
        {
            id: 'draft-1',
            claim_id: 'acme-123',
            to: 'ekonomi@acme.se',
            subject: 'Påminnelse: Faktura INV-2025-001 förfallen',
            body: 'Hej Acme Corp,\n\nVi vill vänligt påminna om att faktura INV-2025-001 på 14 500 SEK förföll den 12 oktober 2025. Vi ber dig vänligen att genomföra betalningen snarast möjligt.\n\nOm betalning redan har skett, vänligen bortse från detta meddelande.\n\nMed vänliga hälsningar,\nSuperclaim AI',
            tone: 'professional',
            step: 2,
            status: 'pending',
            created_at: new Date().toISOString(),
            claims: { debtor_name: 'Acme Corp AB', debtor_email: 'ekonomi@acme.se', amount: 14500, currency: 'SEK', invoice_number: 'INV-2025-001' },
        },
        {
            id: 'draft-2',
            claim_id: 'sven-345',
            to: 'faktura@svensson.se',
            subject: 'Viktigt: Obetald faktura INV-2025-005',
            body: 'Hej Svensson & Co,\n\nTrots tidigare påminnelser har vi inte mottagit betalning för faktura INV-2025-005 på 115 000 SEK. Fakturan förföll den 5 oktober 2025.\n\nVi ber dig att omgående reglera skulden för att undvika ytterligare åtgärder via inkasso.\n\nMed vänliga hälsningar,\nSuperclaim AI',
            tone: 'professional',
            step: 3,
            status: 'pending',
            created_at: new Date(Date.now() - 3600_000).toISOString(),
            claims: { debtor_name: 'Svensson & Co', debtor_email: 'faktura@svensson.se', amount: 115000, currency: 'SEK', invoice_number: 'INV-2025-005' },
        },
    ];

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return NextResponse.json({ drafts: MOCK_DRAFTS, source: 'mock' })

        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ drafts: MOCK_DRAFTS, source: 'mock' })

        // Fetch pending email drafts
        const { data: drafts } = await supabase
            .from('email_drafts')
            .select('*, claims(debtor_name, debtor_email, amount, currency, invoice_number)')
            .eq('org_id', org.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (!drafts || drafts.length === 0) {
            // Return mock drafts as fallback
            return NextResponse.json({ drafts: MOCK_DRAFTS, source: 'mock' })
        }

        return NextResponse.json({ drafts, source: 'database' })
    } catch {
        return NextResponse.json({ drafts: MOCK_DRAFTS, source: 'error' })
    }
}

// Approve or reject a draft
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { draftId, action } = body // action: 'approve' | 'reject' | 'edit'

        if (action === 'approve') {
            // Mark draft as approved — agent will send it
            await supabase
                .from('email_drafts')
                .update({ status: 'approved', approved_at: new Date().toISOString() })
                .eq('id', draftId)

            return NextResponse.json({ message: 'Mejl godkänt och schemalagt för skickning' })
        }

        if (action === 'reject') {
            await supabase
                .from('email_drafts')
                .update({ status: 'rejected' })
                .eq('id', draftId)

            return NextResponse.json({ message: 'Mejl avslaget' })
        }

        if (action === 'edit') {
            const { subject, body: newBody } = body
            await supabase
                .from('email_drafts')
                .update({ subject, body: newBody, status: 'pending' })
                .eq('id', draftId)

            return NextResponse.json({ message: 'Utkast uppdaterat' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
