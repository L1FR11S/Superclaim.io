'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { Check, X, Pencil, Mail, Clock, ChevronDown, ChevronUp, Save } from 'lucide-react';
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');

    useEffect(() => {
        fetch('/api/email-drafts')
            .then(res => res.json())
            .then(data => {
                setDrafts(data.drafts || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (editingId && expandedId !== editingId) {
            setEditingId(null);
            setEditSubject('');
            setEditBody('');
        }
    }, [expandedId, editingId]);

    const startEdit = (draft: Draft) => {
        setEditingId(draft.id);
        setEditSubject(draft.subject);
        setEditBody(draft.body);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditSubject('');
        setEditBody('');
    };

    const handleSaveEdit = async (draftId: string) => {
        setActionLoading(draftId);
        try {
            const res = await fetch('/api/email-drafts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId, action: 'edit', subject: editSubject, body: editBody }),
            });
            if (!res.ok) throw new Error();

            toast.success('Utkast uppdaterat ✏️', {
                description: 'Ändringarna har sparats.',
            });

            setDrafts(drafts.map(d =>
                d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d
            ));
            cancelEdit();
        } catch {
            toast.error('Kunde inte spara ändringar');
        } finally {
            setActionLoading(null);
        }
    };

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
                                                <span>{editingId === draft.id ? editSubject : draft.subject}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="text-muted-foreground w-16">Belopp:</span>
                                                <span>{draft.claims.amount.toLocaleString('sv-SE')} {draft.claims.currency}</span>
                                            </div>
                                        </div>

                                        {/* Email body - view or edit mode */}
                                        <div className="px-5 py-4">
                                            <div className="bg-[#0d1a18] rounded-xl p-5 border border-[#ffffff08]">
                                                {editingId === draft.id ? (
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-2 block">Ämne</Label>
                                                            <Input
                                                                value={editSubject}
                                                                onChange={(e) => setEditSubject(e.target.value)}
                                                                className="bg-[#122220] border-[#ffffff10] text-sm"
                                                                placeholder="Ämnesrad..."
                                                            />
                                                        </div>
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-2 block">Meddelande</Label>
                                                            <textarea
                                                                value={editBody}
                                                                onChange={(e) => setEditBody(e.target.value)}
                                                                rows={10}
                                                                className="w-full rounded-md border border-[#ffffff10] bg-[#122220] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y min-h-[200px]"
                                                                placeholder="Skriv ditt meddelande..."
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">
                                                        {draft.body}
                                                    </pre>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="px-5 py-4 border-t border-[#ffffff08] flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {editingId === draft.id ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={cancelEdit}
                                                            disabled={isLoading}
                                                            className="text-muted-foreground hover:text-foreground"
                                                        >
                                                            Avbryt
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSaveEdit(draft.id)}
                                                            disabled={isLoading}
                                                            className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all"
                                                        >
                                                            {isLoading ? (
                                                                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Save className="h-4 w-4 mr-1" /> Spara ändringar
                                                                </>
                                                            )}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => startEdit(draft)}
                                                        disabled={isLoading}
                                                        className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                    >
                                                        <Pencil className="h-4 w-4 mr-1" /> Redigera
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
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
