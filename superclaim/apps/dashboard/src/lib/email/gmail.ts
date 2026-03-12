import { google } from 'googleapis'

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // e.g. https://app.superclaim.io/api/email-provider/google/callback
)

export function getGoogleAuthUrl(state: string) {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/userinfo.email',
        ],
        state,
    })
}

export async function exchangeGoogleCode(code: string) {
    const { tokens } = await oauth2Client.getToken(code)
    return tokens // { access_token, refresh_token, expiry_date }
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
    oauth2Client.setCredentials({ access_token: accessToken })
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data } = await oauth2.userinfo.get()
    return data.email || ''
}

export async function refreshGoogleToken(refreshToken: string) {
    oauth2Client.setCredentials({ refresh_token: refreshToken })
    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials
}

export async function sendGmailEmail({
    accessToken,
    refreshToken,
    to,
    subject,
    body,
    from,
}: {
    accessToken: string
    refreshToken: string
    to: string
    subject: string
    body: string
    from?: string
}) {
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Build RFC 2822 message
    const fromHeader = from ? `From: ${from}` : ''
    const rawMessage = [
        fromHeader,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body,
    ].filter(Boolean).join('\r\n')

    const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
    })

    return {
        messageId: result.data.id || '',
        threadId: result.data.threadId || '',
    }
}
