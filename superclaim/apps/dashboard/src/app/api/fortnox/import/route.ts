import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { fetchOverdueInvoices, fetchUpcomingInvoices, fetchCustomer, fetchInvoicePdf, uploadInvoicePdf } from '@/lib/fortnox/fortnox'

/**
 * POST /api/fortnox/import
 * Import overdue + upcoming invoices from Fortnox → create claims
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

        // Check Fortnox connection + pre-reminder settings
        const { data: settings } = await admin
            .from('org_settings')
            .select('fortnox_connected, agent_flow, pre_reminder_enabled, pre_reminder_days')
            .eq('org_id', org.id)
            .single()

        if (!settings?.fortnox_connected) {
            return NextResponse.json({ error: 'Fortnox ej kopplat' }, { status: 400 })
        }

        // Fetch overdue invoices
        const overdueInvoices = await fetchOverdueInvoices(org.id)

        // Also fetch upcoming invoices if pre-reminder is enabled
        let upcomingInvoices: any[] = []
        if (settings.pre_reminder_enabled) {
            const daysAhead = settings.pre_reminder_days ?? 5
            upcomingInvoices = await fetchUpcomingInvoices(org.id, daysAhead)
        }

        // Merge and deduplicate by DocumentNumber
        const seen = new Set<string>()
        const invoices: any[] = []
        for (const inv of [...overdueInvoices, ...upcomingInvoices]) {
            const docNum = String(inv.DocumentNumber)
            if (!seen.has(docNum)) {
                seen.add(docNum)
                invoices.push(inv)
            }
        }

        if (!invoices.length) {
            return NextResponse.json({
                message: 'Inga fakturor hittades',
                imported: 0,
                skipped: 0,
            })
        }

        // Get existing claims to avoid duplicates
        const { data: existingClaims } = await admin
            .from('claims')
            .select('invoice_number')
            .eq('org_id', org.id)

        const existingInvoiceNumbers = new Set(
            (existingClaims || []).map(c => c.invoice_number)
        )

        let imported = 0
        let skipped = 0
        const errors: string[] = []

        // Cache customer lookups
        const customerCache: Record<string, any> = {}

        for (const invoice of invoices) {
            const invoiceNumber = String(invoice.DocumentNumber)

            // Skip if already imported
            if (existingInvoiceNumbers.has(invoiceNumber)) {
                skipped++
                continue
            }

            try {
                // Fetch customer details (cached)
                const customerNumber = String(invoice.CustomerNumber)
                if (!customerCache[customerNumber]) {
                    try {
                        customerCache[customerNumber] = await fetchCustomer(org.id, customerNumber)
                    } catch {
                        customerCache[customerNumber] = null
                    }
                }
                const customer = customerCache[customerNumber]

                // Hämta och spara faktura-PDF
                let attachmentUrl: string | null = null
                try {
                    const pdfBuffer = await fetchInvoicePdf(org.id, invoiceNumber)
                    if (pdfBuffer) {
                        attachmentUrl = await uploadInvoicePdf(org.id, invoiceNumber, pdfBuffer)
                    }
                } catch { /* PDF ej kritisk — fortsätt utan */ }

                // Create claim
                await admin.from('claims').insert({
                    org_id: org.id,
                    debtor_name: invoice.CustomerName || customer?.Name || 'Okänd',
                    debtor_email: customer?.Email || null,
                    debtor_phone: customer?.Phone1 || customer?.Phone2 || null,
                    amount: invoice.Balance ?? invoice.Total,
                    currency: invoice.Currency || 'SEK',
                    invoice_number: invoiceNumber,
                    due_date: invoice.DueDate || null,
                    status: 'active',
                    current_step: 0,
                    source: 'fortnox',
                    attachment_url: attachmentUrl,
                    agent_flow: settings?.agent_flow ?? null,
                })

                imported++
            } catch (err: any) {
                errors.push(`Faktura ${invoiceNumber}: ${err.message}`)
            }
        }

        // Update last import timestamp
        await admin
            .from('org_settings')
            .update({
                fortnox_last_import_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('org_id', org.id)

        return NextResponse.json({
            message: `Import klar: ${imported} nya ärenden`,
            imported,
            skipped,
            total: invoices.length,
            errors: errors.length > 0 ? errors : undefined,
        })
    } catch (err: any) {
        console.error('[Fortnox Import] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
