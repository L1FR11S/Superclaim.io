/**
 * Auto-renewal of Gmail watches and Microsoft Graph subscriptions.
 * Called from the agent cron endpoint before processing claims.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { watchGmailInbox, refreshGoogleToken } from '@/lib/email/gmail'
import { renewGraphSubscription, createGraphSubscription, refreshMicrosoftTokenViaRefreshToken } from '@/lib/email/microsoft'

export async function renewEmailWatches() {
    const now = Date.now()
    const errors: string[] = []

    // Fetch all orgs with Google or Microsoft email provider
    const { data: allSettings } = await supabaseAdmin
        .from('org_settings')
        .select('org_id, email_provider, email_provider_tokens, email_provider_address')
        .in('email_provider', ['google', 'microsoft'])

    if (!allSettings || allSettings.length === 0) return { renewed: 0, errors }

    let renewed = 0

    for (const settings of allSettings) {
        try {
            if (settings.email_provider === 'google') {
                await renewGoogleWatch(settings, now, errors)
                renewed++
            } else if (settings.email_provider === 'microsoft') {
                await renewMicrosoftSubscription(settings, now, errors)
                renewed++
            }
        } catch (err: any) {
            errors.push(`Org ${settings.org_id}: ${err.message}`)
        }
    }

    if (errors.length > 0) {
        console.error('[Renew] Errors:', errors)
    }

    return { renewed, errors }
}

async function renewGoogleWatch(
    settings: any,
    now: number,
    errors: string[],
) {
    const tokens = settings.email_provider_tokens?.google
    if (!tokens?.refresh_token) return

    // Check if watch needs renewal (expires in < 24h or missing)
    const watchExp = tokens.watch_expiration ? Number(tokens.watch_expiration) : 0
    const renewThreshold = 24 * 60 * 60 * 1000 // 24h

    if (watchExp > 0 && (watchExp - now) > renewThreshold) {
        return // Still valid, no need to renew
    }

    console.info(`[Renew] Google watch for org ${settings.org_id} — renewing`)

    // Refresh access token
    let accessToken = tokens.access_token
    try {
        const refreshed = await refreshGoogleToken(tokens.refresh_token)
        accessToken = refreshed.access_token || accessToken
    } catch (err: any) {
        errors.push(`Google token refresh org ${settings.org_id}: ${err.message}`)
        return
    }

    // Re-watch
    const topicName = process.env.GOOGLE_PUBSUB_TOPIC || ''
    if (!topicName) {
        errors.push(`Google: GOOGLE_PUBSUB_TOPIC not set`)
        return
    }

    try {
        const watch = await watchGmailInbox({
            accessToken,
            refreshToken: tokens.refresh_token,
            topicName,
        })

        // Update stored tokens
        await supabaseAdmin.from('org_settings').update({
            email_provider_tokens: {
                ...settings.email_provider_tokens,
                google: {
                    ...tokens,
                    access_token: accessToken,
                    watch_expiration: watch.expiration,
                    watch_history_id: watch.historyId || tokens.watch_history_id,
                },
            },
        }).eq('org_id', settings.org_id)

        console.info(`[Renew] Google watch renewed for org ${settings.org_id}, expires: ${watch.expiration}`)
    } catch (err: any) {
        errors.push(`Google watch renewal org ${settings.org_id}: ${err.message}`)
    }
}

async function renewMicrosoftSubscription(
    settings: any,
    now: number,
    errors: string[],
) {
    const tokens = settings.email_provider_tokens?.microsoft
    if (!tokens?.refresh_token) {
        errors.push(`Microsoft org ${settings.org_id}: No refresh_token — user needs to re-connect`)
        return
    }

    // Check if subscription needs renewal (expires in < 12h or missing)
    const subExp = tokens.subscription_expiration ? new Date(tokens.subscription_expiration).getTime() : 0
    const renewThreshold = 12 * 60 * 60 * 1000 // 12h

    if (subExp > 0 && (subExp - now) > renewThreshold) {
        return // Still valid, no need to renew
    }

    console.info(`[Renew] Microsoft subscription for org ${settings.org_id} — renewing`)

    // Refresh access token
    let accessToken = tokens.access_token
    let newRefreshToken = tokens.refresh_token
    try {
        const refreshed = await refreshMicrosoftTokenViaRefreshToken(tokens.refresh_token)
        accessToken = refreshed.accessToken
        newRefreshToken = refreshed.refreshToken
    } catch (err: any) {
        errors.push(`Microsoft token refresh org ${settings.org_id}: ${err.message}`)
        return
    }

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.superclaim.io'}/api/webhooks/microsoft`
    const webhookSecret = process.env.MICROSOFT_WEBHOOK_SECRET || ''

    try {
        let subscriptionId = tokens.subscription_id
        let newExpiration: string

        if (subscriptionId) {
            // Try to renew existing subscription
            try {
                const result = await renewGraphSubscription({ accessToken, subscriptionId })
                newExpiration = result.expiration
            } catch {
                // Subscription may have expired — create a new one
                console.info(`[Renew] Microsoft: existing subscription expired, creating new one`)
                const result = await createGraphSubscription({
                    accessToken,
                    webhookUrl,
                    secret: webhookSecret,
                })
                subscriptionId = result.subscriptionId
                newExpiration = result.expiration
            }
        } else {
            // No subscription yet — create one
            const result = await createGraphSubscription({
                accessToken,
                webhookUrl,
                secret: webhookSecret,
            })
            subscriptionId = result.subscriptionId
            newExpiration = result.expiration
        }

        // Update stored tokens
        await supabaseAdmin.from('org_settings').update({
            email_provider_tokens: {
                ...settings.email_provider_tokens,
                microsoft: {
                    ...tokens,
                    access_token: accessToken,
                    refresh_token: newRefreshToken,
                    expires_on: new Date(Date.now() + 3600 * 1000).toISOString(),
                    subscription_id: subscriptionId,
                    subscription_expiration: newExpiration,
                },
            },
        }).eq('org_id', settings.org_id)

        console.info(`[Renew] Microsoft subscription renewed for org ${settings.org_id}, expires: ${newExpiration}`)
    } catch (err: any) {
        errors.push(`Microsoft subscription renewal org ${settings.org_id}: ${err.message}`)
    }
}
