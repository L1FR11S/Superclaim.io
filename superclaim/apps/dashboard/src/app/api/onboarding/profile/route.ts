import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * PUT /api/onboarding/profile
 * Save company profile & tone during onboarding step 1.
 */
export async function PUT(request: Request) {
    try {
        // Auth-klient för att verifiera sessionen
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await request.json()
        const { company_name, org_number, tone } = body

        if (!company_name) {
            return NextResponse.json({ error: 'Företagsnamn krävs' }, { status: 400 })
        }

        // Admin-klient för att kringgå RLS vid DB-skrivning
        const admin = createAdminClient()

        // Find or create organization
        let org: { id: string } | null = null

        const { data: existingOrg } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (existingOrg) {
            org = existingOrg
            await admin
                .from('organizations')
                .update({
                    name: company_name,
                    ...(org_number && { org_number }),
                    onboarding_step: 1,
                })
                .eq('id', org.id)
        } else {
            const { data: newOrg, error } = await admin
                .from('organizations')
                .insert({
                    name: company_name,
                    email: user.email!,
                    ...(org_number && { org_number }),
                    onboarding_step: 1,
                })
                .select('id')
                .single()
            if (error || !newOrg) return NextResponse.json({ error: 'Kunde inte skapa organisation' }, { status: 500 })
            org = newOrg
        }

        // Upsert tone in org_settings
        if (tone) {
            await admin
                .from('org_settings')
                .upsert({
                    org_id: org.id,
                    tone,
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'org_id' })
        }

        return NextResponse.json({
            message: 'Profil sparad',
            org_id: org.id,
            onboarding_step: 1,
        })
    } catch (err: any) {
        console.error('[Onboarding Profile Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
