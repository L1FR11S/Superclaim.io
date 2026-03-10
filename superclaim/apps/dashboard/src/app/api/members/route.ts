import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

// GET - Lista alla medlemmar i organisationen
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

        if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

        const { data: members } = await admin
            .from('org_members')
            .select('id, email, role, status, first_name, last_name, created_at')
            .eq('org_id', org.id)
            .order('created_at', { ascending: true })

        return NextResponse.json({ members: members || [] })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// POST - Bjud in ny medlem
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

        const body = await request.json()
        const { email, role = 'member' } = body

        if (!email) return NextResponse.json({ error: 'E-post krävs' }, { status: 400 })

        // Kolla om redan medlem
        const { data: existing } = await admin
            .from('org_members')
            .select('id')
            .eq('org_id', org.id)
            .eq('email', email.toLowerCase())
            .single()

        if (existing) {
            return NextResponse.json({ error: 'Användaren är redan inbjuden' }, { status: 409 })
        }

        const { data: member, error } = await admin
            .from('org_members')
            .insert({
                org_id: org.id,
                email: email.toLowerCase(),
                role,
                status: 'invited',
                invited_by: user.id,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ message: 'Inbjudan skickad', member })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

// DELETE - Ta bort medlem
export async function DELETE(request: Request) {
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

        const { searchParams } = new URL(request.url)
        const memberId = searchParams.get('id')

        if (!memberId) return NextResponse.json({ error: 'Member ID krävs' }, { status: 400 })

        const { error } = await admin
            .from('org_members')
            .delete()
            .eq('id', memberId)
            .eq('org_id', org.id)

        if (error) throw error

        return NextResponse.json({ message: 'Medlem borttagen' })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
