import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'


/**
 * POST /api/onboarding/preview
 * Generate a sample collection email using Gemini based on selected tone.
 * Used during onboarding to show the user what their AI agent will produce.
 */
export async function POST(request: Request) {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
        const body = await request.json()
        const { tone, company_name } = body

        if (!tone) {
            return NextResponse.json({ error: 'Tone krävs' }, { status: 400 })
        }

        const toneDescriptions: Record<string, string> = {
            professional: 'Professionell och saklig. Tydlig utan att vara aggressiv. Använd formellt språk.',
            friendly: 'Vänlig och hjälpsam. Empatisk ton som ändå är tydlig med att betalning behöver ske.',
            direct: 'Rak och koncis. Kort och direkt utan onödiga artighetsfraser. Effektiv kommunikation.',
        }

        const prompt = `Du är en AI-inkassoagent för ${company_name || 'ett svenskt företag'}. 
Generera ett exempel på ett första påminnelsemejl för en obetald faktura.

Tonalitet: ${toneDescriptions[tone] || toneDescriptions.professional}

Fakturadetaljer (exempeldata):
- Fakturanummer: F-2024-0847
- Belopp: 12 500 SEK
- Förfallodatum: 15 dagar sedan
- Gäldenär: Anna Karlsson, Karlsson Bygg AB

Svara i JSON-format:
{
  "subject": "Ämnesrad för mejlet",
  "body": "Mejlets innehåll i ren text. Max 150 ord."
}

Svara BARA med JSON, inget annat.`

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        })

        const text = response.text?.trim() || ''

        // Parse JSON from response (handle markdown code blocks)
        let parsed
        try {
            const jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            parsed = JSON.parse(jsonStr)
        } catch {
            parsed = {
                subject: 'Påminnelse: Obetald faktura F-2024-0847',
                body: 'Hej Anna,\n\nVi vill påminna om att faktura F-2024-0847 på 12 500 SEK har passerat förfallodatum med 15 dagar. Vänligen genomför betalning snarast.\n\nMed vänliga hälsningar,\n' + (company_name || 'Vårt företag'),
            }
        }

        return NextResponse.json({
            subject: parsed.subject,
            body: parsed.body,
            tone,
        })
    } catch (err: any) {
        console.error('[Onboarding Preview Error]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
