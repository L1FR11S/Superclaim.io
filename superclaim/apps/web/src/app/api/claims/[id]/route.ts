import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const MOCK_CLAIMS: Record<string, any> = {
    'acme-123': { id: 'acme-123', debtor_name: 'Acme Corp AB', debtor_email: 'ekonomi@acme.se', debtor_phone: '+46701234567', invoice_number: 'INV-2025-001', amount: 14500, currency: 'SEK', due_date: '2025-10-12', current_step: 2, status: 'active', source: 'niora', payment_link: 'https://pay.niora.ai/inv/xyz', created_at: '2025-10-01T00:00:00Z' },
    'tech-456': { id: 'tech-456', debtor_name: 'TechNova Solutions', debtor_email: 'billing@technova.se', debtor_phone: '+46709876543', invoice_number: 'INV-2025-002', amount: 82000, currency: 'SEK', due_date: '2025-10-01', current_step: 4, status: 'escalated', source: 'niora', payment_link: 'https://pay.niora.ai/inv/abc', created_at: '2025-09-20T00:00:00Z' },
    'sven-345': { id: 'sven-345', debtor_name: 'Svensson & Co', debtor_email: 'faktura@svensson.se', debtor_phone: null, invoice_number: 'INV-2025-005', amount: 115000, currency: 'SEK', due_date: '2025-10-05', current_step: 3, status: 'active', source: 'niora', payment_link: 'https://pay.niora.ai/inv/sven', created_at: '2025-09-25T00:00:00Z' },
    'glob-789': { id: 'glob-789', debtor_name: 'Globex Inc', debtor_email: 'pay@globex.se', debtor_phone: null, invoice_number: 'INV-2025-003', amount: 4200, currency: 'SEK', due_date: '2025-10-24', current_step: 0, status: 'paid', source: 'niora', payment_link: 'https://pay.niora.ai/inv/glob', created_at: '2025-10-15T00:00:00Z', paid_at: '2025-10-24T00:00:00Z' },
    'nord-012': { id: 'nord-012', debtor_name: 'Nordisk Design AB', debtor_email: 'info@nordiskdesign.se', debtor_phone: '+46701112233', invoice_number: 'INV-2025-004', amount: 28900, currency: 'SEK', due_date: '2025-10-18', current_step: 1, status: 'active', source: 'niora', payment_link: 'https://pay.niora.ai/inv/nord', created_at: '2025-10-10T00:00:00Z' },
    'berg-678': { id: 'berg-678', debtor_name: 'Berglund Transport', debtor_email: 'admin@berglund.se', debtor_phone: null, invoice_number: 'INV-2025-006', amount: 7800, currency: 'SEK', due_date: '2025-09-20', current_step: 5, status: 'escalated', source: 'niora', payment_link: 'https://pay.niora.ai/inv/berg', created_at: '2025-09-10T00:00:00Z' },
    'holm-901': { id: 'holm-901', debtor_name: 'Holmström IT', debtor_email: 'billing@holmstrom.se', debtor_phone: null, invoice_number: 'INV-2025-007', amount: 31400, currency: 'SEK', due_date: '2025-10-28', current_step: 0, status: 'paid', source: 'niora', payment_link: 'https://pay.niora.ai/inv/holm', created_at: '2025-10-20T00:00:00Z', paid_at: '2025-10-28T00:00:00Z' },
    'karl-234': { id: 'karl-234', debtor_name: 'Karlsson Bygg AB', debtor_email: 'ekonomi@karlsson.se', debtor_phone: '+46703334455', invoice_number: 'INV-2025-008', amount: 56000, currency: 'SEK', due_date: '2025-10-10', current_step: 2, status: 'active', source: 'niora', payment_link: 'https://pay.niora.ai/inv/karl', created_at: '2025-10-01T00:00:00Z' },
}

