import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const admin = createAdminClient()

        const { data: org } = await admin
            .from('organizations')
            .select('id, name, email, org_number, address, postal_code, city, phone, logo_url')
            .eq('email', user.email)
            .single()

        if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

        return NextResponse.json(org)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
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

        const body = await request.json()
        const { name, org_number, address, postal_code, city, phone } = body

        const { data, error } = await admin
            .from('organizations')
            .update({
                ...(name !== undefined && { name }),
                ...(org_number !== undefined && { org_number }),
                ...(address !== undefined && { address }),
                ...(postal_code !== undefined && { postal_code }),
                ...(city !== undefined && { city }),
                ...(phone !== undefined && { phone }),
                updated_at: new Date().toISOString(),
            })
            .eq('id', org.id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ message: 'Organisation uppdaterad', organization: data })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
