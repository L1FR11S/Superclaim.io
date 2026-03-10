import { AgentMailClient } from 'agentmail'
import type * as AgentMail from 'agentmail'

let _client: AgentMailClient | null = null
function getClient() {
    if (!_client) _client = new AgentMailClient({ apiKey: process.env.AGENTMAIL_API_KEY! })
    return _client
}

// ─── Pods ────────────────────────────────────────────

/**
 * Create a Pod (tenant container) for a customer organization.
 * Each org gets one pod that groups all their inboxes.
 */
export async function createPod(name: string, clientId?: string) {
    return getClient().pods.create({ name, clientId })
}

/**
 * Get a Pod by ID
 */
export async function getPod(podId: string) {
    return getClient().pods.get(podId)
}

/**
 * List all inboxes within a Pod
 */
export async function listPodInboxes(podId: string) {
    return getClient().pods.inboxes.list(podId)
}

/**
 * Delete a Pod
 */
export async function deletePod(podId: string) {
    return getClient().pods.delete(podId)
}

// ─── Inboxes ─────────────────────────────────────────

/**
 * Create a new AgentMail inbox inside a Pod (preferred) or standalone.
 * - Uses pods.inboxes.create(podId, {...}) to associate with the customer's pod
 * - 'username' sets the email prefix (e.g. "karlssonbygg" → karlssonbygg@agentmail.to)
 */
export async function createAgentInbox(opts?: {
    username?: string       // email prefix, e.g. "karlssonbygg"
    displayName?: string
    domain?: string
    podId?: string          // if provided, inbox is created inside this pod
}) {
    const params: { username?: string; displayName?: string; domain?: string } = {}
    if (opts?.username) params.username = opts.username
    if (opts?.displayName) params.displayName = opts.displayName
    if (opts?.domain) params.domain = opts.domain

    if (opts?.podId) {
        // Create inbox INSIDE the customer's dedicated pod
        return getClient().pods.inboxes.create(opts.podId, params)
    } else {
        return getClient().inboxes.create(params)
    }
}

/**
 * Send a collection email from the agent's inbox
 */
export async function sendCollectionEmail(params: {
    inboxId: string
    to: string
    subject: string
    body: string
}) {
    const result = await getClient().inboxes.messages.send(params.inboxId, {
        to: params.to,
        subject: params.subject,
        text: params.body,
    })
    return result
}

/**
 * Reply to an existing message in the same thread
 */
export async function replyToMessage(params: {
    inboxId: string
    messageId: string
    body: string
}) {
    const result = await getClient().inboxes.messages.replyAll(
        params.inboxId,
        params.messageId,
        { text: params.body }
    )
    return result
}

/**
 * Get a conversation thread
 */
export async function getThread(inboxId: string, threadId: string) {
    return getClient().inboxes.threads.get(inboxId, threadId)
}

/**
 * List messages in an inbox
 */
export async function listMessages(inboxId: string) {
    return getClient().inboxes.messages.list(inboxId)
}

// ─── Domains ─────────────────────────────────────────

/**
 * Register a custom domain with AgentMail.
 */
export async function createDomain(domain: string) {
    return getClient().domains.create({ domain, feedbackEnabled: true })
}

/**
 * Get domain status and DNS records.
 */
export async function getDomain(domainId: string) {
    return getClient().domains.get(domainId)
}

/**
 * Trigger DNS verification for a domain.
 */
export async function verifyDomain(domainId: string) {
    return getClient().domains.verify(domainId)
}

/**
 * List all registered domains.
 */
export async function listDomains() {
    return getClient().domains.list()
}

export { getClient as getAgentMailClient }
