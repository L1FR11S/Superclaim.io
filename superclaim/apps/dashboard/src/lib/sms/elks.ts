/**
 * 46elks SMS integration
 * Docs: https://46elks.se/docs
 * 
 * `from` field: max 11 alphanumeric characters (for text sender ID)
 * or a phone number in E.164 format (e.g. +46701234567)
 */

function getAuth() {
    const username = (process.env.ELKS_API_USERNAME ?? '').trim()
    const password = (process.env.ELKS_API_PASSWORD ?? '').trim()
    return btoa(`${username}:${password}`)
}

/**
 * Clean a sender name to comply with 46elks requirements:
 * - Max 11 characters
 * - Only alphanumeric (a-z, A-Z, 0-9)
 */
function cleanSenderName(name: string): string {
    return name
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .substring(0, 11) || 'Superclaim'
}

/**
 * Send an SMS via 46elks.
 * 
 * @param from - Sender name (org name, max 11 chars) or phone number
 * @param to - Recipient phone in E.164 format (+46...)
 * @param message - SMS text (will be split if > 160 chars)
 */
export async function sendSms(params: {
    from: string
    to: string
    message: string
}) {
    const { from, to, message } = params

    // Determine if `from` is a phone number or text name
    const senderFrom = from.startsWith('+') ? from : cleanSenderName(from)

    const body = new URLSearchParams({
        from: senderFrom,
        to,
        message,
    })

    const res = await fetch('https://api.46elks.com/a1/sms', {
        method: 'POST',
        body: body.toString(),
        headers: {
            'Authorization': `Basic ${getAuth()}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    const text = await res.text()
    let data: any
    try {
        data = JSON.parse(text)
    } catch {
        // 46elks returned plain text (e.g. "API access denied")
        throw new Error(`46elks fel: ${text.trim()}`)
    }

    if (!res.ok || data.status === 'failed') {
        throw new Error(`46elks SMS misslyckades: ${JSON.stringify(data)}`)
    }

    return data as {
        id: string
        status: string
        from: string
        to: string
        message: string
        created: string
        cost: number
    }
}

/**
 * Build a collection SMS message with invoice link
 */
export function buildCollectionSms(params: {
    debtorName: string
    amount: number
    currency: string
    invoiceUrl?: string | null
    step: number
}): string {
    const { debtorName, amount, currency, invoiceUrl, step } = params
    const amountStr = amount.toLocaleString('sv-SE')

    if (step <= 3) {
        const base = `Hej! Du har en obetald faktura på ${amountStr} ${currency}. Vänligen betala snarast.`
        return invoiceUrl ? `${base}\n\nSe faktura: ${invoiceUrl}` : base
    }

    // Step 4+: More urgent
    const base = `Påminnelse: Faktura på ${amountStr} ${currency} är fortfarande obetald. Om betalning ej sker omgående kan ärendet överlämnas till inkasso.`
    return invoiceUrl ? `${base}\n\nFaktura: ${invoiceUrl}` : base
}
