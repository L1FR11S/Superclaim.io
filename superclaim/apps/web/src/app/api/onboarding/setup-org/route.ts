import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * POST /api/onboarding/setup-org
 * Skapar organisationsraden direkt efter registrering.
 * Anropas från klienten med user_id + formulärdata.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { user_id, email, company_name, org_number } = body

        if (!user_id || !email || !company_name) {
            return NextResponse.json({ error: 'user_id, email och company_name krävs' }, { status: 400 })
        }

        const admin = createAdminClient()

        // Kontrollera om org redan finns
        const { data: existing } = await admin
            .from('organizations')
            .select('id')
            .eq('email', email)
            .single()

        if (existing) {
            // Uppdatera om den redan finns
            await admin
                .from('organizations')
                .update({
                    name: company_name,
                    ...(org_number && { org_number }),
                })
                .eq('id', existing.id)

            return NextResponse.json({ org_id: existing.id, created: false })
        }

        // Skapa ny organisation
        const { data: newOrg, error } = await admin
            .from('organizations')
            .insert({
                name: company_name,
                email,
                ...(org_number && { org_number }),
                onboarding_step: 0,
            })
            .select('id')
            .single()

        if (error || !newOrg) {
            console.error('[setup-org] Insert error:', error)
            return NextResponse.json({ error: error?.message || 'Kunde inte skapa organisation' }, { status: 500 })
        }

        return NextResponse.json({ org_id: newOrg.id, created: true })
    } catch (err: any) {
        console.error('[setup-org] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
