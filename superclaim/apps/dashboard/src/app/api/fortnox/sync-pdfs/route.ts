import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { fetchInvoicePdf, uploadInvoicePdf } from '@/lib/fortnox/fortnox'

/**
 * POST /api/fortnox/sync-pdfs
 * Backfill: Fetch PDFs from Fortnox for existing claims that don't have attachment_url
 */
export async function POST() {
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

        if (!org) return NextResponse.json({ error: 'Organisation saknas' }, { status: 400 })

        // Check Fortnox connection
        const { data: settings } = await admin
            .from('org_settings')
            .select('fortnox_connected')
            .eq('org_id', org.id)
            .single()

        if (!settings?.fortnox_connected) {
            return NextResponse.json({ error: 'Fortnox ej kopplat' }, { status: 400 })
        }

        // Find all Fortnox claims without attachment_url
        const { data: claims } = await admin
            .from('claims')
            .select('id, invoice_number')
            .eq('org_id', org.id)
            .eq('source', 'fortnox')
            .is('attachment_url', null)
            .not('invoice_number', 'is', null)

        if (!claims || claims.length === 0) {
            return NextResponse.json({ message: 'Alla ärenden har redan PDF', synced: 0 })
        }

        let synced = 0
        const errors: string[] = []

        for (const claim of claims) {
            try {
                const pdfBuffer = await fetchInvoicePdf(org.id, claim.invoice_number)
                if (!pdfBuffer) {
                    errors.push(`Faktura ${claim.invoice_number}: PDF ej tillgänglig`)
                    continue
                }

                const url = await uploadInvoicePdf(org.id, claim.invoice_number, pdfBuffer)
                if (!url) {
                    errors.push(`Faktura ${claim.invoice_number}: Upload misslyckades`)
                    continue
                }

                await admin
                    .from('claims')
                    .update({ attachment_url: url })
                    .eq('id', claim.id)

                synced++
            } catch (err: any) {
                errors.push(`Faktura ${claim.invoice_number}: ${err.message}`)
            }
        }

        return NextResponse.json({
            message: `Synkade ${synced} av ${claims.length} faktura-PDF:er`,
            synced,
            total: claims.length,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
