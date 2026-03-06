import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateCollectionEmail, generateCollectionSms } from './gemini'
import { sendCollectionEmail } from '@/lib/email/agentmail'
import { sendSms } from '@/lib/sms/elks'

// ─── Types ──────────────────────────────────────────

interface FlowNode {
    id: string
    type: string
    data: Record<string, any>
    position: { x: number; y: number }
}

interface FlowEdge {
    id: string
    source: string
    sourceHandle?: string
    target: string
    label?: string
    [key: string]: any
}

interface AgentFlow {
    nodes: FlowNode[]
    edges: FlowEdge[]
}

interface OrgSettings {
    tone: 'professional' | 'friendly' | 'direct'
    sms_enabled: boolean
    sms_preview: boolean
    email_preview: boolean
    agentmail_inbox_id: string | null
    sms_sender_name: string | null
    agent_flow: AgentFlow | null
}

interface Claim {
    id: string
    org_id: string
    debtor_name: string
    debtor_email: string
    debtor_phone: string | null
    invoice_number: string
    amount: number
    currency: string
    due_date: string
    current_step: number
    current_node_id: string | null
    status: string
    agentmail_thread_id: string | null
    attachment_url: string | null
}

interface AgentRunResult {
    orgId: string
    claimsProcessed: number
    emailsGenerated: number
    emailsSent: number
    smsSent: number
    errors: string[]
    actions: string[]  // Per-nod logg för testpanelen
}

// ─── Flow Graph Helpers ─────────────────────────────

/**
 * Find the trigger (start) node in the flow
 */
function findTriggerNode(flow: AgentFlow): FlowNode | null {
    return flow.nodes.find(n => n.type === 'trigger') || null
}

/**
 * Get the next node(s) from a given node by following edges
 */
function getNextNodes(flow: AgentFlow, nodeId: string, handleId?: string): FlowNode[] {
    const edges = flow.edges.filter(e =>
        e.source === nodeId && (!handleId || e.sourceHandle === handleId)
    )
    return edges
        .map(e => flow.nodes.find(n => n.id === e.target))
        .filter(Boolean) as FlowNode[]
}

/**
 * Get the first next node from a given node
 */
function getNextNode(flow: AgentFlow, nodeId: string, handleId?: string): FlowNode | null {
    const nodes = getNextNodes(flow, nodeId, handleId)
    return nodes[0] || null
}

/**
 * Check if a debtor has replied to this claim
 */
async function hasDebtorReplied(claimId: string): Promise<boolean> {
    const { count } = await supabaseAdmin
        .from('claim_communications')
        .select('id', { count: 'exact', head: true })
        .eq('claim_id', claimId)
        .eq('direction', 'inbound')
    return (count || 0) > 0
}

// ─── Node Executors ─────────────────────────────────

/**
 * Execute a single node in the flow and return the next node ID
 * Returns null if the flow should stop at this node (delay waiting, end, etc.)
 */
