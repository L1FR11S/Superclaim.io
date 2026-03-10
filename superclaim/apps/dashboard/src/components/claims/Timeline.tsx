'use client';

import { useState } from 'react';
import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Eye, Clock, ArrowDownLeft, Reply, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface TimelineEvent {
    step: number;
    channel: 'email' | 'sms';
    direction?: 'outbound' | 'inbound';
    subject: string;
    body: string;
    sentAt: string;
    openedAt?: string | null;
    status?: 'sent' | 'draft';
    agentmail_message_id?: string | null;
}

interface TimelineProps {
    events: TimelineEvent[];
    claimId?: string;
    onReplySent?: (reply: TimelineEvent) => void;
}

export function Timeline({ events, claimId, onReplySent }: TimelineProps) {
    const [replyingTo, setReplyingTo] = useState<number | null>(null);
    const [replyText, setReplyText] = useState('');
    const [sending, setSending] = useState(false);

    const handleSendReply = async (event: TimelineEvent, index: number) => {
        if (!replyText.trim() || !claimId) return;
        setSending(true);
        try {
            const res = await fetch(`/api/claims/${claimId}/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: replyText,
                    messageId: event.agentmail_message_id,
                }),
            });
            if (res.ok) {
                toast.success('Svar skickat!');
                onReplySent?.({
                    step: event.step,
                    channel: 'email',
                    direction: 'outbound',
                    subject: `Re: ${event.subject}`,
                    body: replyText,
                    sentAt: new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }),
                    status: 'sent',
                });
                setReplyText('');
                setReplyingTo(null);
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error('Kunde inte skicka svar', { description: err.error });
            }
        } catch {
            toast.error('Nätverksfel');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />

            <div className="space-y-6">
                {events.map((event, i) => {
                    const isDraft = event.status === 'draft';
                    const isInbound = event.direction === 'inbound';
                    const isManualReply = !isInbound && event.subject?.startsWith('Re:');
                    const isReplying = replyingTo === i;
                    return (
                        <div key={i} className={cn("relative flex gap-4 pl-2", isManualReply && "ml-8")}>
                            {/* Dot */}
                            <div className={cn(
                                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                isInbound
                                    ? "bg-[#1a1020] border-violet-500/30"
                                    : isManualReply
                                        ? "bg-[#101a20] border-blue-500/30"
                                        : isDraft
                                            ? "bg-[#1a1810] border-yellow-500/30"
                                            : "bg-[#0d1a18] border-primary/30"
                            )}>
                                {isInbound ? (
                                    <ArrowDownLeft className="h-4 w-4 text-violet-400" />
                                ) : isManualReply ? (
                                    <Reply className="h-4 w-4 text-blue-400" />
                                ) : event.channel === 'email' ? (
                                    <Mail className={cn("h-4 w-4", isDraft ? "text-yellow-400" : "text-primary")} />
                                ) : (
                                    <MessageSquare className={cn("h-4 w-4", isDraft ? "text-yellow-400" : "text-primary")} />
                                )}
                            </div>

                            {/* Content */}
                            <div className={cn(
                                "flex-1 rounded-xl border p-4 transition-colors",
                                isInbound
                                    ? "bg-violet-500/5 border-violet-500/15 hover:border-violet-500/30"
                                    : isManualReply
                                        ? "bg-blue-500/5 border-blue-500/15 hover:border-blue-500/30"
                                        : isDraft
                                            ? "bg-yellow-500/5 border-yellow-500/15 hover:border-yellow-500/30"
                                            : "bg-[#122220]/60 border-[#ffffff08] hover:border-primary/20"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">Steg {event.step}</span>
                                        <span className={cn(
                                            "text-xs px-2 py-0.5 rounded-full border",
                                            isInbound
                                                ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                                                : isManualReply
                                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                                    : isDraft
                                                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                        : "bg-primary/10 text-primary border-primary/20"
                                        )}>
                                            {isInbound ? 'Svar' : isManualReply ? 'Ditt svar' : event.channel === 'email' ? 'E-post' : 'SMS'}
                                        </span>
                                        {isInbound && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400/80 border border-violet-500/20">
                                                Inkommande från gäldenär
                                            </span>
                                        )}
                                        {isManualReply && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400/80 border border-blue-500/20">
                                                ↩ Svar till gäldenär
                                            </span>
                                        )}
                                        {isDraft && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400/80 border border-yellow-500/20">
                                                Utkast — väntar på godkännande
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{event.sentAt}</span>
                                </div>

                                {event.subject && (
                                    <p className="text-sm font-medium text-foreground/90 mb-1">{event.subject}</p>
                                )}
                                <p className="text-sm text-muted-foreground leading-relaxed">{event.body}</p>

                                {/* Status indicators + reply button */}
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#ffffff08]">
                                    <div className="flex items-center gap-4">
                                        {isInbound ? (
                                            <span className="flex items-center gap-1.5 text-xs text-violet-400">
                                                <ArrowDownLeft className="h-3 w-3" /> Mottaget svar
                                            </span>
                                        ) : isManualReply ? (
                                            <span className="flex items-center gap-1.5 text-xs text-blue-400">
                                                <Reply className="h-3 w-3" /> Svarat ✓
                                            </span>
                                        ) : isDraft ? (
                                            <span className="flex items-center gap-1.5 text-xs text-yellow-400">
                                                <Clock className="h-3 w-3" /> Väntar på granskning
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs text-primary">
                                                <Mail className="h-3 w-3" /> Skickat ✓
                                            </span>
                                        )}
                                        {event.openedAt && (
                                            <span className="flex items-center gap-1.5 text-xs text-[#f5c842]">
                                                <Eye className="h-3 w-3" /> Öppnat {event.openedAt}
                                            </span>
                                        )}
                                    </div>
                                    {isInbound && claimId && !isReplying && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setReplyingTo(i)}
                                            className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 gap-1.5"
                                        >
                                            <Reply className="h-3.5 w-3.5" /> Svara
                                        </Button>
                                    )}
                                </div>

                                {/* Inline reply form */}
                                {isReplying && (
                                    <div className="mt-3 pt-3 border-t border-violet-500/15 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <textarea
                                            autoFocus
                                            placeholder="Skriv ditt svar..."
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg bg-[#ffffff06] border border-violet-500/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/40 transition-colors resize-none"
                                        />
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                className="h-7 text-xs text-muted-foreground"
                                            >
                                                Avbryt
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSendReply(event, i)}
                                                disabled={!replyText.trim() || sending}
                                                className="h-7 text-xs gap-1.5 bg-violet-600 hover:bg-violet-500 text-white"
                                            >
                                                {sending ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Send className="h-3 w-3" />
                                                )}
                                                {sending ? 'Skickar...' : 'Skicka svar'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
