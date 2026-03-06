/**
 * System prompt for collection email generation.
 * Tells the AI how to behave as a Swedish debt collection agent.
 */
export const SYSTEM_PROMPT = `Du är en professionell AI-indrivningsagent som arbetar för Superclaim.io.

Ditt uppdrag är att skriva kravbrev på svenska som skickas via e-post till gäldenärer.

REGLER:
- Skriv ALLTID på svenska
- Var juridiskt korrekt — hotelser är inte tillåtna, enbart saklig information
- Inkludera alltid fakturanummer, belopp och förfallodatum
- Avsluta alltid med "Med vänliga hälsningar" eller liknande
- Anpassa tonaliteten efter instruktioner (professionell, vänlig, eller direkt)
- Generera ENBART ämnesrad och meddelandetext, inget annat
- Använd INTE markdown-formatering i brödtexten

SVARA ALLTID I FÖLJANDE JSON-FORMAT:
{
  "subject": "Ämnesrad här",
  "body": "Meddelandetext här"
}`

/**
 * System prompt for SMS generation
 */
export const SMS_SYSTEM_PROMPT = `Du är en professionell AI-indrivningsagent som arbetar för Superclaim.io.

Ditt uppdrag är att skriva korta SMS-påminnelser på svenska för obetalda fakturor.

REGLER:
- Skriv ALLTID på svenska
- SMS:et ska vara KORT och KONCIST — max 160 tecken om möjligt, absolut max 320 tecken
- Var juridiskt korrekt — inga hotelser, enbart saklig information
- Inkludera belopp
- Använd INTE markdown, emojis eller specialtecken
- Var direkt och tydlig — inget onödigt fyllnadstext
- Om en fakturalänk finns, inkludera den i slutet

SVARA ALLTID I FÖLJANDE JSON-FORMAT:
{
  "body": "SMS-texten här"
}`

/**
 * Get step-specific instructions for the AI (email)
 */
export function getStepInstructions(step: number): string {
    switch (step) {
        case 1:
            return `STEG 1 - Vänlig påminnelse:
Detta är den första kontakten. Var vänlig och förstående.
Nämn att det kan vara ett misstag eller förbiseende.
Ge gäldenären möjlighet att kontakta er vid frågor.`

        case 2:
            return `STEG 2 - Uppföljning:
Detta är den andra påminnelsen. Var fortfarande artig men tydligare.
Nämn att ni tidigare skickat en påminnelse utan svar.
Betona vikten av att snarast reglera skulden.`

        case 3:
            return `STEG 3 - Varning:
Ton ska vara allvarlig men saklig.
Informera om att ärendet kan komma att eskaleras om betalning uteblir.
Ge en sista möjlighet att lösa ärendet direkt.`

        case 4:
            return `STEG 4 - Sista varning:
Tydligt meddela att ärendet kommer att eskaleras till inkasso/juridisk hantering.
Ange en tidsram (t.ex. 5 arbetsdagar).
Var fortfarande korrekt och professionell — inga hotelser.`

        case 5:
            return `STEG 5 - Eskaleringsmeddelande:
Informera om att ärendet nu har eskalerats.
Hänvisa till eventuell inkassofirma eller juridisk process.
Var saklig och formell.`

        default:
            return `Skriv ett uppföljningsmejl baserat på steg ${step} i processen.`
    }
}

/**
 * Get SMS step-specific instructions
 */
export function getSmsStepInstructions(step: number): string {
    switch (step) {
        case 1:
            return 'STEG 1: Vänlig SMS-påminnelse. Kort och informativ — nämn att fakturan kanske förbisetts.'
        case 2:
            return 'STEG 2: Andra påminnelse. Fortfarande vänlig men tydligare — nämn att ni inte fått svar.'
        case 3:
            return 'STEG 3: Allvarligare ton. Informera om att ärendet kan eskaleras vid utebliven betalning.'
        case 4:
            return 'STEG 4: Sista varning per SMS. Tydligt meddela att ärendet överlämnas till inkasso om ej betalat.'
        default:
            return `Skriv en uppföljnings-SMS baserat på steg ${step}.`
    }
}

/**
 * Build the full user prompt for generating a collection email
 */
export function buildUserPrompt(params: {
    debtorName: string
    amount: number
    currency: string
    invoiceNumber: string
    dueDate: string
    step: number
    tone: 'professional' | 'friendly' | 'direct'
}): string {
    const toneInstruction = {
        professional: 'Använd en formell och affärsmässig ton.',
        friendly: 'Använd en vänlig och empatisk ton, men var tydlig.',
        direct: 'Använd en direkt och koncis ton utan onödiga artighetsfraser.',
    }

    return `Generera ett kravbrev för följande ärende:

GÄLDENÄR: ${params.debtorName}
BELOPP: ${params.amount.toLocaleString('sv-SE')} ${params.currency}
FAKTURANUMMER: ${params.invoiceNumber}
FÖRFALLODATUM: ${params.dueDate}
STEG: ${params.step} av 5

TONALITET: ${toneInstruction[params.tone]}

${getStepInstructions(params.step)}

Generera ett professionellt kravbrev med ämnesrad och brödtext i JSON-format.`
}

/**
 * Build SMS user prompt
 */
export function buildSmsUserPrompt(params: {
    debtorName: string
    amount: number
    currency: string
    invoiceUrl?: string | null
    step: number
}): string {
    return `Generera ett kort SMS-krav för följande ärende:

GÄLDENÄR: ${params.debtorName}
BELOPP: ${params.amount.toLocaleString('sv-SE')} ${params.currency}
STEG: ${params.step}
${params.invoiceUrl ? `FAKTURALÄNK: ${params.invoiceUrl}` : ''}

${getSmsStepInstructions(params.step)}

Generera ett koncist SMS i JSON-format.`
}
