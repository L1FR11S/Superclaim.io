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

/**
 * Encode a subject line with RFC 2047 for proper UTF-8 support (å, ä, ö etc.)
 */
function encodeSubject(subject: string): string {
    // Check if subject contains non-ASCII characters
    if (/[^\x00-\x7F]/.test(subject)) {
        const encoded = Buffer.from(subject, 'utf-8').toString('base64')
        return `=?UTF-8?B?${encoded}?=`
    }
    return subject
}

/**
 * Wrap plain text body in a minimal HTML template for proper email rendering.
 * If body already contains HTML tags, use as-is.
 */
function wrapBodyAsHtml(body: string): string {
    // If already HTML, return as-is
    if (/<[a-z][\s\S]*>/i.test(body)) {
        return body
    }
    // Convert plain text to HTML: newlines → <br>, preserve paragraphs
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

    const htmlBody = wrapBodyAsHtml(body)
    const encodedSubject = encodeSubject(subject)

    // Build RFC 2822 message with MIME boundary for proper HTML email
    const boundary = `boundary_${Date.now()}`
    const fromHeader = from ? `From: ${from}` : ''
    const rawMessage = [
        fromHeader,
        `To: ${to}`,
        `Subject: ${encodedSubject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(body, 'utf-8').toString('base64'),
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(htmlBody, 'utf-8').toString('base64'),
        '',
        `--${boundary}--`,
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
