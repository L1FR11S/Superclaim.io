'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Check, ArrowRight, RefreshCw, Mail, Sparkles } from 'lucide-react'
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

/** Derive inbox ID from company name, same logic as backend */
function toInboxId(name: string): string {
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
    onNext: () => void
    loading: boolean
}

export function ChannelsStep({
    companyName,
    preferredErp, setPreferredErp,
    selectedInvoices, setSelectedInvoices,
    autoSync, setAutoSync,
    onNext, loading,
}: ChannelsStepProps) {
    const [connected, setConnected] = useState(false)
    const [connecting, setConnecting] = useState(false)

    const inboxId = toInboxId(companyName || 'dittforetag')
    const emailPreview = `${inboxId}@agentmail.to`

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

    return (
        <div className="space-y-5">
            <div className="text-center">
                <h2 className="text-xl font-medium mb-1">Koppla ditt system</h2>
                <p className="text-sm text-muted-foreground">
                    {connected
                        ? 'Välj vilka fakturor du vill importera till Superclaim.'
                        : 'Anslut ditt bokföringssystem och konfigurera agentens e-postidentitet.'
                    }
                </p>
            </div>

            {/* Agent Email Identity */}
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4 space-y-3">
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-primary">Agentens e-postadress</p>
                        <p className="text-[10px] text-muted-foreground">Härifrån skickas alla inkassomejl</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background/60 border border-white/[0.08]">
                    <Sparkles className="h-3.5 w-3.5 text-primary/50 shrink-0" />
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{emailPreview}</span>
                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full font-medium shrink-0">Auto</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 px-1">
                    Baserat på ditt företagsnamn. Du kan koppla en egen domän i inställningar efter aktivering.
                </p>
            </div>

            {!connected ? (
                <>
                    {/* ERP buttons */}
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
                </>
            ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Connected badge */}
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/[0.05] border border-primary/10">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary" />
                            </div>
                            <span className="text-sm text-primary font-medium">{erpSystems.find(e => e.id === preferredErp)?.name} anslutet</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{mockInvoices.length} förfallna fakturor</span>
                    </div>

                    {/* Invoice list */}
                    <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                        <div className="px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
                            <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                <div className={`h-3.5 w-3.5 rounded border transition-all flex items-center justify-center ${selectedInvoices.length === mockInvoices.length
                                    ? 'bg-primary border-primary' : 'border-white/20'
                                    }`}>
                                    {selectedInvoices.length === mockInvoices.length && <Check className="h-2.5 w-2.5 text-background" />}
                                </div>
                                Markera alla
                            </button>
                            <span className="text-[10px] text-muted-foreground">{selectedInvoices.length} av {mockInvoices.length} valda</span>
                        </div>

                        {mockInvoices.map((inv) => (
                            <button
                                key={inv.id}
                                onClick={() => toggleInvoice(inv.id)}
                                className="w-full px-3 py-2.5 flex items-center gap-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors text-left"
                            >
                                <div className={`h-3.5 w-3.5 rounded border transition-all flex items-center justify-center shrink-0 ${selectedInvoices.includes(inv.id)
                                    ? 'bg-primary border-primary' : 'border-white/20'
                                    }`}>
                                    {selectedInvoices.includes(inv.id) && <Check className="h-2.5 w-2.5 text-background" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium truncate">{inv.debtor}</span>
                                        <span className="text-xs font-semibold text-foreground">{inv.amount.toLocaleString('sv-SE')} kr</span>
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

                    {/* Auto-sync toggle */}
                    <button
                        onClick={() => setAutoSync(!autoSync)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.03] transition-colors"
                    >
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
                disabled={loading || (connected && selectedInvoices.length === 0)}
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
