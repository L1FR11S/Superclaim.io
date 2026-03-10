import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ claims: [], kpis: emptyKpis(), source: 'no_auth' })
        }

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) {
            return NextResponse.json({ claims: [], kpis: emptyKpis(), source: 'no_org' })
        }

        const { data: claims, error } = await admin
            .from('claims')
            .select('*')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[Claims API]', error.message)
            return NextResponse.json({ claims: [], kpis: emptyKpis(), source: 'error' })
        }

        const allClaims = claims || []

        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

        const isThisMonth = (d: string) => new Date(d) >= currentMonthStart
        const isLastMonth = (d: string) => {
            const dt = new Date(d)
            return dt >= prevMonthStart && dt <= prevMonthEnd
        }

        // KPI splits
        const active = allClaims.filter(c => c.status === 'active')
        const paid = allClaims.filter(c => c.status === 'paid')
        const escalated = allClaims.filter(c => c.status === 'escalated')

        const totalOutstanding = active.reduce((sum, c) => sum + (c.amount || 0), 0)
        const totalCollected = paid.reduce((sum, c) => sum + (c.amount || 0), 0)

        // Month-over-month trends
        const outstandingThisMonth = allClaims
            .filter(c => c.status === 'active' && isThisMonth(c.created_at))
            .reduce((s, c) => s + (c.amount || 0), 0)
        const outstandingLastMonth = allClaims
            .filter(c => c.status === 'active' && isLastMonth(c.created_at))
            .reduce((s, c) => s + (c.amount || 0), 0)

        const activeThisMonth = allClaims.filter(c => c.status === 'active' && isThisMonth(c.created_at)).length
        const activeLastMonth = allClaims.filter(c => c.status === 'active' && isLastMonth(c.created_at)).length

        const collectedThisMonth = paid
            .filter(c => isThisMonth(c.updated_at))
            .reduce((s, c) => s + (c.amount || 0), 0)
        const collectedLastMonth = paid
            .filter(c => isLastMonth(c.updated_at))
            .reduce((s, c) => s + (c.amount || 0), 0)

        const pctChange = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0
            return Math.round(((curr - prev) / prev) * 100)
        }

        // Sparklines: daily totals for last 7 days
        const sparkOutstanding: number[] = []
        const sparkActive: number[] = []
        const sparkCollected: number[] = []
        for (let i = 6; i >= 0; i--) {
            const day = new Date(now)
            day.setDate(now.getDate() - i)
            const dayStr = day.toISOString().slice(0, 10)

            sparkOutstanding.push(
                allClaims
                    .filter(c => c.status === 'active' && c.created_at.slice(0, 10) <= dayStr)
                    .reduce((s, c) => s + (c.amount || 0), 0)
            )
            sparkActive.push(
                allClaims.filter(c => c.status === 'active' && c.created_at.slice(0, 10) <= dayStr).length
            )
            sparkCollected.push(
                paid.filter(c => c.updated_at?.slice(0, 10) === dayStr).reduce((s, c) => s + (c.amount || 0), 0)
            )
        }

        // Hämta claim_ids som har inbound-svar
        const claimIds = allClaims.map(c => c.id)
        const { data: inboundReplies } = await admin
            .from('claim_communications')
            .select('claim_id')
            .eq('org_id', org.id)
            .eq('direction', 'inbound')
            .in('claim_id', claimIds)

        const claimsWithReply = new Set((inboundReplies || []).map(r => r.claim_id))

        const enrichedClaims = allClaims.map(c => ({
            ...c,
            has_reply: claimsWithReply.has(c.id),
        }))

        return NextResponse.json({
            claims: enrichedClaims,
            kpis: {
                totalOutstanding,
                activeClaims: active.length,
                totalCollected,
                escalatedClaims: escalated.length,
                totalClaims: allClaims.length,
                paidClaims: paid.length,
                trends: {
                    outstanding: pctChange(outstandingThisMonth, outstandingLastMonth),
                    activeClaims: activeThisMonth - activeLastMonth, // absolut diff
                    collected: pctChange(collectedThisMonth, collectedLastMonth),
                },
                sparklines: {
                    outstanding: sparkOutstanding,
                    activeClaims: sparkActive,
                    collected: sparkCollected,
                },
            },
            source: 'database',
        })
    } catch (err: any) {
        console.error('[Claims API Error]', err.message)
        return NextResponse.json({ claims: [], kpis: emptyKpis(), source: 'error' })
    }
}

export async function POST(request: Request) {
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

        // Hämta org-settings för att snapshottera agent_flow
        const { data: orgSettings } = await admin
            .from('org_settings')
            .select('agent_flow')
            .eq('org_id', org.id)
            .single()

        const formData = await request.formData()

        const debtor_name = formData.get('debtor_name') as string
        const debtor_email = formData.get('debtor_email') as string
        const debtor_phone = formData.get('debtor_phone') as string | null
        const invoice_number = formData.get('invoice_number') as string | null
        const amount = formData.get('amount') as string
        const currency = (formData.get('currency') as string) || 'SEK'
        const due_date = formData.get('due_date') as string
        const file = formData.get('attachment') as File | null

        if (!debtor_name || !debtor_email || !amount || !due_date) {
            return NextResponse.json({
                error: 'Obligatoriska fält: debtor_name, debtor_email, amount, due_date',
            }, { status: 400 })
        }

        let attachment_url: string | null = null

        if (file && file.size > 0) {
            const fileName = `${org.id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
            const buffer = Buffer.from(await file.arrayBuffer())

            const { data: upload, error: uploadErr } = await supabase.storage
                .from('claim-attachments')
                .upload(fileName, buffer, {
                    contentType: file.type || 'application/pdf',
                    cacheControl: '3600',
                })

            if (uploadErr) {
                console.error('[Upload Error]', uploadErr.message)
            } else {
                const { data: publicUrl } = supabase.storage
                    .from('claim-attachments')
                    .getPublicUrl(fileName)
                attachment_url = publicUrl.publicUrl
            }
        }

        // If already overdue → act immediately, otherwise wait until due_date + 1 day
        const dueDate = new Date(due_date)
        const now = new Date()
        const nextAction = dueDate < now
            ? now  // already overdue — trigger agent on next run
            : new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) // due_date + 1 day

        const { data: claim, error } = await admin
            .from('claims')
            .insert({
                org_id: org.id,
                debtor_name,
                debtor_email,
                debtor_phone: debtor_phone || null,
                invoice_number: invoice_number || null,
                amount: parseFloat(amount),
                currency,
                due_date,
                status: 'active',
                current_step: 0,
                next_action_at: nextAction.toISOString(),
                attachment_url,
                // Snapshot av nuvarande agentflöde — ändringar i flödet påverkar ej detta ärende
                agent_flow: orgSettings?.agent_flow ?? null,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ message: 'Ärende skapat', claim })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

function emptyKpis() {
    return {
        totalOutstanding: 0,
        activeClaims: 0,
        totalCollected: 0,
        escalatedClaims: 0,
        totalClaims: 0,
        paidClaims: 0,
    }
}
