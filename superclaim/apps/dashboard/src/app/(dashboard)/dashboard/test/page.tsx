'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    FlaskConical, Play, Trash2, RefreshCw,
    CheckCircle2, XCircle, Clock, Loader2,
    Download, ChevronRight, AlertTriangle, Mail, MessageSquare, Zap
} from 'lucide-react'

interface LogEntry {
    ts: string
    type: 'info' | 'success' | 'error' | 'warn'
    text: string
}

interface FortnoxClaim {
    id: string
    debtor_name: string
    debtor_email: string
    amount: number
    currency: string
    invoice_number: string | null
    current_step: number
    current_node_id: string | null
    next_action_at: string | null
    status: string
}

export default function TestPage() {
    const [log, setLog] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState<string | null>(null)
    const [fortnoxClaims, setFortnoxClaims] = useState<FortnoxClaim[]>([])
    const [step, setStep] = useState<1 | 2 | 3>(1)

    const addLog = (type: LogEntry['type'], text: string) => {
        setLog(prev => [{ ts: new Date().toLocaleTimeString('sv-SE'), type, text }, ...prev])
    }

    const clearLog = () => setLog([])

    // ─── Steg 1: Importera från Fortnox ─────────────────────────────
    const handleImport = async () => {
        setLoading('import')
        clearLog()
        setStep(1)
        addLog('info', '📥 Importerar förfallna fakturor från Fortnox...')

        try {
            const res = await fetch('/api/fortnox/import', { method: 'POST' })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Import misslyckades')

            addLog('success', `✅ Import klar — ${data.imported} nya, ${data.skipped} redan importerade`)

            if (data.errors?.length) {
                data.errors.forEach((e: string) => addLog('error', `⚠️ ${e}`))
            }

            if (data.imported === 0 && data.skipped === 0) {
                addLog('warn', '⚠️ Inga förfallna fakturor hittades i Fortnox just nu')
            }

            await loadFortnoxClaims()
            setStep(2)
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    // ─── Ladda Fortnox-ärenden ───────────────────────────────────────
    const loadFortnoxClaims = useCallback(async () => {
        try {
            const res = await fetch('/api/claims')
            const data = await res.json()
            const fortnox = (data.claims || []).filter((c: any) => c.source === 'fortnox')
            setFortnoxClaims(fortnox.slice(0, 5))
        } catch { /* ignore */ }
    }, [])

    // ─── Steg 2: Kör agent ──────────────────────────────────────────
    const handleRunAgent = async () => {
        setLoading('run')
        setStep(2)
        addLog('info', '🤖 Kör agent — processar alla aktiva Fortnox-ärenden...')

        try {
            const res = await fetch('/api/agent/run', { method: 'POST' })
            const data = await res.json()

            if (!res.ok || !data.success) throw new Error(data.message || data.error || 'Agent misslyckades')

            const totals = (data.results || []).reduce((acc: any, r: any) => ({
                claimsProcessed: acc.claimsProcessed + r.claimsProcessed,
                emailsGenerated: acc.emailsGenerated + r.emailsGenerated,
                emailsSent: acc.emailsSent + r.emailsSent,
                smsSent: acc.smsSent + r.smsSent,
                errors: [...acc.errors, ...r.errors],
                actions: [...acc.actions, ...(r.actions || [])],
            }), { claimsProcessed: 0, emailsGenerated: 0, emailsSent: 0, smsSent: 0, errors: [], actions: [] })

            totals.actions.forEach((a: string) => addLog('info', `  ${a}`))

            if (totals.claimsProcessed > 0) {
                addLog('success', `✅ ${totals.claimsProcessed} ärende(n) processade`)
            }
            if (totals.emailsGenerated && !totals.emailsSent) {
                addLog('warn', `📝 ${totals.emailsGenerated} mejl sparat som utkast (email_preview=true)`)
            }
            if (totals.emailsSent) {
                addLog('success', `📤 ${totals.emailsSent} mejl skickat direkt`)
            }
            if (totals.smsSent) {
                addLog('success', `📱 ${totals.smsSent} SMS skickat`)
            }
            if (totals.errors.length) {
                totals.errors.forEach((e: string) => addLog('error', `❌ ${e}`))
            }
            if (totals.claimsProcessed === 0 && !totals.errors.length) {
                addLog('warn', '⚠️ Inga ärenden redo — de kan vänta på delay, eller vara betalda/eskalerade')
            }

            await loadFortnoxClaims()
            setStep(3)
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    // ─── Hoppa delay per ärende ──────────────────────────────
    const handleSkipDelay = async (claimId: string, debtorName: string) => {
        setLoading(`skip-${claimId}`)
        addLog('warn', `⏩ Hoppar delay för ${debtorName}...`)
        try {
            const res = await fetch(`/api/claims/${claimId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'skip_delay' }),
            })
            if (!res.ok) throw new Error('Kunde inte hoppa delay')
            addLog('success', `✅ Delay hoppat för ${debtorName} — kör agent för att fortsätta`)
            await loadFortnoxClaims()
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    // ─── Rensa testdata ──────────────────────────────────────────────
    const handleDelete = async () => {
        setLoading('delete')
        addLog('warn', '🗑️ Raderar alla Fortnox-testärenden...')
        try {
            let count = 0
            for (const claim of fortnoxClaims) {
                await fetch(`/api/claims/${claim.id}`, { method: 'DELETE' })
                count++
            }
            addLog('success', `✅ ${count} ärenden raderade`)
            setFortnoxClaims([])
            setStep(1)
        } catch (e: any) {
            addLog('error', `❌ ${e.message}`)
        } finally {
            setLoading(null)
        }
    }

    const logColor = (t: string) => {
        if (t === 'success') return 'text-green-400'
        if (t === 'error') return 'text-red-400'
        if (t === 'warn') return 'text-yellow-400'
        return 'text-white/60'
    }

    const statusColor = (s: string) => {
        if (s === 'active') return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        if (s === 'paid') return 'text-green-400 bg-green-500/10 border-green-500/20'
        if (s === 'escalated') return 'text-red-400 bg-red-500/10 border-red-500/20'
        return 'text-white/40 bg-white/5 border-white/10'
    }

    const steps = [
        { n: 1, label: 'Importera', icon: Download, active: step >= 1 },
        { n: 2, label: 'Kör agent', icon: Play, active: step >= 2 },
        { n: 3, label: 'Granska resultat', icon: CheckCircle2, active: step >= 3 },
    ]

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                    <FlaskConical className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold">Test Panel</h1>
                    <p className="text-sm text-muted-foreground">End-to-end test av Fortnox-flödet</p>
                </div>
                <Badge variant="outline" className="ml-auto text-yellow-400 border-yellow-400/30 bg-yellow-400/10">
                    Dev / Test Only
                </Badge>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 text-xs text-yellow-400/80 bg-yellow-400/5 border border-yellow-400/20 rounded-lg p-3">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Agenten skickar <strong>riktiga mejl</strong> via AgentMail om <code>email_preview = false</code>. Kontrollera din inställning.</span>
            </div>

            {/* Steg-indikator */}
            <div className="flex items-center gap-2">
                {steps.map((s, i) => (
                    <div key={s.n} className="flex items-center gap-2">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${step === s.n ? 'bg-primary/15 border-primary/30 text-primary' :
                            step > s.n ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                'bg-white/[0.03] border-white/[0.06] text-muted-foreground/40'
                            }`}>
                            {step > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                            Steg {s.n}: {s.label}
                        </div>
                        {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-white/20" />}
                    </div>
                ))}
            </div>

            {/* Åtgärdsknappar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                    onClick={handleImport}
                    disabled={!!loading}
                    className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span className="text-xs">1. Importera Fortnox</span>
                </Button>

                <Button
                    onClick={handleRunAgent}
                    disabled={!!loading}
                    className="bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'run' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    <span className="text-xs">2. Kör agent</span>
                </Button>

                <Button
                    onClick={loadFortnoxClaims}
                    disabled={!!loading}
                    className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span className="text-xs">Uppdatera lista</span>
                </Button>

                <Button
                    onClick={handleDelete}
                    disabled={!!loading || fortnoxClaims.length === 0}
                    className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 h-auto py-3 flex-col gap-1"
                    variant="ghost"
                >
                    {loading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    <span className="text-xs">Rensa testdata</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Fortnox-ärenden */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Fortnox-ärenden ({fortnoxClaims.length})</h2>
                        {fortnoxClaims.length === 0 && (
                            <span className="text-xs text-muted-foreground">Klicka "Importera" för att hämta</span>
                        )}
                    </div>

                    {fortnoxClaims.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/30 text-sm">Inga Fortnox-ärenden laddade</div>
                    ) : (
                        <div className="space-y-2">
                            {fortnoxClaims.map(c => (
                                <div key={c.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium truncate">{c.debtor_name}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor(c.status)}`}>{c.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                        <span>Faktura #{c.invoice_number || '—'}</span>
                                        <span className="font-mono">{c.amount?.toLocaleString('sv-SE')} {c.currency}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60">
                                        <span>Steg {c.current_step}</span>
                                        <span>Nod: <code className="text-primary/60">{c.current_node_id || 'ej startat'}</code></span>
                                    </div>
                                    {c.next_action_at && (
                                        <div className={`text-[10px] ${new Date(c.next_action_at) <= new Date() ? 'text-green-400' : 'text-yellow-400/70'}`}>
                                            {new Date(c.next_action_at) <= new Date()
                                                ? '✅ Redo att processas'
                                                : `⏸ Väntar till ${new Date(c.next_action_at).toLocaleString('sv-SE')}`}
                                        </div>
                                    )}
                                    {/* Hoppa delay-knapp — bara synlig när ärendet väntar */}
                                    {c.next_action_at && new Date(c.next_action_at) > new Date() && (
                                        <button
                                            onClick={() => handleSkipDelay(c.id, c.debtor_name)}
                                            disabled={!!loading}
                                            className="mt-1 w-full text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded px-2 py-1 hover:bg-yellow-400/20 transition-colors disabled:opacity-40"
                                        >
                                            {loading === `skip-${c.id}` ? '⏳ Hoppar...' : '⏩ Hoppa delay'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Live-logg */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium">Live-logg</h2>
                        {log.length > 0 && (
                            <button onClick={clearLog} className="text-xs text-muted-foreground hover:text-foreground">Rensa</button>
                        )}
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto font-mono text-[11px]">
                        {log.length === 0 ? (
                            <div className="text-muted-foreground/30 text-center py-8">Väntar på aktivitet...</div>
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

            {/* Testguide */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.01] p-4">
                <h2 className="text-sm font-medium mb-3">Testguide — Fortnox E2E</h2>
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {[
                        '1. Importera Fortnox',
                        '2. Se ärenden i listan',
                        '3. Kör agent',
                        'Granska logg + E-post/SMS',
                        'Betala faktura i Fortnox',
                        'Kör betalningssynk',
                        'Ärende → Betald ✓',
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
