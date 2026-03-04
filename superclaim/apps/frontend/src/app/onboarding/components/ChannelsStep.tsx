'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Check, ArrowRight, RefreshCw, Mail, Sparkles, AtSign, User, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const erpSystems = [
    { id: 'fortnox', name: 'Fortnox', color: '#00A76F' },
    { id: 'visma', name: 'Visma', color: '#E52838' },
    { id: 'niora', name: 'Niora', color: '#7C3AED' },
]

const mockInvoices = [
    { id: 'F-2024-0847', debtor: 'Karlsson Bygg AB', amount: 12500, dueDate: '2024-12-15', daysOverdue: 47 },
    { id: 'F-2024-0912', debtor: 'Lindström Fastigheter', amount: 28900, dueDate: '2025-01-10', daysOverdue: 22 },
    { id: 'F-2024-0956', debtor: 'Nordisk El & VVS', amount: 8750, dueDate: '2025-01-18', daysOverdue: 14 },
    { id: 'F-2025-0021', debtor: 'Grip Konsult AB', amount: 45000, dueDate: '2025-01-25', daysOverdue: 7 },
    { id: 'F-2025-0034', debtor: 'Svensson & Co HB', amount: 6200, dueDate: '2025-01-28', daysOverdue: 4 },
]

function toUsername(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 30)
}

interface ChannelsStepProps {
    companyName: string
    preferredErp: string | null
    setPreferredErp: (v: string | null) => void
    selectedInvoices: string[]
    setSelectedInvoices: (v: string[]) => void
    autoSync: boolean
    setAutoSync: (v: boolean) => void
    inboxUsername: string
    setInboxUsername: (v: string) => void
    inboxDisplayName: string
    setInboxDisplayName: (v: string) => void
    onNext: () => void
    loading: boolean
}

