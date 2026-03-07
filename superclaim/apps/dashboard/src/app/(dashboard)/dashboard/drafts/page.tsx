'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/shared/EmptyState';
import { Check, X, Pencil, Mail, MessageSquare, Clock, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EmailDraft {
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

interface SmsDraft {
    id: string;
    claim_id: string;
    to: string;
    body: string;
    step: number;
    status: string;
    created_at: string;
    claims: {
        debtor_name: string;
        debtor_phone: string;
        amount: number;
        currency: string;
        invoice_number: string;
    };
}

export default function MessagesPage() {
    const [tab, setTab] = useState<'email' | 'sms'>('email');
    const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
    const [smsDrafts, setSmsDrafts] = useState<SmsDraft[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editSubject, setEditSubject] = useState('');
    const [editBody, setEditBody] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/email-drafts').then(r => r.json()),
            fetch('/api/sms-drafts').then(r => r.json()),
        ])
            .then(([emailData, smsData]) => {
                setEmailDrafts(emailData.drafts || []);
                setSmsDrafts(smsData.drafts || []);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (editingId && expandedId !== editingId) {
            setEditingId(null);
            setEditSubject('');
            setEditBody('');
        }
    }, [expandedId, editingId]);

    const startEditEmail = (draft: EmailDraft) => {
        setEditingId(draft.id);
        setEditSubject(draft.subject);
        setEditBody(draft.body);
    };

    const startEditSms = (draft: SmsDraft) => {
        setEditingId(draft.id);
        setEditBody(draft.body);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditSubject('');
        setEditBody('');
    };

    const handleSaveEdit = async (draftId: string) => {
        setActionLoading(draftId);
        const endpoint = tab === 'email' ? '/api/email-drafts' : '/api/sms-drafts';
        try {
            const payload: any = { draftId, action: 'edit', body: editBody };
            if (tab === 'email') payload.subject = editSubject;

            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error();

            toast.success('Utkast uppdaterat ✏️');

            if (tab === 'email') {
                setEmailDrafts(emailDrafts.map(d =>
                    d.id === draftId ? { ...d, subject: editSubject, body: editBody } : d
                ));
            } else {
                setSmsDrafts(smsDrafts.map(d =>
                    d.id === draftId ? { ...d, body: editBody } : d
                ));
            }
            cancelEdit();
        } catch {
            toast.error('Kunde inte spara');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAction = async (draftId: string, action: 'approve' | 'reject') => {
        setActionLoading(draftId);
        const endpoint = tab === 'email' ? '/api/email-drafts' : '/api/sms-drafts';
        const label = tab === 'email' ? 'Mejl' : 'SMS';
        try {
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ draftId, action }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(errData.error || `HTTP ${res.status}`);
            }

            if (action === 'approve') {
                toast.success(`${label} godkänt ✉️`, { description: 'Skickas inom kort.' });
            } else {
                toast(`${label} avslaget`, { description: 'Utkastet har tagits bort.' });
            }

            if (tab === 'email') {
                setEmailDrafts(emailDrafts.filter(d => d.id !== draftId));
            } else {
                setSmsDrafts(smsDrafts.filter(d => d.id !== draftId));
            }
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

    const emailCount = emailDrafts.length;
    const smsCount = smsDrafts.length;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Förhandsgranskning</h1>
                <p className="text-muted-foreground mt-1">Granska och godkänn AI-genererade meddelanden innan de skickas.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[#122220]/50 rounded-xl border border-[#ffffff08] w-fit">
                <button
                    onClick={() => { setTab('email'); setExpandedId(null); cancelEdit(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'email'
                        ? 'bg-primary/15 text-primary shadow-[0_0_12px_rgba(0,229,204,0.1)]'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <Mail className="h-4 w-4" />
                    E-post
                    {emailCount > 0 && (
                        <span className="inline-flex items-center justify-center h-[18px] min-w-[28px] rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                            {emailCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setTab('sms'); setExpandedId(null); cancelEdit(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'sms'
                        ? 'bg-violet-500/15 text-violet-400 shadow-[0_0_12px_rgba(139,92,246,0.1)]'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <MessageSquare className="h-4 w-4" />
                    SMS
                    {smsCount > 0 && (
                        <span className="inline-flex items-center justify-center h-[18px] min-w-[28px] rounded-md bg-primary/15 text-primary text-[10px] font-bold">
                            {smsCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Email Drafts */}
            {tab === 'email' && (
                emailDrafts.length === 0 ? (
                    <EmptyState
                        icon="inbox"
                        title="Inga väntande mejl"
                        description="AI-agenten har inga e-postutkast som väntar på godkännande."
                    />
                ) : (
                    <div className="space-y-4">
                        {emailDrafts.map((draft) => {
                            const isExpanded = expandedId === draft.id;
                            const isLoading = actionLoading === draft.id;
                            return (
                                <GlassCard key={draft.id} className="overflow-hidden transition-all">
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
                                                <Clock className="h-3 w-3" /> Steg {draft.step}
                                            </span>
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{draft.tone}</span>
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-[#ffffff08] animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="px-5 py-3 bg-[#122220]/30 text-xs space-y-1">
                                                <div className="flex"><span className="text-muted-foreground w-16">Till:</span><span>{draft.to}</span></div>
                                                <div className="flex"><span className="text-muted-foreground w-16">Ämne:</span><span>{editingId === draft.id ? editSubject : draft.subject}</span></div>
                                                <div className="flex"><span className="text-muted-foreground w-16">Belopp:</span><span>{draft.claims.amount.toLocaleString('sv-SE')} {draft.claims.currency}</span></div>
                                            </div>
                                            <div className="px-5 py-4">
                                                <div className="bg-[#0d1a18] rounded-xl p-5 border border-[#ffffff08]">
                                                    {editingId === draft.id ? (
                                                        <div className="space-y-4">
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground mb-2 block">Ämne</Label>
                                                                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="bg-[#122220] border-[#ffffff10] text-sm" />
                                                            </div>
                                                            <div>
                                                                <Label className="text-xs text-muted-foreground mb-2 block">Meddelande</Label>
                                                                <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={10}
                                                                    className="w-full rounded-md border border-[#ffffff10] bg-[#122220] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y min-h-[200px]" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans leading-relaxed">{draft.body}</pre>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-5 py-4 border-t border-[#ffffff08] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {editingId === draft.id ? (
                                                        <>
                                                            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isLoading} className="text-muted-foreground hover:text-foreground">Avbryt</Button>
                                                            <Button size="sm" onClick={() => handleSaveEdit(draft.id)} disabled={isLoading} className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30">
                                                                {isLoading ? <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Spara</>}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" onClick={() => startEditEmail(draft)} disabled={isLoading} className="text-muted-foreground hover:text-primary hover:bg-primary/10">
                                                            <Pencil className="h-4 w-4 mr-1" /> Redigera
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button variant="ghost" size="sm" onClick={() => handleAction(draft.id, 'reject')} disabled={isLoading} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                        <X className="h-4 w-4 mr-1" /> Avslå
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleAction(draft.id, 'approve')} disabled={isLoading}
                                                        className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-medium shadow-[0_0_12px_rgba(0,229,204,0.2)] hover:shadow-[0_0_20px_rgba(0,229,204,0.35)]">
                                                        {isLoading ? <div className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Godkänn & skicka</>}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            );
                        })}
                    </div>
                )
            )}

            {/* SMS Drafts */}
            {tab === 'sms' && (
                smsDrafts.length === 0 ? (
                    <EmptyState
                        icon="inbox"
                        title="Inga väntande SMS"
                        description="AI-agenten har inga SMS-utkast som väntar på godkännande."
                    />
                ) : (
                    <div className="space-y-4">
                        {smsDrafts.map((draft) => {
                            const isExpanded = expandedId === draft.id;
                            const isLoading = actionLoading === draft.id;
                            return (
                                <GlassCard key={draft.id} className="overflow-hidden transition-all">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : draft.id)}
                                        className="w-full p-5 flex items-center justify-between hover:bg-violet-500/5 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                                                <MessageSquare className="h-5 w-5 text-violet-400" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{draft.claims.debtor_name}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{draft.to}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> Steg {draft.step}
                                            </span>
                                            <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded-full">
                                                {draft.body.length} tecken
                                            </span>
                                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="border-t border-[#ffffff08] animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="px-5 py-3 bg-violet-500/5 text-xs space-y-1">
                                                <div className="flex"><span className="text-muted-foreground w-16">Till:</span><span className="font-mono">{draft.to}</span></div>
                                                <div className="flex"><span className="text-muted-foreground w-16">Belopp:</span><span>{draft.claims.amount.toLocaleString('sv-SE')} {draft.claims.currency}</span></div>
                                            </div>
                                            <div className="px-5 py-4">
                                                <div className="bg-[#0d1a18] rounded-xl p-5 border border-violet-500/10">
                                                    {editingId === draft.id ? (
                                                        <div>
                                                            <Label className="text-xs text-muted-foreground mb-2 block">SMS-meddelande</Label>
                                                            <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4}
                                                                className="w-full rounded-md border border-[#ffffff10] bg-[#122220] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y" />
                                                            <p className="text-[10px] text-muted-foreground/60 mt-1">{editBody.length}/160 tecken (1 SMS)</p>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="bg-violet-500/5 rounded-lg p-4 border border-violet-500/10">
                                                                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{draft.body}</p>
                                                            </div>
                                                            <p className="text-[10px] text-muted-foreground/60 mt-2">{draft.body.length} tecken</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="px-5 py-4 border-t border-[#ffffff08] flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {editingId === draft.id ? (
                                                        <>
                                                            <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={isLoading} className="text-muted-foreground hover:text-foreground">Avbryt</Button>
                                                            <Button size="sm" onClick={() => handleSaveEdit(draft.id)} disabled={isLoading} className="bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30">
                                                                {isLoading ? <div className="h-4 w-4 border-2 border-violet-500/30 border-t-violet-400 rounded-full animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Spara</>}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" onClick={() => startEditSms(draft)} disabled={isLoading} className="text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10">
                                                            <Pencil className="h-4 w-4 mr-1" /> Redigera
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button variant="ghost" size="sm" onClick={() => handleAction(draft.id, 'reject')} disabled={isLoading} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                        <X className="h-4 w-4 mr-1" /> Avslå
                                                    </Button>
                                                    <Button size="sm" onClick={() => handleAction(draft.id, 'approve')} disabled={isLoading}
                                                        className="bg-gradient-to-r from-violet-500 to-violet-400 text-white font-medium shadow-[0_0_12px_rgba(139,92,246,0.2)] hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]">
                                                        {isLoading ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Check className="h-4 w-4 mr-1" /> Godkänn & skicka</>}
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </GlassCard>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}
