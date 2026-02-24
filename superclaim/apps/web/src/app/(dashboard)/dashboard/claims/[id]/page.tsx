import Link from 'next/link';
import { ArrowLeft, Pause, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StepIndicator } from '@/components/claims/StepIndicator';
import { Timeline } from '@/components/claims/Timeline';

// Mock data
const claim = {
    id: 'clm_abc123',
    debtorName: 'Acme Corp AB',
    debtorEmail: 'faktura@acmecorp.se',
    debtorPhone: '+46701234567',
    debtorCountry: 'SE',
    amount: 14500,
    currency: 'SEK',
    dueDate: '2025-10-12',
    daysOverdue: 14,
    source: 'niora',
    status: 'active' as const,
    currentStep: 2,
    paymentLink: 'https://pay.niora.ai/inv/xyz',
};

const timelineEvents = [
    {
        step: 1,
        channel: 'email' as const,
        subject: 'Påminnelse: Faktura #INV-2024-0847',
        body: 'Hej Acme Corp, vi vill vänligt påminna om att faktura #INV-2024-0847 på 14 500 SEK förföll den 12 oktober. Vi ber dig vänligen genomföra betalningen snarast.',
        sentAt: '15 okt 2025',
        openedAt: '15 okt 14:32',
    },
    {
        step: 2,
        channel: 'email' as const,
        subject: 'Uppföljning: Obetald faktura #INV-2024-0847',
        body: 'Hej, vi har ännu inte mottagit betalning för faktura #INV-2024-0847 på 14 500 SEK. Vi vill gärna lösa detta smidigt. Vänligen betala via länken nedan eller kontakta oss om du har frågor.',
        sentAt: '22 okt 2025',
        openedAt: null,
    },
];

export default function ClaimDetailPage() {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight">{claim.debtorName}</h1>
                            <StatusBadge status={claim.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">Ärende {claim.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                        <Pause className="h-4 w-4 mr-2" /> Pausa
                    </Button>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                        <XCircle className="h-4 w-4 mr-2" /> Avbryt
                    </Button>
                    <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10">
                        <AlertTriangle className="h-4 w-4 mr-2" /> Eskalera
                    </Button>
                </div>
            </div>

            {/* Info panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard glowColor="cyan" className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Fakturainformation</h3>
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Belopp</dt>
                            <dd className="text-sm font-medium">{claim.amount.toLocaleString()} {claim.currency}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Förfallodatum</dt>
                            <dd className="text-sm font-medium">{claim.dueDate}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Dagar försenad</dt>
                            <dd className="text-sm font-medium text-destructive">{claim.daysOverdue} dagar</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Källa</dt>
                            <dd className="text-sm font-medium capitalize">{claim.source}</dd>
                        </div>
                        <div className="flex justify-between items-center">
                            <dt className="text-sm text-muted-foreground">Betalningslänk</dt>
                            <dd>
                                <a href={claim.paymentLink} target="_blank" className="text-sm text-primary hover:underline flex items-center gap-1">
                                    Öppna <ExternalLink className="h-3 w-3" />
                                </a>
                            </dd>
                        </div>
                    </dl>
                </GlassCard>

                <GlassCard className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Gäldenär</h3>
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Namn</dt>
                            <dd className="text-sm font-medium">{claim.debtorName}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">E-post</dt>
                            <dd className="text-sm font-medium">{claim.debtorEmail}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Telefon</dt>
                            <dd className="text-sm font-medium">{claim.debtorPhone || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Land</dt>
                            <dd className="text-sm font-medium">{claim.debtorCountry}</dd>
                        </div>
                    </dl>
                </GlassCard>
            </div>

            {/* Step Indicator */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">Indrivningssteg</h3>
                <StepIndicator currentStep={claim.currentStep} />
            </GlassCard>

            {/* Timeline */}
            <div>
                <h3 className="text-lg font-medium mb-6">Kommunikationshistorik</h3>
                <Timeline events={timelineEvents} />
            </div>
        </div>
    );
}