async function executeNode(
    node: FlowNode,
    flow: AgentFlow,
    claim: Claim,
    orgSettings: OrgSettings,
    orgName: string,
    result: AgentRunResult,
): Promise<{ nextNodeId: string | null; stepIncrement: boolean }> {

    switch (node.type) {

        case 'trigger': {
            result.actions.push(`🚀 Trigger: Flödet startade för ${claim.debtor_name}`)
            const next = getNextNode(flow, node.id)
            return { nextNodeId: next?.id || null, stepIncrement: false }
        }

        case 'delay': {
            const days = node.data.days || 7
            const nextAction = new Date()
            nextAction.setDate(nextAction.getDate() + days)

            await supabaseAdmin.from('claims').update({
                current_node_id: node.id,
                next_action_at: nextAction.toISOString(),
                updated_at: new Date().toISOString(),
            }).eq('id', claim.id)

            if (claim.current_node_id === node.id) {
                result.actions.push(`⏭ Delay (${days}d): Återupptas — hoppar till nästa nod`)
                const next = getNextNode(flow, node.id)
                return { nextNodeId: next?.id || null, stepIncrement: false }
            }

            result.actions.push(`⏸ Delay: Väntar ${days} dag(ar) — nästa action: ${nextAction.toLocaleDateString('sv-SE')}`)
            return { nextNodeId: null, stepIncrement: false }
        }

        case 'email': {
            const tone = node.data.tone || orgSettings.tone || 'professional'
            const step = claim.current_step + 1

            // ─── Deduplication guard ─────────────────────────────────────
            // Förhindrar dubbelutskick om agenten körs parallellt/två gånger.
            const { count: existingComm } = await supabaseAdmin
                .from('claim_communications')
                .select('id', { count: 'exact', head: true })
                .eq('claim_id', claim.id)
                .eq('step', step)
                .eq('channel', 'email')

            const { count: existingDraft } = await supabaseAdmin
                .from('email_drafts')
                .select('id', { count: 'exact', head: true })
                .eq('claim_id', claim.id)
                .eq('step', step)

            if ((existingComm || 0) > 0 || (existingDraft || 0) > 0) {
                result.actions.push(`⏭ E-post steg ${step}: Redan skickat/sparat — hoppar vidare`)
                const next = getNextNode(flow, node.id)
                return { nextNodeId: next?.id || null, stepIncrement: true }
            }
            // ─────────────────────────────────────────────────────────────

            // Generate email via Gemini
            const email = await generateCollectionEmail({
                debtorName: claim.debtor_name,
                amount: claim.amount,
                currency: claim.currency,
                invoiceNumber: claim.invoice_number || '',
                dueDate: new Date(claim.due_date).toLocaleDateString('sv-SE'),
                step,
                tone,
            })
            result.emailsGenerated++

            if (orgSettings.email_preview) {
                await supabaseAdmin.from('email_drafts').insert({
                    claim_id: claim.id, org_id: claim.org_id,
                    to: claim.debtor_email, subject: email.subject,
                    body: email.body, tone, step, status: 'pending',
                })
                result.actions.push(`📝 E-post utkast (steg ${step}): "${email.subject}" — sparad för granskning (email_preview=true)`)
            } else {
                const sent = await sendCollectionEmail({
                    inboxId: orgSettings.agentmail_inbox_id!,
                    to: claim.debtor_email, subject: email.subject, body: email.body,
                })
                await supabaseAdmin.from('claim_communications').insert({
                    claim_id: claim.id, org_id: claim.org_id,
                    step, channel: 'email', direction: 'outbound',
                    subject: email.subject, body: email.body,
                    agentmail_message_id: sent.messageId, agentmail_thread_id: sent.threadId,
                })
                result.emailsSent++
                result.actions.push(`📤 E-post skickad (steg ${step}): "${email.subject}" → ${claim.debtor_email}`)
            }

            const next = getNextNode(flow, node.id)
            return { nextNodeId: next?.id || null, stepIncrement: true }
        }


        case 'sms': {
            // If the node is in the flow, the customer wants SMS
            // Only check if debtor has a phone number
            if (claim.debtor_phone) {
                try {
                    const smsFrom = orgSettings.sms_sender_name || orgName
                    const smsMessage = await generateCollectionSms({
                        debtorName: claim.debtor_name,
                        amount: claim.amount,
                        currency: claim.currency,
                        invoiceUrl: claim.attachment_url,
                        step: claim.current_step + 1,
                    })

                    if (orgSettings.sms_preview) {
                        await supabaseAdmin.from('sms_drafts').insert({
                            claim_id: claim.id, org_id: claim.org_id,
                            to: claim.debtor_phone, body: smsMessage,
                            step: claim.current_step + 1, status: 'pending',
                        })
                        result.actions.push(`📝 SMS utkast (steg ${claim.current_step + 1}): Sparat för granskning (sms_preview=true)`)
                    } else {
                        const smsResult = await sendSms({
                            from: smsFrom, to: claim.debtor_phone, message: smsMessage,
                        })
                        await supabaseAdmin.from('claim_communications').insert({
                            claim_id: claim.id, org_id: claim.org_id,
                            step: claim.current_step + 1, channel: 'sms', direction: 'outbound',
                            body: smsMessage, metadata: { elks_id: smsResult.id, cost: smsResult.cost },
                        })
                        result.smsSent++
                        result.actions.push(`📱 SMS skickat (steg ${claim.current_step + 1}) → ${claim.debtor_phone}`)
                    }
                } catch (err: any) {
                    result.errors.push(`SMS ${claim.debtor_name}: ${err.message}`)
                }
            }

            const next = getNextNode(flow, node.id)
            return { nextNodeId: next?.id || null, stepIncrement: true }
        }

        case 'condition': {
            const replied = await hasDebtorReplied(claim.id)
            result.actions.push(`🔀 Villkor: Gäldenär svarat? → ${replied ? 'JA → Avslut' : 'NEJ → SMS-gren'}`)
            const next = getNextNode(flow, node.id, replied ? 'yes' : 'no')
            return { nextNodeId: next?.id || null, stepIncrement: false }
        }

        case 'escalate': {
            await supabaseAdmin.from('claims').update({
                status: 'escalated', current_node_id: node.id,
                updated_at: new Date().toISOString(),
            }).eq('id', claim.id)
            result.actions.push(`🚨 Eskalerad: ${claim.debtor_name} — ärendet överlämnat till manuell hantering`)
            return { nextNodeId: null, stepIncrement: false }
        }

        case 'end': {
            await supabaseAdmin.from('claims').update({
                current_node_id: node.id, next_action_at: null,
                updated_at: new Date().toISOString(),
            }).eq('id', claim.id)
            result.actions.push(`✅ Avslut: Flödet klart för ${claim.debtor_name}`)
            return { nextNodeId: null, stepIncrement: false }
        }

        default:
            return { nextNodeId: null, stepIncrement: false }
    }
}

