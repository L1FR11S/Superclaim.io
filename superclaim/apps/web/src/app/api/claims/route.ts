import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Mock data fallback
const MOCK_CLAIMS = [
    { id: 'acme-123', debtor_name: 'Acme Corp AB', debtor_email: 'ekonomi@acme.se', invoice_number: 'INV-2025-001', amount: 14500, currency: 'SEK', due_date: '2025-10-12', current_step: 2, status: 'active', created_at: '2025-10-01T00:00:00Z' },
    { id: 'tech-456', debtor_name: 'TechNova Solutions', debtor_email: 'billing@technova.se', invoice_number: 'INV-2025-002', amount: 82000, currency: 'SEK', due_date: '2025-10-01', current_step: 4, status: 'escalated', created_at: '2025-09-20T00:00:00Z' },
    { id: 'glob-789', debtor_name: 'Globex Inc', debtor_email: 'pay@globex.se', invoice_number: 'INV-2025-003', amount: 4200, currency: 'SEK', due_date: '2025-10-24', current_step: 0, status: 'paid', created_at: '2025-10-15T00:00:00Z', paid_at: '2025-10-24T00:00:00Z' },
    { id: 'nord-012', debtor_name: 'Nordisk Design AB', debtor_email: 'info@nordiskdesign.se', invoice_number: 'INV-2025-004', amount: 28900, currency: 'SEK', due_date: '2025-10-18', current_step: 1, status: 'active', created_at: '2025-10-10T00:00:00Z' },
    { id: 'sven-345', debtor_name: 'Svensson & Co', debtor_email: 'faktura@svensson.se', invoice_number: 'INV-2025-005', amount: 115000, currency: 'SEK', due_date: '2025-10-05', current_step: 3, status: 'active', created_at: '2025-09-25T00:00:00Z' },
    { id: 'berg-678', debtor_name: 'Berglund Transport', debtor_email: 'admin@berglund.se', invoice_number: 'INV-2025-006', amount: 7800, currency: 'SEK', due_date: '2025-09-20', current_step: 5, status: 'escalated', created_at: '2025-09-10T00:00:00Z' },
    { id: 'holm-901', debtor_name: 'Holmström IT', debtor_email: 'billing@holmstrom.se', invoice_number: 'INV-2025-007', amount: 31400, currency: 'SEK', due_date: '2025-10-28', current_step: 0, status: 'paid', created_at: '2025-10-20T00:00:00Z', paid_at: '2025-10-28T00:00:00Z' },
    { id: 'karl-234', debtor_name: 'Karlsson Bygg AB', debtor_email: 'ekonomi@karlsson.se', invoice_number: 'INV-2025-008', amount: 56000, currency: 'SEK', due_date: '2025-10-10', current_step: 2, status: 'active', created_at: '2025-10-01T00:00:00Z' },
]

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ claims: MOCK_CLAIMS, source: 'mock' })
        }

        // Try to get the user's org
        const { data: org } = await supabase
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) {
            return NextResponse.json({ claims: MOCK_CLAIMS, source: 'mock' })
        }

        // Fetch real claims
        const { data: claims, error } = await supabase
            .from('claims')
            .select('*')
            .eq('org_id', org.id)
            .order('created_at', { ascending: false })

        if (error || !claims || claims.length === 0) {
            return NextResponse.json({ claims: MOCK_CLAIMS, source: 'mock' })
        }

        // KPI calculations
        const active = claims.filter(c => c.status === 'active')
        const paid = claims.filter(c => c.status === 'paid')
        const totalOutstanding = active.reduce((sum, c) => sum + (c.amount || 0), 0)
        const totalCollected = paid.reduce((sum, c) => sum + (c.amount || 0), 0)

        return NextResponse.json({
            claims,
            kpis: {
                totalOutstanding,
                activeClaims: active.length,
                totalCollected,
            },
            source: 'database',
        })
    } catch {
        return NextResponse.json({ claims: MOCK_CLAIMS, source: 'mock' })
    }
}
