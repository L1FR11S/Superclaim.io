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

export async function sendMicrosoftEmail({
    accessToken,
    to,
    subject,
    body,
}: {
    accessToken: string
    to: string
    subject: string
    body: string
}) {
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: {
                subject,
                body: { contentType: 'HTML', content: body },
                toRecipients: [{ emailAddress: { address: to } }],
            },
        }),
    })

    if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(`Microsoft Graph error: ${JSON.stringify(error)}`)
    }

    return { messageId: '', threadId: '' }
}
