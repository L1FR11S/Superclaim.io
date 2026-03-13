/**
 * Universal email sender — routes through the correct provider
 * based on org_settings.email_provider
 *
 * Tokens are stored per-provider in nested JSONB:
 * { google: { access_token, refresh_token, ... }, microsoft: { access_token, ... } }
 */

import { sendCollectionEmail } from './agentmail'
import { sendGmailEmail, refreshGoogleToken } from './gmail'
import { sendMicrosoftEmail } from './microsoft'

export interface EmailAttachment {
    filename: string
    content: Buffer
    contentType: string
}

interface OrgEmailSettings {
    email_provider?: 'agentmail' | 'google' | 'microsoft' | 'custom_domain'
    email_provider_address?: string | null
    email_provider_tokens?: {
        google?: {
            access_token?: string
            refresh_token?: string
            expiry_date?: number
            email?: string
            name?: string
        }
        microsoft?: {
            access_token?: string
            expires_on?: string
            account?: any
            email?: string
        }
    } | null
    agentmail_inbox_id?: string | null
}

interface SendEmailParams {
    to: string
    subject: string
    body: string
    orgSettings: OrgEmailSettings
    attachments?: EmailAttachment[]
    threadId?: string
    inReplyTo?: string
    fromName?: string
}

export async function sendEmailViaProvider({
    to,
    subject,
    body,
    orgSettings,
    attachments,
    threadId,
    inReplyTo,
    fromName,
}: SendEmailParams): Promise<{ messageId: string; threadId: string }> {
    const provider = orgSettings.email_provider || 'agentmail'

    switch (provider) {
        case 'google': {
            const tokens = orgSettings.email_provider_tokens?.google
            if (!tokens?.access_token || !tokens?.refresh_token) {
                throw new Error('Google-tokens saknas. Koppla om Gmail under E-post & SMS.')
            }

            // Check if token is expired and refresh if needed
            let accessToken = tokens.access_token
            if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
                const refreshed = await refreshGoogleToken(tokens.refresh_token)
                accessToken = refreshed.access_token || accessToken
            }

            return sendGmailEmail({
                accessToken,
                refreshToken: tokens.refresh_token,
                to,
                subject,
                body,
                from: tokens.email || orgSettings.email_provider_address || undefined,
                fromName: tokens.name || undefined,
                threadId,
                inReplyTo,
                attachments,
            })
        }

        case 'microsoft': {
            const tokens = orgSettings.email_provider_tokens?.microsoft
            if (!tokens?.access_token) {
                throw new Error('Microsoft-tokens saknas. Koppla om Outlook under E-post & SMS.')
            }

            return sendMicrosoftEmail({
                accessToken: tokens.access_token,
                to,
                subject,
                body,
                inReplyTo,
                attachments,
            })
        }

        case 'custom_domain':
        case 'agentmail':
        default: {
            if (!orgSettings.agentmail_inbox_id) {
                throw new Error('Ingen AgentMail inbox konfigurerad.')
            }
            return sendCollectionEmail({
                inboxId: orgSettings.agentmail_inbox_id,
                to,
                subject,
                body,
                attachments,
            })
        }
    }
}
