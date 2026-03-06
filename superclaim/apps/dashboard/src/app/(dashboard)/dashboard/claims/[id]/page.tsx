'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pause, XCircle, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { StepIndicator } from '@/components/claims/StepIndicator';
import { Timeline } from '@/components/claims/Timeline';
import { toast } from 'sonner';

interface Claim {
    id: string;
    debtor_name: string;
    debtor_email: string;
    debtor_phone?: string | null;
    amount: number;
    currency: string;
    due_date: string;
    days_overdue: number;
    invoice_number?: string;
    source?: string;
    status: 'active' | 'paid' | 'escalated' | 'cancelled';
    current_step: number;
    payment_link?: string;
}

interface TimelineEvent {
    step: number;
    channel: 'email' | 'sms';
    subject: string;
    body: string;
    sentAt: string;
    openedAt?: string | null;
}

function formatTimelineDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimelineTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

export default function ClaimDetailPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const [claim, setClaim] = useState<Claim | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/claims/${id}`)
            .then((res) => res.json())
            .then((data) => {
                setClaim(data.claim);
                const raw = data.timeline || [];
                setTimeline(raw.map((e: any) => ({
                    ...e,
                    channel: (e.channel || 'email') as 'email' | 'sms',
                    sentAt: formatTimelineDate(e.sentAt),
                    openedAt: e.openedAt ? formatTimelineTime(e.openedAt) : null,
                })));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [id]);

    if (loading || !claim) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="h-12 w-64 bg-[#ffffff08] rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-48 bg-[#ffffff08] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/claims"
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-semibold tracking-tight">{claim.debtor_name}</h1>
                            <StatusBadge status={claim.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">Ärende {claim.id}</p>
                    </div>
                </div>
                {claim.status === 'active' && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"
                            onClick={async () => {
                                const res = await fetch(`/api/claims/${id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'pause' }),
                                });
                                if (res.ok) { setClaim({ ...claim, status: 'cancelled' as any }); router.refresh(); }
                            }}
                        >
                            <Pause className="h-4 w-4 mr-2" /> Pausa
                        </Button>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={async () => {
                                const res = await fetch(`/api/claims/${id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'cancel' }),
                                });
                                if (res.ok) { setClaim({ ...claim, status: 'cancelled' }); }
                            }}
                        >
                            <XCircle className="h-4 w-4 mr-2" /> Avbryt
                        </Button>
                        <Button variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                            onClick={async () => {
                                const res = await fetch(`/api/claims/${id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ action: 'escalate' }),
                                });
                                if (res.ok) { setClaim({ ...claim, status: 'escalated' }); }
                            }}
                        >
                            <AlertTriangle className="h-4 w-4 mr-2" /> Eskalera
                        </Button>
                    </div>
                )}
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={async () => {
                        if (!confirm(`Vill du verkligen ta bort ärendet för ${claim.debtor_name}? Det går inte att ångra.`)) return;
                        const res = await fetch(`/api/claims/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            toast.success('Ärende borttaget');
                            router.push('/dashboard/claims');
                        } else {
                            toast.error('Kunde inte ta bort ärendet');
                        }
                    }}
                >
                    <Trash2 className="h-4 w-4 mr-2" /> Ta bort
                </Button>
            </div>

            {/* Info panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard glowColor="cyan" className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Fakturainformation</h3>
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Belopp</dt>
                            <dd className="text-sm font-medium">{claim.amount.toLocaleString('sv-SE')} {claim.currency}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Förfallodatum</dt>
                            <dd className="text-sm font-medium">{new Date(claim.due_date).toLocaleDateString('sv-SE')}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Dagar försenad</dt>
                            <dd className="text-sm font-medium text-destructive">{claim.days_overdue} dagar</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Fakturanr</dt>
                            <dd className="text-sm font-medium">{claim.invoice_number || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Källa</dt>
                            <dd className="text-sm font-medium capitalize">{claim.source || 'niora'}</dd>
                        </div>
                        {claim.payment_link && (
                            <div className="flex justify-between items-center">
                                <dt className="text-sm text-muted-foreground">Betalningslänk</dt>
                                <dd>
                                    <a href={claim.payment_link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                                        Öppna <ExternalLink className="h-3 w-3" />
                                    </a>
                                </dd>
                            </div>
                        )}
                    </dl>
                </GlassCard>

                <GlassCard className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Gäldenär</h3>
                    <dl className="space-y-3">
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Namn</dt>
                            <dd className="text-sm font-medium">{claim.debtor_name}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">E-post</dt>
                            <dd className="text-sm font-medium">{claim.debtor_email || '—'}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-sm text-muted-foreground">Telefon</dt>
                            <dd className="text-sm font-medium">{claim.debtor_phone || '—'}</dd>
                        </div>
                    </dl>
                </GlassCard>
            </div>

            {/* Step Indicator */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-6 uppercase tracking-wider">Indrivningssteg</h3>
                <StepIndicator currentStep={claim.current_step} />
            </GlassCard>

            {/* Timeline */}
            <div>
                <h3 className="text-lg font-medium mb-6">Kommunikationshistorik</h3>
                {timeline.length > 0 ? (
                    <Timeline events={timeline} />
                ) : (
                    <GlassCard className="p-12 text-center">
                        <p className="text-muted-foreground">Ingen kommunikation ännu. AI-agenten kommer att skicka första påminnelsen när det är dags.</p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
