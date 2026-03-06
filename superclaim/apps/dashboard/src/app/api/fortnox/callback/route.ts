import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse, NextRequest } from 'next/server'
import { exchangeCodeForToken, fetchCompanyInfo } from '@/lib/fortnox/fortnox'

function popupHtml(success: boolean, message: string) {
    if (success) {
        return new Response(`<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>Fortnox</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0f0e;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;overflow:hidden}
.card{text-align:center;z-index:10;animation:fadeUp .6s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.icon-wrap{width:80px;height:80px;margin:0 auto 24px;border-radius:50%;background:linear-gradient(135deg,#00e5cc22,#1e7e3422);display:flex;align-items:center;justify-content:center;animation:pulse 2s ease infinite}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 #00e5cc33}50%{box-shadow:0 0 0 16px #00e5cc00}}
.icon-wrap svg{width:40px;height:40px}
h2{font-size:20px;font-weight:600;letter-spacing:-.3px;margin-bottom:8px}
p{color:#888;font-size:14px}
.confetti{position:fixed;top:-10px;width:8px;height:8px;border-radius:2px;animation:fall linear forwards}
@keyframes fall{to{transform:translateY(110vh) rotate(720deg);opacity:0}}
.glow{position:fixed;top:50%;left:50%;width:300px;height:300px;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle,#00e5cc08 0%,transparent 70%);pointer-events:none}
</style>
</head>
<body>
<div class="glow"></div>
<div class="card">
    <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="#00e5cc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.5 11.5c-.4-.4-1-.4-1.4 0l-1.6 1.6c-.4.4-1 .4-1.4 0l-.6-.6c-.4-.4-.4-1 0-1.4l4-4c.4-.4.4-1 0-1.4l-1.2-1.2c-.6-.6-1.5-.6-2.1 0L13 7.7c-.4.4-1 .4-1.4 0L10 6.1c-.6-.6-1.5-.6-2.1 0L3.5 10.5c-.6.6-.6 1.5 0 2.1l2.6 2.6c.4.4.4 1 0 1.4l-1.6 1.6c-.4.4-.4 1 0 1.4l1.2 1.2c.6.6 1.5.6 2.1 0l3.2-3.2c.4-.4 1-.4 1.4 0l1.6 1.6c.6.6 1.5.6 2.1 0l4.4-4.4c.6-.6.6-1.5 0-2.1l-.1-.1Z"/>
            <path d="M14 15l2 2"/>
            <path d="M9 6l-1-1"/>
        </svg>
    </div>
    <h2>${message}</h2>
    <p>Fonstret stangs automatiskt...</p>
</div>
<script>
const colors=['#00e5cc','#1e7e34','#00b8a3','#4ade80','#34d399','#fff'];
for(let i=0;i<50;i++){const c=document.createElement('div');c.className='confetti';c.style.left=Math.random()*100+'vw';c.style.background=colors[Math.floor(Math.random()*colors.length)];c.style.animationDuration=(Math.random()*2+1.5)+'s';c.style.animationDelay=(Math.random()*.8)+'s';c.style.width=(Math.random()*6+4)+'px';c.style.height=(Math.random()*6+4)+'px';c.style.opacity=Math.random()*.8+.2;document.body.appendChild(c)}
setTimeout(()=>window.close(),2500);
</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }

    // Error state
    return new Response(`<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="utf-8">
<title>Fortnox</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0f0e;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
.card{text-align:center;animation:fadeUp .6s ease}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.icon-wrap{width:80px;height:80px;margin:0 auto 24px;border-radius:50%;background:#ff444422;display:flex;align-items:center;justify-content:center}
.icon-wrap svg{width:40px;height:40px}
h2{font-size:20px;font-weight:600;margin-bottom:8px;color:#ff6b6b}
p{color:#888;font-size:14px}
</style>
</head>
<body>
<div class="card">
    <div class="icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
    </div>
    <h2>${message}</h2>
    <p>Stang detta fonster och forsok igen.</p>
</div>
<script>setTimeout(()=>window.close(),4000);</script>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

/**
 * GET /api/fortnox/callback?code=...&state=orgId:nonce
 * Receives the OAuth2 authorization code from Fortnox
 */
export async function GET(request: NextRequest) {
    try {
        const code = request.nextUrl.searchParams.get('code')
        const state = request.nextUrl.searchParams.get('state')

        if (!code || !state) {
            return popupHtml(false, 'Saknar parametrar från Fortnox')
        }

        const orgId = state.split(':')[0]
        if (!orgId) {
            return popupHtml(false, 'Ogiltigt state')
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForToken(code)

        const admin = createAdminClient()
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

        // Save tokens to org_settings
        await admin
            .from('org_settings')
            .upsert({
                org_id: orgId,
                fortnox_access_token: tokens.access_token,
                fortnox_refresh_token: tokens.refresh_token,
                fortnox_token_expires_at: expiresAt.toISOString(),
                fortnox_connected: true,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'org_id' })

        // Try to fetch company name
        let companyName = ''
        try {
            const company = await fetchCompanyInfo(orgId)
            companyName = company?.CompanyName || ''
        } catch {
            // Non-critical
        }

        return popupHtml(true, companyName ? `Kopplad till ${companyName}` : 'Fortnox kopplat!')
    } catch (err: any) {
        console.error('[Fortnox Callback] Error:', err)
        return popupHtml(false, `Fel: ${err.message}`)
    }
}
