import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getGoogleAuthUrl } from '@/lib/email/gmail'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()
        const { data: org } = await admin
            .from('organizations').select('id').eq('email', user.email).single()
        if (!org) return NextResponse.json({ error: 'No org' }, { status: 404 })

        const state = Buffer.from(JSON.stringify({ orgId: org.id })).toString('base64url')
        const url = getGoogleAuthUrl(state)

        return NextResponse.json({ url })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
