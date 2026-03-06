import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * POST /api/seed-demo
 * Seeds demo data for the currently authenticated user's org.
 * Safe to run multiple times — clears existing data first.
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

        if (!org) return NextResponse.json({ error: 'Org not found — slutför onboarding först' }, { status: 404 })

        // Clear existing data for this org
        await admin.from('claim_communications').delete().eq('org_id', org.id)
        await admin.from('email_drafts').delete().eq('org_id', org.id)
        await admin.from('sms_drafts').delete().eq('org_id', org.id)
        await admin.from('agent_runs').delete().eq('org_id', org.id)
        await admin.from('claims').delete().eq('org_id', org.id)

        const daysAgo = (d: number) => {
            const date = new Date()
            date.setDate(date.getDate() - d)
            return date.toISOString()
        }
        const futureDate = (d: number) => {
            const date = new Date()
            date.setDate(date.getDate() + d)
            return date.toISOString()
        }
        const dueDateStr = (d: number) => {
            const date = new Date()
            date.setDate(date.getDate() - d)
            return date.toISOString().slice(0, 10)
        }

        const claimsToInsert = [
            {
                org_id: org.id,
                debtor_name: 'Karlsson Bygg AB',
                debtor_email: 'fakturor@karlssonbygg.se',
                debtor_phone: '+46701234567',
                invoice_number: 'F-2024-0847',
                amount: 12500,
                currency: 'SEK',
                due_date: dueDateStr(47),
                status: 'paid',
                current_step: 2,
                last_action_at: daysAgo(5),
                next_action_at: null,
                created_at: daysAgo(52),
                updated_at: daysAgo(5),
            },
            {
                org_id: org.id,
                debtor_name: 'Lindström Fastigheter AB',
                debtor_email: 'ekonomi@lindstromfast.se',
                debtor_phone: '+46709876543',
                invoice_number: 'F-2024-0912',
                amount: 28900,
                currency: 'SEK',
                due_date: dueDateStr(22),
                status: 'active',
                current_step: 2,
                next_action_at: futureDate(2),
                last_action_at: daysAgo(5),
                created_at: daysAgo(25),
                updated_at: daysAgo(5),
            },
            {
                org_id: org.id,
                debtor_name: 'Nordisk El & VVS AB',
                debtor_email: 'info@nordiskel.se',
                debtor_phone: '+46706543210',
                invoice_number: 'F-2024-0956',
                amount: 8750,
                currency: 'SEK',
                due_date: dueDateStr(14),
                status: 'active',
                current_step: 1,
                next_action_at: futureDate(5),
                last_action_at: daysAgo(7),
                created_at: daysAgo(18),
                updated_at: daysAgo(7),
            },
            {
                org_id: org.id,
                debtor_name: 'Grip Konsult AB',
                debtor_email: 'anna@gripkonsult.se',
                invoice_number: 'F-2025-0021',
                amount: 45000,
                currency: 'SEK',
                due_date: dueDateStr(35),
                status: 'escalated',
                current_step: 5,
                next_action_at: null,
                last_action_at: daysAgo(2),
                created_at: daysAgo(40),
                updated_at: daysAgo(2),
            },
            {
                org_id: org.id,
                debtor_name: 'Svensson & Co HB',
                debtor_email: 'erik@svenssons.se',
                debtor_phone: '+46731112233',
                invoice_number: 'F-2025-0034',
                amount: 6200,
                currency: 'SEK',
                due_date: dueDateStr(4),
                status: 'active',
                current_step: 0,
                next_action_at: futureDate(3),
                created_at: daysAgo(7),
                updated_at: daysAgo(4),
            },
            {
                org_id: org.id,
                debtor_name: 'Malmö Transport AB',
                debtor_email: 'billing@malmotransport.se',
                invoice_number: 'F-2024-0789',
                amount: 18300,
                currency: 'SEK',
                due_date: dueDateStr(60),
                status: 'paid',
                current_step: 3,
                last_action_at: daysAgo(12),
                next_action_at: null,
                created_at: daysAgo(65),
                updated_at: daysAgo(12),
            },
            {
                org_id: org.id,
                debtor_name: 'Bergström Design Studio',
                debtor_email: 'faktura@bergstromdesign.se',
                invoice_number: 'F-2024-0834',
                amount: 34500,
                currency: 'SEK',
                due_date: dueDateStr(50),
                status: 'paid',
                current_step: 1,
                last_action_at: daysAgo(35),
                next_action_at: null,
                created_at: daysAgo(55),
                updated_at: daysAgo(35),
            },
            {
                org_id: org.id,
                debtor_name: 'Öberg IT Solutions',
                debtor_email: 'accounts@obergit.com',
                invoice_number: 'F-2025-0045',
                amount: 22000,
                currency: 'SEK',
                due_date: dueDateStr(10),
                status: 'active',
                current_step: 1,
                next_action_at: futureDate(4),
                last_action_at: daysAgo(3),
                created_at: daysAgo(14),
                updated_at: daysAgo(3),
            },
            {
                org_id: org.id,
                debtor_name: 'Persson & Partners AB',
                debtor_email: 'info@perssonpartners.se',
                invoice_number: 'F-2025-0058',
                amount: 71000,
                currency: 'SEK',
                due_date: dueDateStr(75),
                status: 'escalated',
                current_step: 5,
                next_action_at: null,
                last_action_at: daysAgo(1),
                created_at: daysAgo(80),
                updated_at: daysAgo(1),
            },
            {
                org_id: org.id,
                debtor_name: 'Göteborg Reklam AB',
                debtor_email: 'ekonomi@gbreklam.se',
                debtor_phone: '+46735556677',
                invoice_number: 'F-2025-0063',
                amount: 9900,
                currency: 'SEK',
                due_date: dueDateStr(30),
                status: 'paid',
                current_step: 2,
                last_action_at: daysAgo(8),
                next_action_at: null,
                created_at: daysAgo(35),
                updated_at: daysAgo(8),
            },
        ]

        const { data: claims, error: claimErr } = await admin
            .from('claims')
            .insert(claimsToInsert)
            .select('id, debtor_name, status, amount')

        if (claimErr) throw claimErr

        // Create communications
        const comms: any[] = []
        for (const claim of claims || []) {
            if (claim.status === 'paid' || claim.status === 'escalated' || claim.status === 'active') {
                comms.push({
                    org_id: org.id,
                    claim_id: claim.id,
                    channel: 'email',
                    direction: 'outbound',
                    subject: `Påminnelse: Obetald faktura till ${claim.debtor_name}`,
                    body: `Hej,\n\nDetta är en vänlig påminnelse om er obetalda faktura på ${claim.amount.toLocaleString('sv-SE')} SEK. Vi ber dig att reglera beloppet snarast.\n\nMed vänliga hälsningar,\nSuperclaim AI`,
                    step: 1,
                    created_at: daysAgo(21),
                })
            }
            if (claim.status === 'paid' || claim.status === 'escalated') {
                comms.push({
                    org_id: org.id,
                    claim_id: claim.id,
                    channel: 'email',
                    direction: 'outbound',
                    subject: `Formell påminnelse: Faktura fortfarande obetald`,
                    body: `Hej,\n\nTrots vår tidigare påminnelse har vi ännu inte mottagit betalning. Vi ber om omgående åtgärd.\n\nMed vänliga hälsningar,\nSuperclaim AI`,
                    step: 2,
                    created_at: daysAgo(14),
                })
            }
            if (claim.status === 'paid') {
                comms.push({
                    org_id: org.id,
                    claim_id: claim.id,
                    channel: 'email',
                    direction: 'inbound',
                    subject: `Re: Påminnelse — betalning genomförd`,
                    body: `Hej, betalningen är nu genomförd. Tack för påminnelsen!`,
                    step: 2,
                    created_at: daysAgo(7),
                })
            }
            if (claim.status === 'escalated') {
                comms.push({
                    org_id: org.id,
                    claim_id: claim.id,
                    channel: 'sms',
                    direction: 'outbound',
                    subject: null,
                    body: `Sista påminnelse: Er faktura på ${claim.amount.toLocaleString('sv-SE')} kr har nu eskalerats till inkasso. Kontakta oss omgående.`,
                    step: 4,
                    created_at: daysAgo(5),
                })
                comms.push({
                    org_id: org.id,
                    claim_id: claim.id,
                    channel: 'email',
                    direction: 'outbound',
                    subject: `SISTA VARNING: Inkasso initieras`,
                    body: `Hej,\n\nDetta är er sista möjlighet att reglera skulden innan ärendet överlämnas till kronofogden.\n\nMed vänliga hälsningar,\nSuperclaim AI`,
                    step: 5,
                    created_at: daysAgo(3),
                })
            }
        }

        if (comms.length > 0) {
            await admin.from('claim_communications').insert(comms)
        }

        // Create agent runs (last 10 days)
        const runs = Array.from({ length: 10 }, (_, i) => ({
            org_id: org.id,
            started_at: daysAgo(i),
            completed_at: daysAgo(i),
            claims_processed: Math.floor(Math.random() * 4) + 2,
            emails_generated: Math.floor(Math.random() * 3) + 1,
            emails_sent: Math.floor(Math.random() * 2) + 1,
            sms_sent: Math.random() > 0.7 ? 1 : 0,
            errors: [],
            status: 'completed',
        }))

        await admin.from('agent_runs').insert(runs)

        return NextResponse.json({
            message: '✅ Demo data seedad!',
            claims: claims?.length || 0,
            communications: comms.length,
            agent_runs: runs.length,
        })
    } catch (err: any) {
        console.error('[Seed Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
