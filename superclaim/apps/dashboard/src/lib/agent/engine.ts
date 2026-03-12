import { supabaseAdmin } from '@/lib/supabase-admin'
import { generateCollectionEmail, generateCollectionSms, generatePreReminderEmail, generatePreReminderSms } from './gemini'
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
    sms_preview: boolean
    email_preview: boolean
    agentmail_inbox_id: string | null
    sms_sender_name: string | null
    agent_flow: AgentFlow | null
    pre_reminder_enabled?: boolean
    pre_reminder_days?: number
    pre_reminder_channels?: 'email' | 'sms' | 'both'
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
            const tone = node.data.tone || 'professional'
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
                // Skapa notis
                await supabaseAdmin.from('notifications').insert({
                    org_id: claim.org_id,
                    type: 'draft',
                    text: `E-post utkast för ${claim.debtor_name} (steg ${step}) väntar på godkännande`,
                    href: `/dashboard/claims/${claim.id}`,
                })
                result.actions.push(`E-post utkast (steg ${step}): "${email.subject}" — sparad för granskning (email_preview=true)`)
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
                // Spara thread_id på claim så webhook kan matcha inkommande svar
                if (sent.threadId && !claim.agentmail_thread_id) {
                    await supabaseAdmin.from('claims').update({
                        agentmail_thread_id: sent.threadId,
                    }).eq('id', claim.id)
                    claim.agentmail_thread_id = sent.threadId
                }
                result.emailsSent++
                result.actions.push(`📤 E-post skickad (steg ${step}): "${email.subject}" → ${claim.debtor_email}`)
            }

            const next = getNextNode(flow, node.id)
            return { nextNodeId: next?.id || null, stepIncrement: true }
        }


        case 'sms': {
            const smsStep = claim.current_step + 1

            // ─── Deduplication guard ─────────────────────────────────────
            const { count: existingSmsComm } = await supabaseAdmin
                .from('claim_communications')
                .select('id', { count: 'exact', head: true })
                .eq('claim_id', claim.id)
                .eq('step', smsStep)
                .eq('channel', 'sms')

            const { count: existingSmsDraft } = await supabaseAdmin
                .from('sms_drafts')
                .select('id', { count: 'exact', head: true })
                .eq('claim_id', claim.id)
                .eq('step', smsStep)

            if ((existingSmsComm || 0) > 0 || (existingSmsDraft || 0) > 0) {
                result.actions.push(`⏭ SMS steg ${smsStep}: Redan skickat/sparat — hoppar vidare`)
                const next = getNextNode(flow, node.id)
                return { nextNodeId: next?.id || null, stepIncrement: true }
            }
            // ─────────────────────────────────────────────────────────────

            if (claim.debtor_phone) {
                try {
                    const smsFrom = orgSettings.sms_sender_name || orgName
                    const smsMessage = await generateCollectionSms({
                        debtorName: claim.debtor_name,
                        amount: claim.amount,
                        currency: claim.currency,
                        invoiceUrl: claim.attachment_url,
                        step: smsStep,
                    })

                    if (orgSettings.sms_preview) {
                        await supabaseAdmin.from('sms_drafts').insert({
                            claim_id: claim.id, org_id: claim.org_id,
                            to: claim.debtor_phone, body: smsMessage,
                            step: smsStep, status: 'pending',
                        })
                        // Skapa notis
                        await supabaseAdmin.from('notifications').insert({
                            org_id: claim.org_id,
                            type: 'draft',
                            text: `SMS utkast för ${claim.debtor_name} (steg ${smsStep}) väntar på godkännande`,
                            href: `/dashboard/claims/${claim.id}`,
                        })
                        result.actions.push(`SMS utkast (steg ${smsStep}): Sparat för granskning (sms_preview=true)`)
                    } else {
                        const smsResult = await sendSms({
                            from: smsFrom, to: claim.debtor_phone, message: smsMessage,
                        })
                        const { error: smsInsertErr } = await supabaseAdmin.from('claim_communications').insert({
                            claim_id: claim.id, org_id: claim.org_id,
                            step: smsStep, channel: 'sms', direction: 'outbound',
                            body: smsMessage, metadata: { elks_id: smsResult.id, cost: smsResult.cost },
                        })
                        if (smsInsertErr) {
                            console.error(`[ENGINE] SMS loggning misslyckades för ${claim.debtor_name}:`, smsInsertErr.message)
                            result.errors.push(`SMS logg: ${smsInsertErr.message}`)
                        }
                        result.smsSent++
                        result.actions.push(`📱 SMS skickat (steg ${smsStep}) → ${claim.debtor_phone}`)
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
        tone: 'professional',
    })
    result.emailsGenerated++

    if (orgSettings.email_preview) {
        await supabaseAdmin.from('email_drafts').insert({
            claim_id: claim.id, org_id: claim.org_id,
            to: claim.debtor_email, subject: email.subject, body: email.body,
            step: nextStep, status: 'pending',
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
        // Spara thread_id på claim så webhook kan matcha inkommande svar
        if (sent.threadId && !claim.agentmail_thread_id) {
            await supabaseAdmin.from('claims').update({
                agentmail_thread_id: sent.threadId,
            }).eq('id', claim.id)
            claim.agentmail_thread_id = sent.threadId
        }
        result.emailsSent++
    }

    // SMS at step 3+
    if (claim.debtor_phone && nextStep >= 3) {
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

// ─── PRE-DUE REMINDER PROCESSING ─────────────────────────

async function processPreDueReminder(
    claim: Claim,
    orgSettings: OrgSettings,
    orgName: string,
    dueDate: Date,
    result: AgentRunResult,
) {
    const now = new Date()
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const channels = orgSettings.pre_reminder_channels || 'email'

    console.log(`[Agent] Pre-due reminder for ${claim.debtor_name} — ${daysUntilDue} days until due`)
    console.log(`[Agent] Pre-due config: channels=${channels}, debtor_email=${claim.debtor_email || 'NULL'}, debtor_phone=${claim.debtor_phone || 'NULL'}, email_preview=${orgSettings.email_preview}`)

    let reminderSent = false

    // ── Email reminder ──
    if ((channels === 'email' || channels === 'both') && claim.debtor_email) {
        try {
            const email = await generatePreReminderEmail({
                creditorName: orgName,
                debtorName: claim.debtor_name,
                amount: claim.amount,
                currency: claim.currency,
                invoiceNumber: claim.invoice_number,
                dueDate: claim.due_date,
                daysUntilDue,
            })
            result.emailsGenerated++

            if (orgSettings.email_preview) {
                // Save as draft for approval
                await supabaseAdmin.from('email_drafts').insert({
                    org_id: claim.org_id,
                    claim_id: claim.id,
                    to: claim.debtor_email,
                    subject: email.subject,
                    body: email.body,
                    step: 0,
                    status: 'pending',
                })

                await supabaseAdmin.from('notifications').insert({
                    org_id: claim.org_id,
                    type: 'draft',
                    text: `Förvarning till ${claim.debtor_name} väntar på godkännande`,
                    href: `/dashboard/drafts`,
                })

                result.actions.push(`${claim.debtor_name}: Förvarnings-e-post skapad som utkast (förfaller om ${daysUntilDue}d)`)
                reminderSent = true
            } else {
                // Send directly — same pattern as the working collection flow
                if (orgSettings.agentmail_inbox_id) {
                    const sent = await sendCollectionEmail({
                        inboxId: orgSettings.agentmail_inbox_id,
                        to: claim.debtor_email,
                        subject: email.subject,
                        body: email.body,
                    })
                    await supabaseAdmin.from('claim_communications').insert({
                        claim_id: claim.id, org_id: claim.org_id,
                        step: 0, channel: 'email', direction: 'outbound',
                        subject: email.subject, body: email.body,
                        agentmail_message_id: sent.messageId, agentmail_thread_id: sent.threadId,
                    })
                    if (sent.threadId && !claim.agentmail_thread_id) {
                        await supabaseAdmin.from('claims').update({
                            agentmail_thread_id: sent.threadId,
                        }).eq('id', claim.id)
                        claim.agentmail_thread_id = sent.threadId
                    }
                    result.emailsSent++
                    result.actions.push(`Pre-due e-post skickad: "${email.subject}" → ${claim.debtor_email}`)
                    reminderSent = true
                }
            }
        } catch (err: any) {
            result.errors.push(`Pre-reminder email ${claim.id}: ${err.message}`)
        }
    }

    // ── SMS reminder ──
    if ((channels === 'sms' || channels === 'both') && claim.debtor_phone) {
        try {
            const smsBody = await generatePreReminderSms({
                debtorName: claim.debtor_name,
                amount: claim.amount,
                currency: claim.currency,
                dueDate: claim.due_date,
                daysUntilDue,
            })

            if (orgSettings.sms_preview) {
                await supabaseAdmin.from('sms_drafts').insert({
                    org_id: claim.org_id,
                    claim_id: claim.id,
                    to: claim.debtor_phone,
                    body: smsBody,
                    step: 0,
                    status: 'pending',
                })
                result.actions.push(`${claim.debtor_name}: Förvarnings-SMS skapad som utkast`)
                reminderSent = true
            } else {
                const smsResult = await sendSms({
                    from: orgSettings.sms_sender_name || 'Superclaim',
                    to: claim.debtor_phone,
                    message: smsBody,
                })
                const { error: smsInsertErr } = await supabaseAdmin.from('claim_communications').insert({
                    claim_id: claim.id, org_id: claim.org_id,
                    step: 0, channel: 'sms', direction: 'outbound',
                    body: smsBody, metadata: { elks_id: smsResult.id, cost: smsResult.cost },
                })
                if (smsInsertErr) {
                    console.error(`[ENGINE] Pre-due SMS loggning misslyckades för ${claim.debtor_name}:`, smsInsertErr.message)
                    result.errors.push(`SMS logg: ${smsInsertErr.message}`)
                }
                result.smsSent++
                result.actions.push(`Pre-due SMS skickat → ${claim.debtor_phone}`)
                reminderSent = true
            }
        } catch (err: any) {
            result.errors.push(`Pre-reminder SMS ${claim.id}: ${err.message}`)
        }
    }

    // Only update stage if something was actually sent
    if (reminderSent) {
        const nextCollection = new Date(dueDate.getTime() + 24 * 60 * 60 * 1000)
        await supabaseAdmin.from('claims').update({
            stage: 'pre_due_sent',
            current_step: 0,
            next_action_at: nextCollection.toISOString(),
            updated_at: now.toISOString(),
        }).eq('id', claim.id)
    } else {
        console.log(`[Agent] Pre-due: No reminder sent for ${claim.debtor_name} — no valid channel/contact info`)
    }

    result.claimsProcessed++
}

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
            sms_preview: settings?.sms_preview ?? true,
            email_preview: settings?.email_preview ?? true,
            agentmail_inbox_id: settings?.agentmail_inbox_id ?? null,
            sms_sender_name: settings?.sms_sender_name ?? null,
            agent_flow: settings?.agent_flow ?? null,
            pre_reminder_enabled: settings?.pre_reminder_enabled ?? false,
            pre_reminder_days: settings?.pre_reminder_days ?? 5,
            pre_reminder_channels: settings?.pre_reminder_channels ?? 'email',
        }

        const stepDelays = settings?.step_delays ?? { step1: 3, step2: 7, step3: 7, step4: 8 }

        if (!orgSettings.agentmail_inbox_id) {
            result.errors.push('No AgentMail inbox configured')
            await finalizeRun(run?.id, result, 'failed')
            return result
        }

        // Get claims that need action (not paused, null next_action_at = new claim)
        const now = new Date().toISOString()
        const { data: claims, error: claimsError } = await supabaseAdmin
            .from('claims').select('*')
            .eq('org_id', orgId).eq('status', 'active')
            .or('paused.is.null,paused.eq.false')
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
                // ─── PRE-DUE REMINDER INTERCEPTION ──────────────────
                // If claim is pre_due and due date hasn't passed, send friendly reminder
                const claimStage = (claim as any).stage
                const dueDate = claim.due_date ? new Date(claim.due_date) : null
                const nowDate = new Date()

                if (claimStage === 'pre_due' && dueDate && dueDate > nowDate) {
                    await processPreDueReminder(claim, orgSettings, orgName, dueDate, result)
                    continue // Skip normal collection flow
                }

                // If claim was pre_due or pre_due_sent but due date has passed, transition to collection
                if ((claimStage === 'pre_due' || claimStage === 'pre_due_sent') && dueDate && dueDate <= nowDate) {
                    await supabaseAdmin.from('claims').update({
                        stage: null,
                        current_step: 0,
                        next_action_at: nowDate.toISOString(),
                    }).eq('id', claim.id)
                    result.actions.push(`${claim.debtor_name}: Förfallodatum passerat — övergår till normal kravprocess`)
                    // Continue to normal flow below
                }

                // Skip pre_due_sent claims where due date hasn't passed yet
                if (claimStage === 'pre_due_sent' && dueDate && dueDate > nowDate) {
                    continue // Reminder already sent, waiting for due date
                }

                // Prioritera ärendets egna snapshot-flow (om det finns),
                // annars fall tillbaka till org:ens globala flow.
                const claimFlow = (claim as any).agent_flow ?? orgSettings.agent_flow
                const useCustomFlow = (claimFlow?.nodes?.length ?? 0) > 0

                if (useCustomFlow) {
                    await processClaimWithFlow(claim, claimFlow, orgSettings, orgName, result)
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
