import { ConfidentialClientApplication } from '@azure/msal-node'

const SCOPES = ['https://graph.microsoft.com/Mail.Send', 'User.Read', 'offline_access']

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
