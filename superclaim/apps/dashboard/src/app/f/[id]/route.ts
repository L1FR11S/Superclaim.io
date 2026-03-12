import { createAdminClient } from '@/utils/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /f/[id] — Short URL redirect to invoice PDF
 * 
 * The short ID is the first 8 hex characters of the claim UUID (no dashes).
 * Example: superclaim.io/f/108a7547 → redirects to Supabase Storage PDF
 * 
 * Also accepts full claim UUID.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params

    if (!id || id.length < 6) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Short ID = first 8 hex chars of UUID (no dashes)
    // We need to convert back to UUID format for prefix search
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    // Short ID:    xxxxxxxx (first 8 hex chars = first segment of UUID)

    let claim: { id: string; attachment_url: string | null } | null = null

    if (id.includes('-') && id.length > 20) {
        // Full UUID passed
        const { data } = await admin
            .from('claims')
            .select('id, attachment_url')
            .eq('id', id)
            .maybeSingle()
        claim = data
    } else {
        // Short ID = first 8 hex chars = first segment of UUID (before first dash)
        // Reconstruct UUID range for prefix search
        const prefix = id.toLowerCase()
        const gteId = `${prefix}-0000-0000-0000-000000000000`
        const lteId = `${prefix}-ffff-ffff-ffff-ffffffffffff`

        const { data: claims } = await admin
            .from('claims')
            .select('id, attachment_url')
            .gte('id', gteId)
            .lte('id', lteId)
            .not('attachment_url', 'is', null)
            .limit(1)
        
        claim = claims?.[0] || null
    }

    if (!claim || !claim.attachment_url) {
        // Return a simple HTML page instead of JSON for end users
        return new NextResponse(
            `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"><title>Fakturan hittades inte</title></head>
<body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5">
<div style="text-align:center;padding:2rem">
<h1 style="color:#333">Fakturan kunde inte hittas</h1>
<p style="color:#666">Länken kan ha upphört att gälla.</p>
</div>
</body>
</html>`,
            { status: 404, headers: { 'Content-Type': 'text/html' } }
        )
    }

    // Redirect to the actual PDF
    return NextResponse.redirect(claim.attachment_url, 302)
}