const MOCK_TIMELINE: Record<string, any[]> = {
    'acme-123': [
        { step: 1, channel: 'email', subject: 'Påminnelse: Faktura #INV-2025-001', body: 'Hej Acme Corp, vi vill vänligt påminna om att faktura #INV-2025-001 på 14 500 SEK förföll den 12 oktober. Vi ber dig vänligen genomföra betalningen snarast.', sentAt: '2025-10-15T10:00:00Z', openedAt: '2025-10-15T14:32:00Z' },
        { step: 2, channel: 'email', subject: 'Uppföljning: Obetald faktura #INV-2025-001', body: 'Hej, vi har ännu inte mottagit betalning för faktura #INV-2025-001 på 14 500 SEK. Vi vill gärna lösa detta smidigt. Vänligen betala via länken nedan eller kontakta oss om du har frågor.', sentAt: '2025-10-22T09:00:00Z', openedAt: null },
    ],
    'tech-456': [
        { step: 1, channel: 'email', subject: 'Påminnelse: Faktura INV-2025-002', body: 'Hej TechNova, påminnelse om obetald faktura på 82 000 SEK.', sentAt: '2025-10-05T08:00:00Z', openedAt: '2025-10-05T11:20:00Z' },
        { step: 2, channel: 'email', subject: 'Uppföljning: Faktura INV-2025-002', body: 'Vi har ännu inte mottagit betalning. Vänligen reglera inom 7 dagar.', sentAt: '2025-10-12T09:00:00Z', openedAt: null },
        { step: 3, channel: 'sms', subject: '', body: 'Påminnelse: Obetald faktura 82 000 SEK. Betala via länk i mejl.', sentAt: '2025-10-19T10:00:00Z', openedAt: null },
        { step: 4, channel: 'email', subject: 'Sista varning: Eskalering till inkasso', body: 'Trots flera påminnelser har vi inte mottagit betalning. Ärendet eskaleras till inkasso om inte betalning sker inom 5 dagar.', sentAt: '2025-10-24T09:00:00Z', openedAt: null },
    ],
    'sven-345': [
        { step: 1, channel: 'email', subject: 'Påminnelse: Faktura INV-2025-005', body: 'Hej Svensson & Co, vänlig påminnelse om faktura på 115 000 SEK som förföll 5 oktober.', sentAt: '2025-10-10T09:00:00Z', openedAt: '2025-10-10T15:45:00Z' },
        { step: 2, channel: 'email', subject: 'Uppföljning: Obetald faktura', body: 'Vi har inte mottagit betalning. Kontakta oss om du har frågor.', sentAt: '2025-10-17T08:00:00Z', openedAt: null },
        { step: 3, channel: 'email', subject: 'Viktigt: Obetald faktura INV-2025-005', body: 'Trots tidigare påminnelser har vi inte mottagit betalning för 115 000 SEK. Vi ber dig att omgående reglera skulden.', sentAt: '2025-10-24T09:00:00Z', openedAt: null },
    ],
}

function getMockTimeline(claimId: string, claim?: any) {
    if (MOCK_TIMELINE[claimId]) return MOCK_TIMELINE[claimId]
    const c = claim || MOCK_CLAIMS['acme-123']
    return [
        { step: 1, channel: 'email', subject: `Påminnelse: Faktura ${c.invoice_number || ''}`, body: `Hej, vänlig påminnelse om obetald faktura på ${c.amount?.toLocaleString('sv-SE')} ${c.currency}.`, sentAt: new Date(Date.now() - 7 * 86400000).toISOString(), openedAt: null },
        { step: 2, channel: 'email', subject: `Uppföljning: Obetald faktura`, body: 'Vi har ännu inte mottagit betalning. Vänligen reglera snarast.', sentAt: new Date(Date.now() - 2 * 86400000).toISOString(), openedAt: null },
    ]
}

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const mockClaim = MOCK_CLAIMS[id] ?? Object.values(MOCK_CLAIMS)[0]
        const claim = { ...mockClaim, id }

        if (!user) {
            const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(claim.due_date).getTime()) / 86400000))
            return NextResponse.json({
                claim: { ...claim, days_overdue: daysOverdue },
                timeline: getMockTimeline(id, claim),
                source: 'mock',
            })
        }

        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) {
            const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(claim.due_date).getTime()) / 86400000))
            return NextResponse.json({
                claim: { ...claim, days_overdue: daysOverdue },
                timeline: getMockTimeline(id, claim),
                source: 'mock',
            })
        }

        const { data: dbClaim, error } = await supabase
            .from('claims')
            .select('*')
            .eq('id', id)
            .eq('org_id', org.id)
            .single()

        if (error || !dbClaim) {
            const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(claim.due_date).getTime()) / 86400000))
            return NextResponse.json({
                claim: { ...claim, days_overdue: daysOverdue },
                timeline: getMockTimeline(id, claim),
                source: 'mock',
            })
        }

        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(dbClaim.due_date).getTime()) / 86400000))

        const { data: timelineRows } = await supabase
            .from('claim_communications')
            .select('*')
            .eq('claim_id', id)
            .order('sent_at', { ascending: true })

        const timeline = (timelineRows && timelineRows.length > 0)
            ? timelineRows.map((r: any) => ({
                step: r.step,
                channel: r.channel || 'email',
                subject: r.subject || '',
                body: r.body || '',
                sentAt: r.sent_at,
                openedAt: r.opened_at || null,
            }))
            : getMockTimeline(id, dbClaim)

        return NextResponse.json({
            claim: { ...dbClaim, days_overdue: daysOverdue },
            timeline,
            source: 'database',
        })
    } catch {
        const mockClaim = MOCK_CLAIMS[id] ?? Object.values(MOCK_CLAIMS)[0]
        const claim = { ...mockClaim, id }
        const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(claim.due_date).getTime()) / 86400000))
        return NextResponse.json({
            claim: { ...claim, days_overdue: daysOverdue },
            timeline: getMockTimeline(id, claim),
            source: 'mock',
        })
    }
}
