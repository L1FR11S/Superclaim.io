import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { fetchInvoice } from '@/lib/fortnox/fortnox'
import { verifyQStashRequest } from '@/lib/qstash'

/**
 * POST /api/fortnox/sync-payments
 *
 * Cron Job — synkar betalningsstatus från Fortnox.
 * Accepterar anrop via:
 *   1. Vercel Cron (x-cron-secret header)
 *   2. QStash (upstash-signature header)
 *
 * Om en faktura har Balance = 0 i Fortnox → markerar claim som 'paid'.
 */
export async function POST(req: Request) {
    const cronSecret = req.headers.get('x-cron-secret')
    const isQStash = await verifyQStashRequest(req)

    if (cronSecret !== process.env.CRON_SECRET && !isQStash) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()

    // Hämta alla org med Fortnox kopplat
    const { data: orgs, error: orgsError } = await admin
        .from('org_settings')
        .select('org_id')
        .eq('fortnox_connected', true)

    if (orgsError) {
        console.error('[fortnox/sync-payments] Supabase error:', orgsError)
        return NextResponse.json({ error: orgsError.message }, { status: 500 })
    }

    if (!orgs || orgs.length === 0) {
        return NextResponse.json({ message: 'Inga org med Fortnox kopplat', results: [] })
    }

    const results: {
        org_id: string
        checked: number
        markedPaid: number
        errors: string[]
    }[] = []

    for (const org of orgs) {
        const orgResult = {
            org_id: org.org_id,
            checked: 0,
            markedPaid: 0,
            errors: [] as string[],
        }

        try {
            // Hämta alla aktiva Fortnox-claims för denna org
            const { data: claims, error: claimsError } = await admin
                .from('claims')
                .select('id, invoice_number, debtor_name')
                .eq('org_id', org.org_id)
                .eq('status', 'active')
                .eq('source', 'fortnox')
                .not('invoice_number', 'is', null)

            if (claimsError) {
                orgResult.errors.push(`Supabase fetch: ${claimsError.message}`)
                results.push(orgResult)
                continue
            }

            if (!claims || claims.length === 0) {
                results.push(orgResult)
                continue
            }

            for (const claim of claims) {
                orgResult.checked++
                try {
                    const invoice = await fetchInvoice(org.org_id, claim.invoice_number)

                    // Balance = 0 → fakturan är betald
                    if (invoice && (invoice.Balance === 0 || invoice.Balance === '0')) {
                        await admin
                            .from('claims')
                            .update({
                                status: 'paid',
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', claim.id)

                        // Skapa realtids-notis
                        await admin.from('notifications').insert({
                            org_id: org.org_id,
                            type: 'paid',
                            text: `💰 ${claim.debtor_name} har betalat`,
                            href: `/dashboard/claims/${claim.id}`,
                        })

                        orgResult.markedPaid++
                        console.log(
                            `[fortnox/sync-payments] Claim ${claim.id} (${claim.debtor_name}) markerad som betald`
                        )
                    }
                } catch (err: any) {
                    // Logga felet men fortsätt med nästa claim
                    orgResult.errors.push(`Claim ${claim.id} (faktura ${claim.invoice_number}): ${err.message}`)
                    console.error(`[fortnox/sync-payments] Fel för claim ${claim.id}:`, err.message)
                }
            }

            console.log(
                `[fortnox/sync-payments] Org ${org.org_id}: kontrollerade ${orgResult.checked}, markerade ${orgResult.markedPaid} som betalda`
            )
        } catch (err: any) {
            orgResult.errors.push(err.message)
            console.error(`[fortnox/sync-payments] Org-fel ${org.org_id}:`, err.message)
        }

        results.push(orgResult)
    }

    const totalChecked = results.reduce((sum, r) => sum + r.checked, 0)
    const totalMarkedPaid = results.reduce((sum, r) => sum + r.markedPaid, 0)

    return NextResponse.json({
        orgsProcessed: results.length,
        totalChecked,
        totalMarkedPaid,
        results,
    })
}
