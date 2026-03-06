'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FlaskConical, Play, FastForward, Trash2, RefreshCw,
    CheckCircle2, XCircle, Clock, Mail, MessageSquare,
    ChevronRight, AlertTriangle, Loader2
} from 'lucide-react'

interface Claim {
    id: string
    debtor_name: string
    debtor_email: string
    amount: number
    currency: string
    due_date: string
    status: string
    current_step: number
    current_node_id: string | null
    next_action_at: string | null
    last_action_at: string | null
}

interface Communication {
    id: string
    channel: 'email' | 'sms'
    direction: 'inbound' | 'outbound'
    step: number
    subject?: string
    body: string
    created_at: string
}

interface Draft {
    id: string
    subject: string
    body: string
    step: number
    status: string
    created_at: string
}

interface OrgAgentResult {
    orgId: string
    claimsProcessed: number
    emailsGenerated: number
    emailsSent: number
    smsSent: number
    errors: string[]
    actions: string[]
}

interface AgentRunResponse {
    success: boolean
    message?: string
    results?: OrgAgentResult[]
}

export default function AdminTestPage() {
    const [claim, setClaim] = useState<Claim | null>(null)
    const [comms, setComms] = useState<Communication[]>([])
    const [drafts, setDrafts] = useState<Draft[]>([])
    const [smsDrafts, setSmsDrafts] = useState<{ id: string; body: string; step: number; status: string; created_at: string }[]>([])
    const [log, setLog] = useState<{ ts: string; type: 'info' | 'success' | 'error' | 'warn'; text: string }[]>([])
    const [loading, setLoading] = useState<string | null>(null)

    const addLog = (type: 'info' | 'success' | 'error' | 'warn', text: string) => {
        setLog(prev => [{ ts: new Date().toLocaleTimeString('sv-SE'), type, text }, ...prev])
    }

    const refreshClaim = useCallback(async (id: string) => {
        const res = await fetch(`/api/test/claim?id=${id}`)
        const data = await res.json()
        if (data.claim) setClaim(data.claim)
        if (data.communications) setComms(data.communications)
        if (data.drafts) setDrafts(data.drafts)
        if (data.smsDrafts) setSmsDrafts(data.smsDrafts)
    }, [])

    const createClaim = async () => {
        setLoading('create')
        addLog('info', 'Skapar testärende...')
        try {
            const res = await fetch('/api/test/claim', { method: 'POST' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setClaim(data.claim)
            setComms([])
            setDrafts([])
            addLog('success', `✅ Testärende skapat: ${data.claim.id.slice(0, 8)}... (förfallet 7 dagar sedan, redo att processas)`)
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    const runAgent = async () => {
        setLoading('run')
        addLog('info', '🤖 Startar agent — söker efter ärenden att processera...')
        try {
            const res = await fetch('/api/agent/run', { method: 'POST' })
            const data: AgentRunResponse = await res.json()
            if (!res.ok || !data.success) throw new Error(data.message || 'Agent misslyckades')

            const totals = (data.results || []).reduce((acc, r) => ({
                claimsProcessed: acc.claimsProcessed + r.claimsProcessed,
                emailsGenerated: acc.emailsGenerated + r.emailsGenerated,
                emailsSent: acc.emailsSent + r.emailsSent,
                smsSent: acc.smsSent + r.smsSent,
                errors: [...acc.errors, ...r.errors],
                actions: [...acc.actions, ...(r.actions || [])],
            }), { claimsProcessed: 0, emailsGenerated: 0, emailsSent: 0, smsSent: 0, errors: [] as string[], actions: [] as string[] })

            // Visa per-nod actions först
            totals.actions.forEach(a => addLog('info', `  ${a}`))

            // Summering
            if (totals.claimsProcessed > 0) {
                addLog('success', `✅ Körning klar — ${totals.claimsProcessed} ärende processades genom flödet`)
            }
            if (totals.emailsGenerated && !totals.emailsSent) addLog('warn', `📝 ${totals.emailsGenerated} e-post sparad som utkast (email_preview=true) — granska under E-post/SMS`)
            if (totals.emailsSent) addLog('success', `📤 ${totals.emailsSent} e-post skickad direkt via AgentMail`)
            if (totals.smsSent) addLog('success', `📱 ${totals.smsSent} SMS skickat via 46elks`)
            if (totals.errors.length) totals.errors.forEach(e => addLog('error', `❌ Fel: ${e}`))
            if (totals.claimsProcessed === 0 && totals.errors.length === 0) {
                addLog('warn', '⚠️ Inga ärenden hittades — ärendet är troligen eskalerat eller avslutat (status ≠ active). Skapa ett nytt testärende!')
            }

            if (claim) await refreshClaim(claim.id)
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    const fastForward = async () => {
        if (!claim) return
        setLoading('ff')
        addLog('warn', '⏩ Hoppar delay — sätter next_action_at = nu...')
        try {
            const res = await fetch(`/api/test/claim?id=${claim.id}`, { method: 'PATCH' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            setClaim(data.claim)
            addLog('success', '✅ Delay överhoppad — kör agent igen för att fortsätta flödet')
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    const deleteClaim = async () => {
        if (!claim) return
        setLoading('delete')
        addLog('info', '🗑️ Raderar testärende...')
        try {
            const res = await fetch(`/api/test/claim?id=${claim.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Kunde inte radera')
            setClaim(null)
            setComms([])
            setDrafts([])
            addLog('success', '✅ Testärende raderat')
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    const statusColor = (s: string) => {
        if (s === 'active') return 'bg-blue-500/15 text-blue-400 border-blue-500/30'
        if (s === 'escalated') return 'bg-red-500/15 text-red-400 border-red-500/30'
        if (s === 'paid') return 'bg-green-500/15 text-green-400 border-green-500/30'
        return 'bg-white/10 text-white/60'
    }

    const logColor = (t: string) => {
        if (t === 'success') return 'text-green-400'
        if (t === 'error') return 'text-red-400'
        if (t === 'warn') return 'text-yellow-400'
        return 'text-white/60'
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">Admin Test Panel</h1>
                    <p className="text-sm text-muted-foreground">Testa agentflödet end-to-end utan att vänta på cron</p>
                </div>
                <Badge variant="outline" className="ml-auto text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                    Dev / Test Only
                </Badge>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 text-xs text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Testärenden skickar <strong>riktiga mail</strong> via AgentMail om <code>email_preview = false</code>. Kontrollera din org-inställning. Testärenden skapas med e-post <code>test@example.com</code>.</span>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Button
                    onClick={createClaim}
                    disabled={!!loading || !!claim}
                    className="bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
                    <span className="text-xs">Skapa testärende</span>
                </Button>

                <Button
                    onClick={runAgent}
                    disabled={!!loading}
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    <span className="text-xs">Kör agent</span>
                </Button>

                <Button
                    onClick={fastForward}
                    disabled={!claim || !!loading}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'ff' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FastForward className="h-4 w-4" />}
                    <span className="text-xs">Hoppa delay</span>
                </Button>

                <Button
                    onClick={deleteClaim}
                    disabled={!claim || !!loading}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="text-xs">Radera ärende</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Claim State */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Ärendets tillstånd</h2>
                        {claim && (
                            <button onClick={() => refreshClaim(claim.id)} className="text-muted-foreground hover:text-foreground">
                                <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {!claim ? (
                        <div className="text-center py-8 text-muted-foreground/40 text-sm">
                            Inget aktiv testärende — klicka "Skapa testärende"
                        </div>
                    ) : (
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">ID</span>
                                <code className="text-foreground/80">{claim.id.slice(0, 16)}...</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] border ${statusColor(claim.status)}`}>{claim.status}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Steg</span>
                                <span className="font-mono">{claim.current_step}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Aktuell nod</span>
                                <code className="text-primary/70">{claim.current_node_id || '—'}</code>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Nästa action</span>
                                <span className={claim.next_action_at && new Date(claim.next_action_at) <= new Date() ? 'text-green-400' : 'text-yellow-400'}>
                                    {claim.next_action_at
                                        ? new Date(claim.next_action_at) <= new Date()
                                            ? '✅ Redo nu'
                                            : new Date(claim.next_action_at).toLocaleString('sv-SE')
                                        : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Senaste action</span>
                                <span>{claim.last_action_at ? new Date(claim.last_action_at).toLocaleString('sv-SE') : '—'}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Activity Log */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
                    <h2 className="text-sm font-medium">Live-logg</h2>
                    <div className="space-y-1 max-h-48 overflow-y-auto font-mono text-[11px]">
                        {log.length === 0 ? (
                            <div className="text-muted-foreground/40 text-center py-4">Väntar på aktivitet...</div>
                        ) : (
                            log.map((l, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-muted-foreground/40 shrink-0">{l.ts}</span>
                                    <span className={logColor(l.type)}>{l.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Communications */}
            {(comms.length > 0 || drafts.length > 0 || smsDrafts.length > 0) && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                    <h2 className="text-sm font-medium">
                        Kommunikation ({comms.length + drafts.length + smsDrafts.length} händelser)
                    </h2>
                    <div className="space-y-2">
                        {comms.map(c => (
                            <div key={c.id} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                                {c.channel === 'email' ? <Mail className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" /> : <MessageSquare className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-medium">Steg {c.step}</span>
                                        <span className="text-[10px] text-muted-foreground">{c.channel} · {c.direction === 'outbound' ? 'utskickat' : 'inkommande'}</span>
                                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(c.created_at).toLocaleString('sv-SE')}</span>
                                    </div>
                                    {c.subject && <p className="text-xs text-foreground/70 mt-0.5 truncate">{c.subject}</p>}
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{c.body}</p>
                                </div>
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                            </div>
                        ))}
                        {drafts.map(d => (
                            <div key={d.id} className="flex items-start gap-3 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                <Clock className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">E-post utkast steg {d.step}</span>
                                        <span className="text-[10px] text-yellow-400/70">(email_preview = true)</span>
                                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(d.created_at).toLocaleString('sv-SE')}</span>
                                    </div>
                                    <p className="text-xs text-foreground/70 mt-0.5 truncate">{d.subject}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{d.body}</p>
                                </div>
                            </div>
                        ))}
                        {smsDrafts.map(s => (
                            <div key={s.id} className="flex items-start gap-3 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                <MessageSquare className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium">SMS utkast steg {s.step}</span>
                                        <span className="text-[10px] text-blue-400/70">(sms_preview = true)</span>
                                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(s.created_at).toLocaleString('sv-SE')}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-3">{s.body}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Workflow guide */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
                <h2 className="text-sm font-medium mb-3">Testguide</h2>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {[
                        'Skapa testärende',
                        'Kör agent → Steg 1 (mail)',
                        'Hoppa delay',
                        'Kör agent → Steg 2 (mail)',
                        'Hoppa delay',
                        'Kör agent → Villkor',
                        '...',
                        'Eskalering',
                    ].map((s, i, arr) => (
                        <div key={i} className="flex items-center gap-1">
                            <span className="bg-white/[0.05] px-2 py-0.5 rounded">{s}</span>
                            {i < arr.length - 1 && <ChevronRight className="h-3 w-3 text-white/20" />}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
