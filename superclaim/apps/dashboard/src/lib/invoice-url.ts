/**
 * Generate a short invoice URL for use in SMS messages.
 * Uses the first 8 characters of the claim UUID as a short ID.
 * 
 * Example: superclaim.io/f/108a7547
 */
export function getInvoiceUrl(claimId: string): string {
    const shortId = claimId.replace(/-/g, '').slice(0, 8)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.superclaim.io'
    return `${baseUrl}/f/${shortId}`
}
