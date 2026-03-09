import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Eye, Clock, ArrowDownLeft } from 'lucide-react';

interface TimelineEvent {
    step: number;
    channel: 'email' | 'sms';
    direction?: 'outbound' | 'inbound';
    subject: string;
    body: string;
    sentAt: string;
    openedAt?: string | null;
    status?: 'sent' | 'draft';
}

interface TimelineProps {
    events: TimelineEvent[];
}

export function Timeline({ events }: TimelineProps) {
    return (
        <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />

            <div className="space-y-6">
                {events.map((event, i) => {
                    const isDraft = event.status === 'draft';
                    const isInbound = event.direction === 'inbound';
                    return (
                        <div key={i} className="relative flex gap-4 pl-2">
                            {/* Dot */}
                            <div className={cn(
                                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                isInbound
                                    ? "bg-[#1a1020] border-violet-500/30"
                                    : isDraft
                                        ? "bg-[#1a1810] border-yellow-500/30"
                                        : "bg-[#0d1a18] border-primary/30"
                            )}>
                                {isInbound ? (
                                    <ArrowDownLeft className="h-4 w-4 text-violet-400" />
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
                                                : isDraft
                                                    ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                                    : "bg-primary/10 text-primary border-primary/20"
                                        )}>
                                            {isInbound ? 'Svar' : event.channel === 'email' ? 'E-post' : 'SMS'}
                                        </span>
                                        {isInbound && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400/80 border border-violet-500/20">
                                                Inkommande från gäldenär
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

                                {/* Status indicators */}
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#ffffff08]">
                                    {isInbound ? (
                                        <span className="flex items-center gap-1.5 text-xs text-violet-400">
                                            <ArrowDownLeft className="h-3 w-3" /> Mottaget svar
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
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
