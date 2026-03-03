'use client'

import { Button } from '@/components/ui/button'
import { Loader2, Mail, Clock, AlertTriangle, CheckCircle2, ArrowRight, FileText, Sparkles } from 'lucide-react'

// Same mock data as ChannelsStep
const mockInvoices = [
    { id: 'F-2024-0847', debtor: 'Karlsson Bygg AB', amount: 12500, daysOverdue: 47 },
    { id: 'F-2024-0912', debtor: 'Lindström Fastigheter', amount: 28900, daysOverdue: 22 },
    { id: 'F-2024-0956', debtor: 'Nordisk El & VVS', amount: 8750, daysOverdue: 14 },
    { id: 'F-2025-0021', debtor: 'Grip Konsult AB', amount: 45000, daysOverdue: 7 },
    { id: 'F-2025-0034', debtor: 'Svensson & Co HB', amount: 6200, daysOverdue: 4 },
]

function TimelineStep({ day, label, icon: Icon, color, isLast }: {
    day: string; label: string; icon: any; color: string; isLast?: boolean
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-3 w-3" />
                </div>
                {!isLast && <div className="w-px h-5 bg-white/[0.06]" />}
            </div>
            <div className="pt-0.5">
                <span className="text-[10px] text-muted-foreground">{day}</span>
                <p className="text-xs">{label}</p>
            </div>
        </div>
    )
}

interface FirstClaimStepProps {
    companyName: string
    tone: string
    selectedInvoices: string[]
    onActivate: () => void
    loading: boolean
    activated: boolean
    inboxId: string | null
}

export function FirstClaimStep({ companyName, tone, selectedInvoices, onActivate, loading, activated, inboxId }: FirstClaimStepProps) {
    const invoices = mockInvoices.filter(i => selectedInvoices.includes(i.id))
    const totalAmount = invoices.reduce((sum, i) => sum + i.amount, 0)
    const hasInvoices = invoices.length > 0

    if (activated) {
        return (
            <div className="flex flex-col items-center gap-5 py-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_32px_rgba(0,229,204,0.3)]">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                    <h2 className="text-xl font-serif italic mb-1.5">Agenten är aktiverad! 🚀</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        {hasInvoices
                            ? `${invoices.length} ärenden skapade. Din AI-agent börjar arbeta direkt.`
                            : 'Din autonoma indrivningsagent är redo. Lägg till ärenden i dashboarden.'
                        }
                    </p>
                </div>
                <Button
                    onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.superclaim.io'}/dashboard`}
                    className="h-10 px-8 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.3)] hover:scale-[1.02] transition-all"
                >
                    Gå till Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <div className="text-center">
                <h2 className="text-xl font-medium mb-1">Granska & Aktivera</h2>
                <p className="text-sm text-muted-foreground">
                    {hasInvoices
                        ? `Bekräfta ${invoices.length} ärenden och starta din AI-agent.`
                        : 'Se hur agenten arbetar och aktivera.'
                    }
                </p>
            </div>

            {/* Imported invoices summary */}
            {hasInvoices && (
                <div className="rounded-lg border border-white/[0.06] overflow-hidden">
                    <div className="px-3 py-2 bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3 text-primary/60" />
                            <span className="text-xs font-medium">{invoices.length} ärenden redo</span>
                        </div>
                        <span className="text-xs font-semibold text-primary">{totalAmount.toLocaleString('sv-SE')} kr</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                        {invoices.map((inv) => (
                            <div key={inv.id} className="px-3 py-2 flex items-center justify-between border-b border-white/[0.03] last:border-0">
                                <div>
                                    <span className="text-xs font-medium">{inv.debtor}</span>
                                    <span className="text-[10px] text-muted-foreground ml-2">{inv.id}</span>
                                </div>
                                <span className="text-xs">{inv.amount.toLocaleString('sv-SE')} kr</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Timeline */}
            <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="h-3 w-3 text-primary/60" />
                    <p className="text-[10px] text-primary/70 uppercase tracking-wider font-medium">Agentens arbetsflöde per ärende</p>
                </div>
                <div className="space-y-0">
                    <TimelineStep day="Dag 1" label="Vänlig påminnelse via e-post" icon={Mail} color="bg-primary/20 text-primary" />
                    <TimelineStep day="Dag 8" label="Formell påminnelse via e-post" icon={Mail} color="bg-[#f5c842]/20 text-[#f5c842]" />
                    <TimelineStep day="Dag 15" label="SMS-krav med fakturalänk" icon={Clock} color="bg-orange-500/20 text-orange-400" />
                    <TimelineStep day="Dag 22" label="Sista varning" icon={AlertTriangle} color="bg-red-500/20 text-red-400" />
                    <TimelineStep day="Dag 30" label="Eskalering till inkasso" icon={AlertTriangle} color="bg-red-500/30 text-red-300" isLast />
                </div>
            </div>

            {/* Confirmation */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                    Genom att aktivera godkänner du att AI-agenten skickar påminnelser å {companyName || 'ditt företags'} vägnar.
                    Du kan pausa eller stoppa agenten när som helst.
                </p>
            </div>

            <Button
                onClick={onActivate}
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.25)] hover:shadow-[0_0_28px_rgba(0,229,204,0.4)] transition-all disabled:opacity-50"
            >
                {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Aktiverar agenten...</>
                ) : (
                    <>🎉 Aktivera agenten</>
                )}
            </Button>
        </div>
    )
}