export function ChannelsStep({
    companyName,
    preferredErp, setPreferredErp,
    selectedInvoices, setSelectedInvoices,
    autoSync, setAutoSync,
    inboxUsername, setInboxUsername,
    inboxDisplayName, setInboxDisplayName,
    onNext, loading,
}: ChannelsStepProps) {
    const [connected, setConnected] = useState(false)
    const [connecting, setConnecting] = useState(false)
    const [usernameError, setUsernameError] = useState('')
    const [previewPulse, setPreviewPulse] = useState(false)

    // Pulse preview when username changes
    useEffect(() => {
        setPreviewPulse(true)
        const t = setTimeout(() => setPreviewPulse(false), 600)
        return () => clearTimeout(t)
    }, [inboxUsername])

    const handleUsernameChange = (val: string) => {
        // strip invalid chars live
        const clean = val.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30)
        setInboxUsername(clean)
        setUsernameError('')
    }

    const handleConnect = (erpId: string) => {
        setPreferredErp(erpId)
        setConnecting(true)
        setTimeout(() => {
            setConnecting(false)
            setConnected(true)
            setSelectedInvoices(mockInvoices.map(i => i.id))
            toast.success(`Ansluten till ${erpSystems.find(e => e.id === erpId)?.name}!`, {
                description: `${mockInvoices.length} förfallna fakturor hittades.`,
            })
        }, 1500)
    }

    const toggleInvoice = (id: string) => {
        setSelectedInvoices(
            selectedInvoices.includes(id)
                ? selectedInvoices.filter(i => i !== id)
                : [...selectedInvoices, id]
        )
    }

    const toggleAll = () => {
        if (selectedInvoices.length === mockInvoices.length) {
            setSelectedInvoices([])
        } else {
            setSelectedInvoices(mockInvoices.map(i => i.id))
        }
    }

    const totalSelected = mockInvoices
        .filter(i => selectedInvoices.includes(i.id))
        .reduce((sum, i) => sum + i.amount, 0)

    const emailAddress = `${inboxUsername || 'dittforetag'}@agentmail.to`
    const charsLeft = 30 - inboxUsername.length

    return (
        <div className="space-y-5">
            <div className="text-center">
                <h2 className="text-xl font-medium mb-1">Din AI-agents identitet</h2>
                <p className="text-sm text-muted-foreground">
                    Välj e-postadressen din agent skickar inkasso från.
                </p>
            </div>

            {/* ── Email Identity Card ─────────────────────────────── */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.06] to-primary/[0.02] p-4 space-y-4 shadow-[0_0_32px_rgba(0,229,204,0.06)]">

                {/* Header */}
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,229,204,0.2)]">
                        <Mail className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-primary tracking-wide">Dedikerad inkasso-inkorg</p>
                        <p className="text-[10px] text-muted-foreground">Skapar en exklusiv adress åt din AI-agent</p>
                    </div>
                </div>

                {/* Live email preview */}
                <div className={`relative rounded-xl overflow-hidden border transition-all duration-500 ${previewPulse
                    ? 'border-primary/50 shadow-[0_0_20px_rgba(0,229,204,0.2)]'
                    : 'border-white/[0.08] shadow-none'
                    }`}>
                    {/* Mini "email app" look */}
                    <div className="bg-[#0a1512] px-3 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-white/10" />
                        <div className="h-2 w-2 rounded-full bg-white/10" />
                        <div className="h-2 w-2 rounded-full bg-white/10" />
                        <span className="text-[9px] text-muted-foreground/40 ml-1">Förhandsgranskning</span>
                    </div>
                    <div className="bg-[#0d1a17]/80 p-3 flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center shrink-0 text-primary text-sm font-bold border border-primary/20">
                            {(inboxDisplayName || companyName || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate transition-all duration-200">
                                {inboxDisplayName || companyName || 'Ditt företag'}
                            </p>
                            <p className={`text-[10px] transition-all duration-300 font-mono ${inboxUsername ? 'text-primary/80' : 'text-muted-foreground/40'}`}>
                                {emailAddress}
                            </p>
                        </div>
                        <Sparkles className={`h-3.5 w-3.5 shrink-0 transition-all duration-300 ${previewPulse ? 'text-primary' : 'text-muted-foreground/20'}`} />
                    </div>
                </div>

                {/* Username input */}
                <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                        <AtSign className="h-3 w-3" /> E-postadress
                    </label>
                    <div className={`flex items-stretch rounded-xl border overflow-hidden transition-all duration-200 ${usernameError
                        ? 'border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.15)] animate-[shake_0.3s_ease]'
                        : 'border-white/[0.08] focus-within:border-primary/40 focus-within:shadow-[0_0_16px_rgba(0,229,204,0.1)]'
                        }`}>
                        <input
                            value={inboxUsername}
                            onChange={e => handleUsernameChange(e.target.value)}
                            placeholder="dittforetag"
                            className="flex-1 min-w-0 bg-[#0d1a18] px-3 h-10 text-sm font-mono outline-none text-foreground placeholder:text-muted-foreground/30"
                            spellCheck={false}
                        />
                        <div className="flex items-center px-3 bg-primary/[0.08] border-l border-primary/20 shrink-0">
                            <span className="text-xs font-mono text-primary/70 whitespace-nowrap">@agentmail.to</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                        {usernameError ? (
                            <p className="text-[10px] text-red-400 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {usernameError}
                            </p>
                        ) : (
                            <p className="text-[10px] text-muted-foreground/50">Endast bokstäver och siffror (a-z, 0-9)</p>
                        )}
                        <span className={`text-[10px] font-mono tabular-nums transition-colors ${charsLeft <= 5 ? 'text-orange-400' : 'text-muted-foreground/30'}`}>
                            {charsLeft}
                        </span>
                    </div>
                </div>

                {/* Display name input */}
                <div className="space-y-2">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1">
                        <User className="h-3 w-3" /> Visningsnamn
                    </label>
                    <input
                        value={inboxDisplayName}
                        onChange={e => setInboxDisplayName(e.target.value)}
                        placeholder={companyName || 'Ditt AB'}
                        className="w-full h-10 rounded-xl bg-[#0d1a18] border border-white/[0.08] focus:border-primary/40 focus:shadow-[0_0_16px_rgba(0,229,204,0.1)] px-3 text-sm outline-none transition-all text-foreground placeholder:text-muted-foreground/30"
                    />
                    <p className="text-[10px] text-muted-foreground/50 px-1">Syns som avsändarnamn i dina kunders inkorg</p>
                </div>
            </div>

            {/* ── ERP Section ─────────────────────────────────────── */}
            {!connected ? (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="h-px flex-1 bg-white/[0.06]" />
                        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Valfritt — Koppla bokföring</span>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                        {erpSystems.map((erp) => (
                            <button
                                key={erp.id}
                                onClick={() => handleConnect(erp.id)}
                                disabled={connecting}
                                className={`p-4 rounded-xl border text-center transition-all ${connecting && preferredErp === erp.id
                                    ? 'border-primary/30 bg-primary/5'
                                    : 'border-[#ffffff08] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                                    }`}
                            >
                                <span className="text-sm font-semibold block mb-1">{erp.name}</span>
                                {connecting && preferredErp === erp.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin mx-auto text-primary" />
                                ) : (
                                    <span className="text-[10px] text-muted-foreground">Anslut →</span>
                                )}
                            </button>
                        ))}
                    </div>
                    {connecting && (
                        <p className="text-xs text-center text-muted-foreground animate-pulse">
                            Ansluter till {erpSystems.find(e => e.id === preferredErp)?.name}...
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/[0.05] border border-primary/10">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm text-primary font-medium">{erpSystems.find(e => e.id === preferredErp)?.name} anslutet</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{mockInvoices.length} förfallna fakturor</span>
                    </div>

                    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                        <div className="px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
                            <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <div className={`h-3.5 w-3.5 rounded border transition-all flex items-center justify-center ${selectedInvoices.length === mockInvoices.length ? 'bg-primary border-primary' : 'border-white/20'}`}>
                                    {selectedInvoices.length === mockInvoices.length && <Check className="h-2.5 w-2.5 text-background" />}
                                </div>
                                Markera alla
                            </button>
                            <span className="text-[10px] text-muted-foreground">{selectedInvoices.length} av {mockInvoices.length} valda</span>
                        </div>

                        {mockInvoices.map((inv) => (
                            <button key={inv.id} onClick={() => toggleInvoice(inv.id)}
                                className="w-full px-3 py-2.5 flex items-center gap-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors text-left">
                                <div className={`h-3.5 w-3.5 rounded border transition-all flex items-center justify-center shrink-0 ${selectedInvoices.includes(inv.id) ? 'bg-primary border-primary' : 'border-white/20'}`}>
                                    {selectedInvoices.includes(inv.id) && <Check className="h-2.5 w-2.5 text-background" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium truncate">{inv.debtor}</span>
                                        <span className="text-xs font-semibold">{inv.amount.toLocaleString('sv-SE')} kr</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5">
                                        <span className="text-[10px] text-muted-foreground">{inv.id}</span>
                                        <span className={`text-[10px] ${inv.daysOverdue > 30 ? 'text-red-400' : inv.daysOverdue > 14 ? 'text-orange-400' : 'text-yellow-400'}`}>
                                            {inv.daysOverdue} dagar försenad
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <button onClick={() => setAutoSync(!autoSync)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-colors">
                        <div className="flex items-center gap-2">
                            <RefreshCw className={`h-3.5 w-3.5 ${autoSync ? 'text-primary' : 'text-muted-foreground/40'}`} />
                            <div className="text-left">
                                <span className="text-xs font-medium block">Autosync</span>
                                <span className="text-[10px] text-muted-foreground">Importera nya förfallna fakturor automatiskt</span>
                            </div>
                        </div>
                        <div className={`h-5 w-9 rounded-full transition-all relative ${autoSync ? 'bg-primary' : 'bg-white/10'}`}>
                            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${autoSync ? 'left-[18px]' : 'left-0.5'}`} />
                        </div>
                    </button>

                    {selectedInvoices.length > 0 && (
                        <div className="text-center text-xs text-muted-foreground">
                            <span className="text-primary font-medium">{selectedInvoices.length} fakturor</span> • Totalt <span className="text-foreground font-medium">{totalSelected.toLocaleString('sv-SE')} kr</span>
                        </div>
                    )}
                </div>
            )}

            <Button
                onClick={onNext}
                disabled={loading || !inboxUsername || (connected && selectedInvoices.length === 0)}
                className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)] transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    connected
                        ? <>Importera {selectedInvoices.length} fakturor <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                        : <>Fortsätt <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                )}
            </Button>
        </div>
    )
}
