/**
 * Fortnox API Integration
 * 
 * OAuth2 Authorization Code Flow + Invoice/Customer API
 * Docs: https://apps.fortnox.se/apidocs
 */

import { createAdminClient } from '@/utils/supabase/admin'

const FORTNOX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth'
const FORTNOX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token'
const FORTNOX_API_BASE = 'https://api.fortnox.se/3'

// ─── OAuth2 ──────────────────────────────────────────

/**
 * Generate the OAuth2 authorization URL
 */
export function getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
        client_id: process.env.FORTNOX_CLIENT_ID!,
        redirect_uri: process.env.FORTNOX_REDIRECT_URI!,
        scope: 'invoice customer companyinformation',
        state,
        access_type: 'offline',
        response_type: 'code',
    })
    return `${FORTNOX_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access + refresh tokens
 */
export async function exchangeCodeForToken(code: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
}> {
    const credentials = Buffer.from(
        `${process.env.FORTNOX_CLIENT_ID}:${process.env.FORTNOX_CLIENT_SECRET}`
    ).toString('base64')

    const res = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.FORTNOX_REDIRECT_URI!,
        }).toString(),
    })

    const data = await res.json()
    if (!res.ok) {
        throw new Error(`Fortnox token exchange failed: ${JSON.stringify(data)}`)
    }
    return data
}

/**
 * Refresh the access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    access_token: string
    refresh_token: string
    expires_in: number
}> {
    const credentials = Buffer.from(
        `${process.env.FORTNOX_CLIENT_ID}:${process.env.FORTNOX_CLIENT_SECRET}`
    ).toString('base64')

    const res = await fetch(FORTNOX_TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }).toString(),
    })

    const data = await res.json()
    if (!res.ok) {
        throw new Error(`Fortnox token refresh failed: ${JSON.stringify(data)}`)
    }
    return data
}

// ─── Token Management ────────────────────────────────

/**
 * Get a valid access token for an org, auto-refreshing if expired
 */
export async function getAccessToken(orgId: string): Promise<string> {
    const admin = createAdminClient()

    const { data: settings } = await admin
        .from('org_settings')
        .select('fortnox_access_token, fortnox_refresh_token, fortnox_token_expires_at')
        .eq('org_id', orgId)
        .single()

    if (!settings?.fortnox_refresh_token) {
        throw new Error('Fortnox ej kopplat — gå till Inställningar och koppla Fortnox')
    }

    // Check if token is still valid (with 5 min buffer)
    const expiresAt = new Date(settings.fortnox_token_expires_at)
    const now = new Date()
    const buffer = 5 * 60 * 1000 // 5 minutes

    if (settings.fortnox_access_token && expiresAt.getTime() - now.getTime() > buffer) {
        return settings.fortnox_access_token
    }

    // Token expired or about to expire — refresh
    const tokens = await refreshAccessToken(settings.fortnox_refresh_token)

    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await admin
        .from('org_settings')
        .update({
            fortnox_access_token: tokens.access_token,
            fortnox_refresh_token: tokens.refresh_token,
            fortnox_token_expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)

    return tokens.access_token
}

// ─── API Calls ───────────────────────────────────────

async function fortnoxGet(accessToken: string, endpoint: string) {
    const res = await fetch(`${FORTNOX_API_BASE}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
    })

    const data = await res.json()
    if (!res.ok) {
        throw new Error(`Fortnox API error (${res.status}): ${JSON.stringify(data)}`)
    }
    return data
}

/**
 * Fetch overdue (unpaid + past due date) invoices
 */
export async function fetchOverdueInvoices(orgId: string) {
    const token = await getAccessToken(orgId)
    const data = await fortnoxGet(token, '/invoices?filter=unpaidoverdue')
    return data.Invoices || []
}

/**
 * Fetch upcoming invoices — unpaid invoices due within `daysAhead` days.
 * Fortnox doesn't have a duedate filter, so we fetch all unpaid and filter server-side.
 */
export async function fetchUpcomingInvoices(orgId: string, daysAhead: number) {
    const token = await getAccessToken(orgId)
    const data = await fortnoxGet(token, '/invoices?filter=unpaid')
    const invoices = data.Invoices || []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const cutoff = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    return invoices.filter((inv: any) => {
        if (!inv.DueDate) return false
        const due = new Date(inv.DueDate)
        // Only include invoices that are NOT yet overdue and due within daysAhead
        return due >= today && due <= cutoff
    })
}

/**
 * Fetch a single invoice with full details
 */
export async function fetchInvoice(orgId: string, documentNumber: string) {
    const token = await getAccessToken(orgId)
    const data = await fortnoxGet(token, `/invoices/${documentNumber}`)
    return data.Invoice
}

/**
 * Fetch customer details (email, phone, etc.)
 */
export async function fetchCustomer(orgId: string, customerNumber: string) {
    const token = await getAccessToken(orgId)
    const data = await fortnoxGet(token, `/customers/${customerNumber}`)
    return data.Customer
}

/**
 * Fetch company information (to verify connection)
 */
export async function fetchCompanyInfo(orgId: string) {
    const token = await getAccessToken(orgId)
    const data = await fortnoxGet(token, '/companyinformation')
    return data.CompanyInformation
}

/**
 * Fetch invoice PDF from Fortnox
 * Returns the PDF as a Buffer, or null if not available
 */
export async function fetchInvoicePdf(orgId: string, invoiceNumber: string): Promise<Buffer | null> {
    try {
        const token = await getAccessToken(orgId)
        const res = await fetch(`${FORTNOX_API_BASE}/invoices/${invoiceNumber}/print`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/pdf',
            },
        })
        if (!res.ok) {
            console.error(`[Fortnox PDF] Failed to fetch PDF for invoice ${invoiceNumber}: ${res.status}`)
            return null
        }
        const arrayBuffer = await res.arrayBuffer()
        return Buffer.from(arrayBuffer)
    } catch (err: any) {
        console.error(`[Fortnox PDF] Error fetching PDF for invoice ${invoiceNumber}:`, err.message)
        return null
    }
}

/**
 * Upload invoice PDF to Supabase Storage and return public URL
 */
export async function uploadInvoicePdf(
    orgId: string,
    invoiceNumber: string,
    pdfBuffer: Buffer
): Promise<string | null> {
    try {
        const filePath = `${orgId}/${invoiceNumber}.pdf`
        const admin = createAdminClient()
        
        const { error } = await admin.storage
            .from('invoices')
            .upload(filePath, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            })

        if (error) {
            console.error(`[Storage] Upload error for ${filePath}:`, error.message)
            return null
        }

        const { data } = admin.storage
            .from('invoices')
            .getPublicUrl(filePath)

        return data.publicUrl
    } catch (err: any) {
        console.error(`[Storage] Error uploading PDF:`, err.message)
        return null
    }
}
