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
            'https://www.googleapis.com/auth/gmail.readonly',
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

// ─── Gmail Watch (Pub/Sub) ──────────────────────────

/**
 * Start watching a Gmail inbox via Pub/Sub.
 * Returns expiration timestamp and historyId.
 */
export async function watchGmailInbox({
    accessToken,
    refreshToken,
    topicName,
}: {
    accessToken: string
    refreshToken: string
    topicName: string
}) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const res = await gmail.users.watch({
        userId: 'me',
        requestBody: {
            topicName,
            labelIds: ['INBOX'],
        },
    })

    return {
        expiration: res.data.expiration || '',  // ms timestamp string
        historyId: res.data.historyId || '',
    }
}

/**
 * Stop watching a Gmail inbox (cleanup on disconnect).
 */
export async function stopGmailWatch({
    accessToken,
    refreshToken,
}: {
    accessToken: string
    refreshToken: string
}) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    await gmail.users.stop({ userId: 'me' })
}

/**
 * Fetch new messages since a given historyId.
 * Returns array of { messageId, threadId, from, subject, body }.
 */
export async function getGmailHistoryMessages({
    accessToken,
    refreshToken,
    startHistoryId,
}: {
    accessToken: string
    refreshToken: string
    startHistoryId: string
}) {
    oauth2Client.setCredentials({ access_token: accessToken, refresh_token: refreshToken })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const history = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        labelId: 'INBOX',
    })

    const messages: {
        messageId: string
        threadId: string
        from: string
        subject: string
        body: string
    }[] = []

    const historyRecords = history.data.history || []
    for (const record of historyRecords) {
        for (const added of record.messagesAdded || []) {
            const msgId = added.message?.id
            if (!msgId) continue

            try {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: msgId,
                    format: 'full',
                })

                const headers = msg.data.payload?.headers || []
                const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || ''
                const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''

                // Extract body (plain text preferred)
                let body = ''
                const parts = msg.data.payload?.parts || []
                const textPart = parts.find(p => p.mimeType === 'text/plain')
                if (textPart?.body?.data) {
                    body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8')
                } else if (msg.data.payload?.body?.data) {
                    body = Buffer.from(msg.data.payload.body.data, 'base64url').toString('utf-8')
                }

                messages.push({
                    messageId: msgId,
                    threadId: msg.data.threadId || '',
                    from,
                    subject,
                    body,
                })
            } catch (err) {
                console.error(`[Gmail] Failed to fetch message ${msgId}:`, err)
            }
        }
    }

    return {
        messages,
        newHistoryId: history.data.historyId || startHistoryId,
    }
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
    fromName,
    threadId,
    inReplyTo,
    attachments,
}: {
    accessToken: string
    refreshToken: string
    to: string
    subject: string
    body: string
    from?: string
    fromName?: string
    threadId?: string
    inReplyTo?: string
    attachments?: { filename: string; content: Buffer; contentType: string }[]
}) {
    oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
    })

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    const htmlBody = wrapBodyAsHtml(body)
    const encodedSubject = encodeSubject(subject)

    const hasAttachments = attachments && attachments.length > 0
    const altBoundary = `alt_${Date.now()}`
    const mixedBoundary = `mixed_${Date.now()}`

    // Build the text/html alternative part
    const alternativePart = [
        `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        '',
        `--${altBoundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(body, 'utf-8').toString('base64'),
        '',
        `--${altBoundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        Buffer.from(htmlBody, 'utf-8').toString('base64'),
        '',
        `--${altBoundary}--`,
    ].join('\r\n')

    let rawMessage: string

    // Build From header with display name if available
    const fromHeader = from
        ? (fromName ? `From: "${fromName}" <${from}>` : `From: ${from}`)
        : undefined

    // Reply headers for threading
    const replyHeaders = inReplyTo
        ? [`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`]
        : []

    if (hasAttachments) {
        // Multipart/mixed: alternative body + attachments
        const headers = [
            ...(fromHeader ? [fromHeader] : []),
            `To: ${to}`,
            `Subject: ${encodedSubject}`,
            ...replyHeaders,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        ].join('\r\n')

        const attachmentParts = attachments.map(att => [
            `--${mixedBoundary}`,
            `Content-Type: ${att.contentType}; name="${att.filename}"`,
            `Content-Disposition: attachment; filename="${att.filename}"`,
            'Content-Transfer-Encoding: base64',
            '',
            att.content.toString('base64'),
        ].join('\r\n')).join('\r\n')

        rawMessage = [
            headers,
            '',
            `--${mixedBoundary}`,
            alternativePart,
            '',
            attachmentParts,
            '',
            `--${mixedBoundary}--`,
        ].join('\r\n')
    } else {
        // No attachments — just multipart/alternative
        const headers = [
            ...(fromHeader ? [fromHeader] : []),
            `To: ${to}`,
            `Subject: ${encodedSubject}`,
            ...replyHeaders,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
        ].join('\r\n')

        rawMessage = [
            headers,
            '',
            `--${altBoundary}`,
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(body, 'utf-8').toString('base64'),
            '',
            `--${altBoundary}`,
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(htmlBody, 'utf-8').toString('base64'),
            '',
            `--${altBoundary}--`,
        ].join('\r\n')
    }

    const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')

    const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
            raw: encodedMessage,
            ...(threadId ? { threadId } : {}),
        },
    })

    return {
        messageId: result.data.id || '',
        threadId: result.data.threadId || '',
    }
}
