import { GoogleGenAI } from '@google/genai'
import { SYSTEM_PROMPT, SMS_SYSTEM_PROMPT, buildUserPrompt, buildSmsUserPrompt } from './prompt'

let _ai: GoogleGenAI | null = null
function getAI() {
    if (!_ai) _ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY!,
        httpOptions: { apiVersion: 'v1beta' },
    })
    return _ai
}

export interface GeneratedEmail {
    subject: string
    body: string
}

/**
 * Generate a collection email using Google Gemini
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

    const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.4,
            responseMimeType: 'application/json',
        },
    })

    const text = response.text ?? ''

    try {
        const parsed = JSON.parse(text)
        return {
            subject: parsed.subject || `Påminnelse: Faktura ${params.invoiceNumber}`,
            body: parsed.body || '',
        }
    } catch {
        console.error('[Gemini] Failed to parse JSON response:', text)
        return {
            subject: `Påminnelse: Faktura ${params.invoiceNumber} — ${params.amount.toLocaleString('sv-SE')} ${params.currency}`,
            body: text,
        }
    }
}

/**
 * Generate a collection SMS using Google Gemini
 */
export async function generateCollectionSms(params: {
    debtorName: string
    amount: number
    currency: string
    invoiceUrl?: string | null
    step: number
}): Promise<string> {
    const userPrompt = buildSmsUserPrompt(params)

    const response = await getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
            systemInstruction: SMS_SYSTEM_PROMPT,
            temperature: 0.3,
            responseMimeType: 'application/json',
        },
    })

    const text = response.text ?? ''

    try {
        const parsed = JSON.parse(text)
        return parsed.body || `Påminnelse: Du har en obetald faktura på ${params.amount.toLocaleString('sv-SE')} ${params.currency}. Vänligen betala snarast.`
    } catch {
        console.error('[Gemini] Failed to parse SMS JSON response:', text)
        return text || `Påminnelse: Du har en obetald faktura på ${params.amount.toLocaleString('sv-SE')} ${params.currency}. Vänligen betala snarast.`
    }
}