// ─── Main Engine ────────────────────────────────────

/**
 * Process a single claim through its flow graph
 */
async function processClaimWithFlow(
    claim: Claim,
    flow: AgentFlow,
    orgSettings: OrgSettings,
    orgName: string,
    result: AgentRunResult,
) {
    // Determine starting node
    let currentNodeId = claim.current_node_id
    if (!currentNodeId) {
        // First time — start at trigger
        const trigger = findTriggerNode(flow)
        if (!trigger) {
            result.errors.push(`Claim ${claim.id}: Inget trigger-nod i flödet`)
            return
        }
        currentNodeId = trigger.id
    }

    // Walk the graph — execute nodes until we hit a delay or stop
    let steps = 0
    const maxSteps = 20 // Safety: prevent infinite loops

    while (currentNodeId && steps < maxSteps) {
        const node = flow.nodes.find(n => n.id === currentNodeId)
        if (!node) {
            result.errors.push(`Claim ${claim.id}: Nod ${currentNodeId} hittades inte`)
            break
        }

        const { nextNodeId, stepIncrement } = await executeNode(
            node, flow, claim, orgSettings, orgName, result
        )

        if (stepIncrement) {
            claim.current_step++
        }

        // Update claim position
        await supabaseAdmin.from('claims').update({
            current_node_id: nextNodeId || currentNodeId,
            current_step: claim.current_step,
            last_action_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }).eq('id', claim.id)

        currentNodeId = nextNodeId
        steps++
    }

    result.claimsProcessed++
}

/**
 * Fallback: hardcoded 5-step process for orgs without a custom flow
 */
async function processClaimLegacy(
    claim: Claim,
    orgSettings: OrgSettings,
    orgName: string,
    stepDelays: Record<string, number>,
    result: AgentRunResult,
) {
    const nextStep = claim.current_step + 1

    if (nextStep > 5) {
        await supabaseAdmin.from('claims')
            .update({ status: 'escalated', updated_at: new Date().toISOString() })
            .eq('id', claim.id)
        result.claimsProcessed++
        return
    }

    // Generate + send email
    const email = await generateCollectionEmail({
        debtorName: claim.debtor_name,
        amount: claim.amount,
        currency: claim.currency,
        invoiceNumber: claim.invoice_number || '',
        dueDate: new Date(claim.due_date).toLocaleDateString('sv-SE'),
        step: nextStep,
        tone: orgSettings.tone,
    })
    result.emailsGenerated++

    if (orgSettings.email_preview) {
        await supabaseAdmin.from('email_drafts').insert({
            claim_id: claim.id, org_id: claim.org_id,
            to: claim.debtor_email, subject: email.subject, body: email.body,
            tone: orgSettings.tone, step: nextStep, status: 'pending',
        })
    } else {
        const sent = await sendCollectionEmail({
            inboxId: orgSettings.agentmail_inbox_id!,
            to: claim.debtor_email, subject: email.subject, body: email.body,
        })
        await supabaseAdmin.from('claim_communications').insert({
            claim_id: claim.id, org_id: claim.org_id,
            step: nextStep, channel: 'email', direction: 'outbound',
            subject: email.subject, body: email.body,
            agentmail_message_id: sent.messageId, agentmail_thread_id: sent.threadId,
        })
        result.emailsSent++
    }

    // SMS at step 3+
    if (orgSettings.sms_enabled && claim.debtor_phone && nextStep >= 3) {
        try {
            const smsFrom = orgSettings.sms_sender_name || orgName
            const smsMessage = await generateCollectionSms({
                debtorName: claim.debtor_name, amount: claim.amount,
                currency: claim.currency, invoiceUrl: claim.attachment_url, step: nextStep,
            })
            const smsResult = await sendSms({ from: smsFrom, to: claim.debtor_phone, message: smsMessage })
            await supabaseAdmin.from('claim_communications').insert({
                claim_id: claim.id, org_id: claim.org_id,
                step: nextStep, channel: 'sms', direction: 'outbound',
                body: smsMessage, metadata: { elks_id: smsResult.id, cost: smsResult.cost },
            })
            result.smsSent++
        } catch (err: any) {
            result.errors.push(`SMS ${claim.debtor_name}: ${err.message}`)
        }
    }

    // Advance step
    const delayDays = stepDelays[`step${nextStep}`] ?? 7
    const nextAction = new Date()
    nextAction.setDate(nextAction.getDate() + delayDays)

    await supabaseAdmin.from('claims').update({
        current_step: nextStep,
        last_action_at: new Date().toISOString(),
        next_action_at: nextAction.toISOString(),
        updated_at: new Date().toISOString(),
    }).eq('id', claim.id)

    result.claimsProcessed++
}

