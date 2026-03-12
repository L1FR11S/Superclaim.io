import Anthropic from '@anthropic-ai/sdk'
import {
    SYSTEM_PROMPT, SMS_SYSTEM_PROMPT, buildUserPrompt, buildSmsUserPrompt,
    PRE_REMINDER_EMAIL_PROMPT, PRE_REMINDER_SMS_PROMPT,
    buildPreReminderEmailPrompt, buildPreReminderSmsPrompt,
} from './prompt'

let _client: Anthropic | null = null
function getClient() {
    if (!_client) _client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
    })
    return _client
}

export interface GeneratedEmail {
    subject: string
    body: string
}

/**
 * Generate a collection email using Claude Haiku 4.5
 */
export async function generateCollectionEmail(params: {
    debtorName: string
    amount: number
    currency: string
    invoiceNumber: string
    dueDate: string
    step: number
    tone: 'professional' | 'friendly' | 'direct'
}): Promise<GeneratedEmail> {
    const userPrompt = buildUserPrompt(params)

    const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    try {
        // Strip markdown code fences if present
        const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
        const parsed = JSON.parse(cleaned)
        return {
            subject: parsed.subject || `Påminnelse: Faktura ${params.invoiceNumber}`,
            body: parsed.body || '',
        }
    } catch {
        console.error('[Claude] Failed to parse JSON response:', text)
        return {
            subject: `Påminnelse: Faktura ${params.invoiceNumber} — ${params.amount.toLocaleString('sv-SE')} ${params.currency}`,
            body: text,
        }
    }
}

/**
 * Generate a collection SMS using Claude Haiku 4.5
 */
export async function generateCollectionSms(params: {
    debtorName: string
    amount: number
    currency: string
    invoiceUrl?: string | null
    step: number
}): Promise<string> {
    const userPrompt = buildSmsUserPrompt(params)

    const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SMS_SYSTEM_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    try {
        const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
        const parsed = JSON.parse(cleaned)
        return parsed.body || `Påminnelse: Du har en obetald faktura på ${params.amount.toLocaleString('sv-SE')} ${params.currency}. Vänligen betala snarast.`
    } catch {
        console.error('[Claude] Failed to parse SMS JSON response:', text)
        return text || `Påminnelse: Du har en obetald faktura på ${params.amount.toLocaleString('sv-SE')} ${params.currency}. Vänligen betala snarast.`
    }
}

// ─── PRE-REMINDER GENERATORS ──────────────────────────────

/**
 * Generate a pre-due reminder email (friendly, service-oriented)
 */
export async function generatePreReminderEmail(params: {
    creditorName: string
    debtorName: string
    amount: number
    currency: string
    invoiceNumber: string
    dueDate: string
    daysUntilDue: number
}): Promise<GeneratedEmail> {
    const userPrompt = buildPreReminderEmailPrompt(params)

    const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: PRE_REMINDER_EMAIL_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    try {
        const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
        const parsed = JSON.parse(cleaned)
        return {
            subject: parsed.subject || `Påminnelse: Faktura ${params.invoiceNumber} förfaller snart`,
            body: parsed.body || '',
        }
    } catch {
        console.error('[Claude] Failed to parse pre-reminder email:', text)
        return {
            subject: `Påminnelse: Faktura ${params.invoiceNumber} förfaller om ${params.daysUntilDue} dagar`,
            body: text,
        }
    }
}

/**
 * Generate a pre-due reminder SMS (short, friendly)
 */
export async function generatePreReminderSms(params: {
    debtorName: string
    amount: number
    currency: string
    dueDate: string
    daysUntilDue: number
}): Promise<string> {
    const userPrompt = buildPreReminderSmsPrompt(params)

    const response = await getClient().messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: PRE_REMINDER_SMS_PROMPT,
        messages: [
            { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''

    try {
        const cleaned = text.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim()
        const parsed = JSON.parse(cleaned)
        return parsed.body || `Hej! Faktura på ${params.amount.toLocaleString('sv-SE')} ${params.currency} förfaller ${params.dueDate}. Betala gärna i tid!`
    } catch {
        console.error('[Claude] Failed to parse pre-reminder SMS:', text)
        return text || `Hej! Faktura på ${params.amount.toLocaleString('sv-SE')} ${params.currency} förfaller ${params.dueDate}. Betala gärna i tid!`
    }
}
