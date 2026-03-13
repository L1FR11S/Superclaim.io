import { ConfidentialClientApplication } from '@azure/msal-node'

const SCOPES = ['https://graph.microsoft.com/Mail.Send', 'https://graph.microsoft.com/Mail.Read', 'User.Read', 'offline_access']

function getRedirectUri() {
    return process.env.MICROSOFT_REDIRECT_URI || ''
}

// Lazy init to avoid build-time errors when env vars are not set
let _msalClient: ConfidentialClientApplication | null = null
function getMsalClient() {
    if (!_msalClient) {
        _msalClient = new ConfidentialClientApplication({
            auth: {
                clientId: process.env.MICROSOFT_CLIENT_ID || '',
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
                authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}`,
            },
        })
    }
    return _msalClient
}

export async function getMicrosoftAuthUrl(state: string) {
    return getMsalClient().getAuthCodeUrl({
        scopes: SCOPES,
        redirectUri: getRedirectUri(),
        state,
        prompt: 'consent',
    })
}

export async function exchangeMicrosoftCode(code: string) {
    const result = await getMsalClient().acquireTokenByCode({
        code,
        scopes: SCOPES,
        redirectUri: getRedirectUri(),
    })

    return {
        accessToken: result.accessToken,
        expiresOn: result.expiresOn?.toISOString() || '',
        account: result.account,
    }
}

/**
 * Direct OAuth2 token exchange — returns refresh_token which MSAL doesn't expose.
 * Use this for the callback flow to ensure we get a refresh_token for auto-renewal.
 */
export async function exchangeMicrosoftCodeDirect(code: string) {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`
    const body = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(),
        scope: SCOPES.join(' '),
    })

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Microsoft token exchange failed: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    return {
        accessToken: data.access_token as string,
        refreshToken: data.refresh_token as string,
        expiresIn: data.expires_in as number,
        expiresOn: new Date(Date.now() + (data.expires_in as number) * 1000).toISOString(),
    }
}


export async function getMicrosoftEmail(accessToken: string): Promise<string> {
    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    return data.mail || data.userPrincipalName || ''
}

/**
 * Wrap plain text body in a minimal HTML template for proper email rendering.
 * If body already contains HTML tags, use as-is.
 */
function wrapBodyAsHtml(body: string): string {
    if (/<[a-z][\s\S]*>/i.test(body)) {
        return body
    }
    const htmlBody = body
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
    
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px;">
<p>${htmlBody}</p>
</body>
</html>`
}

export async function sendMicrosoftEmail({
    accessToken,
    to,
    subject,
    body,
    attachments,
}: {
    accessToken: string
    to: string
    subject: string
    body: string
    attachments?: { filename: string; content: Buffer; contentType: string }[]
}) {
    const message: any = {
        subject,
        body: { contentType: 'HTML', content: wrapBodyAsHtml(body) },
        toRecipients: [{ emailAddress: { address: to } }],
    }

    if (attachments && attachments.length > 0) {
        message.attachments = attachments.map(att => ({
            '@odata.type': '#microsoft.graph.fileAttachment',
            name: att.filename,
            contentType: att.contentType,
            contentBytes: att.content.toString('base64'),
        }))
    }

    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(`Microsoft Graph error: ${JSON.stringify(error)}`)
    }

    return { messageId: '', threadId: '' }
}

// ─── Token Refresh ──────────────────────────────────

export async function refreshMicrosoftToken(account: any) {
    const client = getMsalClient()
    const result = await client.acquireTokenSilent({
        scopes: SCOPES,
        account,
    })
    return {
        accessToken: result.accessToken,
        expiresOn: result.expiresOn?.toISOString() || '',
    }
}

/**
 * Refresh Microsoft token using refresh_token directly via OAuth2 token endpoint.
 * This is more reliable than MSAL silent flow for server-side scenarios.
 */
export async function refreshMicrosoftTokenViaRefreshToken(refreshToken: string) {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || 'common'}/oauth2/v2.0/token`
    const body = new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID || '',
        client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: SCOPES.join(' '),
    })

    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Microsoft token refresh failed: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    return {
        accessToken: data.access_token as string,
        refreshToken: (data.refresh_token || refreshToken) as string,
        expiresIn: data.expires_in as number,
    }
}

// ─── Graph Subscriptions ────────────────────────────

export async function createGraphSubscription({
    accessToken,
    webhookUrl,
    secret,
}: {
    accessToken: string
    webhookUrl: string
    secret: string
}) {
    // Max expiration for mail: 4230 minutes (~2.9 days)
    const expiration = new Date(Date.now() + 4230 * 60 * 1000).toISOString()

    const res = await fetch('https://graph.microsoft.com/v1.0/subscriptions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            changeType: 'created',
            notificationUrl: webhookUrl,
            resource: '/me/mailFolders/inbox/messages',
            expirationDateTime: expiration,
            clientState: secret,
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Graph subscription error: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    return {
        subscriptionId: data.id as string,
        expiration: data.expirationDateTime as string,
    }
}

export async function renewGraphSubscription({
    accessToken,
    subscriptionId,
}: {
    accessToken: string
    subscriptionId: string
}) {
    const expiration = new Date(Date.now() + 4230 * 60 * 1000).toISOString()

    const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expirationDateTime: expiration }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Graph subscription renewal error: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    return { expiration: data.expirationDateTime as string }
}

export async function deleteGraphSubscription({
    accessToken,
    subscriptionId,
}: {
    accessToken: string
    subscriptionId: string
}) {
    const res = await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok && res.status !== 404) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Graph subscription delete error: ${JSON.stringify(err)}`)
    }
}

// ─── Fetch Message ──────────────────────────────────

export async function getMicrosoftMessage({
    accessToken,
    messageId,
}: {
    accessToken: string
    messageId: string
}) {
    const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=id,conversationId,subject,bodyPreview,from,internetMessageHeaders`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(`Graph message fetch error: ${JSON.stringify(err)}`)
    }

    const data = await res.json()
    return {
        messageId: data.id as string,
        conversationId: data.conversationId as string,
        subject: data.subject as string,
        body: data.bodyPreview as string,
        from: data.from?.emailAddress?.address || '',
        internetMessageHeaders: data.internetMessageHeaders as { name: string; value: string }[] | undefined,
    }
}
