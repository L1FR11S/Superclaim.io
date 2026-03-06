import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * POST /api/onboarding/complete
 * Marks onboarding as completed (step = 3) so middleware stops redirecting.
 */
export async function POST() {
    try {
        // Auth-klient för att verifiera sessionen
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Admin-klient för att kringgå RLS vid DB-uppdatering
        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

        const { error: updateError } = await admin
            .from('organizations')
            .update({ onboarding_step: 3 })
            .eq('id', org.id)

        if (updateError) {
            console.error('[Onboarding Complete] Update error:', updateError)
            return NextResponse.json({ error: updateError.message }, { status: 500 })
        }

        return NextResponse.json({ message: 'Onboarding slutförd', onboarding_step: 3 })
    } catch (err: any) {
        console.error('[Onboarding Complete Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
