import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { fetchOverdueInvoices, fetchCustomer } from '@/lib/fortnox/fortnox'
import { verifyQStashRequest } from '@/lib/qstash'

/**
 * POST /api/fortnox/auto-import
 *
 * Cron Job — importerar förfallna fakturor från Fortnox.
 * Accepterar anrop via:
 *   1. Vercel Cron (x-cron-secret header)
 *   2. QStash (upstash-signature header)
 */
export async function POST(req: Request) {
    const cronSecret = req.headers.get('x-cron-secret')
    const isQStash = await verifyQStashRequest(req)

    if (cronSecret !== process.env.CRON_SECRET && !isQStash) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Hämta alla org med Fortnox kopplat + auto-import aktiverat
    const { data: orgs, error } = await admin
        .from('org_settings')
        .select('org_id, fortnox_connected, fortnox_auto_import, agent_flow')
        .eq('fortnox_connected', true)
        .eq('fortnox_auto_import', true)

    if (error) {
        console.error('[fortnox/auto-import] Supabase error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!orgs || orgs.length === 0) {
        return NextResponse.json({ message: 'Inga org med auto-import aktiverat', results: [] })
    }

    const results: {
        org_id: string
        imported: number
        skipped: number
        errors: string[]
    }[] = []

    for (const org of orgs) {
        const orgResult = { org_id: org.org_id, imported: 0, skipped: 0, errors: [] as string[] }

        try {
            // Hämta förfallna fakturor
            const invoices = await fetchOverdueInvoices(org.org_id)

            if (!invoices.length) {
                results.push(orgResult)
                continue
            }

            // Hämta befintliga claims för att undvika dubletter
            const { data: existingClaims } = await admin
                .from('claims')
                .select('invoice_number')
                .eq('org_id', org.org_id)

            const existingInvoiceNumbers = new Set(
                (existingClaims || []).map((c: any) => c.invoice_number)
            )

            const customerCache: Record<string, any> = {}

            for (const invoice of invoices) {
                const invoiceNumber = String(invoice.DocumentNumber)

                if (existingInvoiceNumbers.has(invoiceNumber)) {
                    orgResult.skipped++
                    continue
                }

                try {
                    // Hämta kundinfo (cached)
                    const customerNumber = String(invoice.CustomerNumber)
                    if (!customerCache[customerNumber]) {
                        try {
                            customerCache[customerNumber] = await fetchCustomer(org.org_id, customerNumber)
                        } catch {
                            customerCache[customerNumber] = null
                        }
                    }
                    const customer = customerCache[customerNumber]

                    await admin.from('claims').insert({
                        org_id: org.org_id,
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
                        // Snapshot av agentflödet vid import
                        agent_flow: (org as any).agent_flow ?? null,
                    })

                    orgResult.imported++
                } catch (err: any) {
                    orgResult.errors.push(`Faktura ${invoiceNumber}: ${err.message}`)
                }
            }

            // Uppdatera senaste import-tidsstämpel
            await admin
                .from('org_settings')
                .update({
                    fortnox_last_import_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('org_id', org.org_id)

            console.log(`[fortnox/auto-import] Org ${org.org_id}: ${orgResult.imported} importerade, ${orgResult.skipped} hoppades över`)
        } catch (err: any) {
            orgResult.errors.push(err.message)
            console.error(`[fortnox/auto-import] Fel för org ${org.org_id}:`, err.message)
        }

        results.push(orgResult)
    }

    const totalImported = results.reduce((sum, r) => sum + r.imported, 0)
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0)

    return NextResponse.json({
        orgsProcessed: results.length,
        totalImported,
        totalSkipped,
        results,
    })
}
