import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/fortnox/fortnox'
import crypto from 'crypto'

/**
 * GET /api/fortnox/connect
 * Returns the Fortnox OAuth2 authorization URL (for popup flow)
 */
export async function GET() {
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

        if (!org) return NextResponse.json({ error: 'Organisation saknas' }, { status: 400 })

        const nonce = crypto.randomBytes(16).toString('hex')
        const state = `${org.id}:${nonce}`

        const authUrl = getAuthorizationUrl(state)
        return NextResponse.json({ url: authUrl })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
