'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { Check, X, Pencil, Mail, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Draft {
    id: string;
    claim_id: string;
    to: string;
    subject: string;
    body: string;
    tone: string;
    step: number;
    status: string;
    created_at: string;
    claims: {
        debtor_name: string;
        debtor_email: string;
        amount: number;
        currency: string;
        invoice_number: string;
    };
}

export default function EmailPreviewPage() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/email-drafts')
            .then(res => res.json())
            .then(data => {
                setDrafts(data.drafts || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleAction = async (draftId: string, action: 'approve' | 'reject') => {
        setActionLoading(draftId);
        try {
            await fetch('/api/email-drafts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId, action }),
            });

            if (action === 'approve') {
                toast.success('Mejl godkänt ✉️', {
                    description: 'Meddelandet skickas inom kort.',
                });
            } else {
                toast('Mejl avslaget', {
                    description: 'Utkastet har tagits bort.',
                });
            }

            setDrafts(drafts.filter(d => d.id !== draftId));
        } catch {
            toast.error('Något gick fel');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="h-8 w-56 bg-[#ffffff08] rounded animate-pulse" />
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-32 bg-[#ffffff08] rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">E-postförhandsgranskning</h1>
                <p className="text-muted-foreground mt-1">Granska och godkänn AI-genererade meddelanden innan de skickas.</p>
            </div>

            {drafts.length === 0 ? (
                <EmptyState
                    icon="inbox"
                    title="Inga väntande mejl"
                    description="AI-agenten har inga utkast som väntar på godkännande. Nya meddelanden dyker upp här automatiskt."
                />
            ) : (
                <div className="space-y-4">
                    {drafts.map((draft) => {
                        const isExpanded = expandedId === draft.id;
                        const isLoading = actionLoading === draft.id;

                        return (
                            <GlassCard key={draft.id} className="overflow-hidden transition-all">
                                {/* Header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                                    className="w-full p-5 flex items-center justify-between hover:bg-primary/5 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <Mail className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{draft.claims.debtor_name}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{draft.subject}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Steg {draft.step}
                                        </span>
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                                            {draft.tone}
                                        </span>
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </button>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="border-t border-[#ffffff08] animate-in fade-in slide-in-from-top-2 duration-200">
                                        {/* Email metadata */}
                                        <div className="px-5 py-3 bg-[#122220]/30 text-xs space-y-1">
                                            <div className="flex">
                                                <span className="text-muted-foreground w-16">Till:</span>
                                                <span>{draft.to}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="text-muted-foreground w-16">Ämne:</span>
                                                <span>{draft.subject}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="text-muted-foreground w-16">Belopp:</span>
                                                <span>{draft.claims.amount.toLocaleString('sv-SE')} {draft.claims.currency}</span>
                                            </div>
                                        </div>

                                        {/* Email body */}
                                        <div className="px-5 py-4">
                                            <div className="bg-[#0d1a18] rounded-xl p-5 border border-[#ffffff08]">
                                                <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                                                    {draft.body}
                                                </pre>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="px-5 py-4 border-t border-[#ffffff08] flex items-center justify-end gap-3">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleAction(draft.id, 'reject')}
                                                disabled={isLoading}
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            >
                                                <X className="h-4 w-4 mr-1" /> Avslå
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleAction(draft.id, 'approve')}
                                                disabled={isLoading}
                                                className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-medium shadow-[0_0_12px_rgba(0,229,204,0.2)] hover:shadow-[0_0_20px_rgba(0,229,204,0.35)] transition-all"
                                            >
                                                {isLoading ? (
                                                    <div className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4 mr-1" /> Godkänn & skicka
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </GlassCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