// ─── Public API ─────────────────────────────────────

export async function runAgentForOrg(orgId: string): Promise<AgentRunResult> {
    const result: AgentRunResult = {
        orgId, claimsProcessed: 0, emailsGenerated: 0,
        emailsSent: 0, smsSent: 0, errors: [], actions: [],
    }

    const { data: run } = await supabaseAdmin
        .from('agent_runs')
        .insert({ org_id: orgId, status: 'running' })
        .select('id').single()

    try {
        const { data: settings } = await supabaseAdmin
            .from('org_settings').select('*').eq('org_id', orgId).single()

        const { data: org } = await supabaseAdmin
            .from('organizations').select('name').eq('id', orgId).single()

        const orgName = org?.name || 'Superclaim'

        const orgSettings: OrgSettings = {
            tone: settings?.tone ?? 'professional',
            sms_enabled: settings?.sms_enabled ?? false,
            sms_preview: settings?.sms_preview ?? true,
            email_preview: settings?.email_preview ?? true,
            agentmail_inbox_id: settings?.agentmail_inbox_id ?? null,
            sms_sender_name: settings?.sms_sender_name ?? null,
            agent_flow: settings?.agent_flow ?? null,
        }

        const stepDelays = settings?.step_delays ?? { step1: 3, step2: 7, step3: 7, step4: 8 }

        if (!orgSettings.agentmail_inbox_id) {
            result.errors.push('No AgentMail inbox configured')
            await finalizeRun(run?.id, result, 'failed')
            return result
        }

        // Get claims that need action (null next_action_at = new claim, never actioned)
        const now = new Date().toISOString()
        const { data: claims, error: claimsError } = await supabaseAdmin
            .from('claims').select('*')
            .eq('org_id', orgId).eq('status', 'active')
            .or(`next_action_at.is.null,next_action_at.lte.${now}`)
            .order('next_action_at', { ascending: true, nullsFirst: true })

        console.log(`[Agent] Org ${orgId}: found ${claims?.length ?? 0} claims to process`, claimsError ? `Error: ${claimsError.message}` : '')

        if (!claims || claims.length === 0) {
            await finalizeRun(run?.id, result, 'completed')
            return result
        }

        const hasCustomFlow = (orgSettings.agent_flow?.nodes?.length ?? 0) > 0

        for (const claim of claims as Claim[]) {
            try {
                if (hasCustomFlow) {
                    await processClaimWithFlow(claim, orgSettings.agent_flow!, orgSettings, orgName, result)
                } else {
                    await processClaimLegacy(claim, orgSettings, orgName, stepDelays, result)
                }
            } catch (err: any) {
                result.errors.push(`Claim ${claim.id}: ${err.message}`)
            }
        }

        await finalizeRun(run?.id, result, 'completed')
    } catch (err: any) {
        result.errors.push(err.message)
        await finalizeRun(run?.id, result, 'failed')
    }

    return result
}

async function finalizeRun(runId: string | undefined, result: AgentRunResult, status: 'completed' | 'failed') {
    if (!runId) return
    await supabaseAdmin.from('agent_runs').update({
        completed_at: new Date().toISOString(),
        claims_processed: result.claimsProcessed,
        emails_generated: result.emailsGenerated,
        emails_sent: result.emailsSent,
        sms_sent: result.smsSent,
        errors: result.errors,
        status,
    }).eq('id', runId)
}

export async function runAgentForAllOrgs() {
    const { data: orgs } = await supabaseAdmin.from('organizations').select('id')
    if (!orgs || orgs.length === 0) return { message: 'No organizations found', results: [] }

    const results: AgentRunResult[] = []
    for (const org of orgs) {
        const result = await runAgentForOrg(org.id)
        results.push(result)
    }
    return { message: `Processed ${orgs.length} organization(s)`, results }
}
