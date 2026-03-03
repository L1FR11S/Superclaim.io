import { GoogleGenAI } from '@google/genai'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt'

let _ai: GoogleGenAI | null = null
function getAI() {
    if (!_ai) _ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
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
        model: 'gemini-2.0-flash',
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
        // Fallback: try to extract from text
        console.error('[Gemini] Failed to parse JSON response:', text)
        return {
            subject: `Påminnelse: Faktura ${params.invoiceNumber} — ${params.amount.toLocaleString('sv-SE')} ${params.currency}`,
            body: text,
        }
    }
}
