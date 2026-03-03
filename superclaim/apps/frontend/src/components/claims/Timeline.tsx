import { cn } from "@/lib/utils";
import { Mail, MessageSquare, Eye, MousePointerClick } from 'lucide-react';

interface TimelineEvent {
    step: number;
    channel: 'email' | 'sms';
    subject: string;
    body: string;
    sentAt: string;
    openedAt?: string | null;
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
                {events.map((event, i) => (
                    <div key={i} className="relative flex gap-4 pl-2">
                        {/* Dot */}
                        <div className={cn(
                            "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                            "bg-[#0d1a18] border-primary/30"
                        )}>
                            {event.channel === 'email' ? (
                                <Mail className="h-4 w-4 text-primary" />
                            ) : (
                                <MessageSquare className="h-4 w-4 text-primary" />
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 rounded-xl bg-[#122220]/60 border border-[#ffffff08] p-4 hover:border-primary/20 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Steg {event.step}</span>
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                        {event.channel === 'email' ? 'E-post' : 'SMS'}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">{event.sentAt}</span>
                            </div>

                            {event.subject && (
                                <p className="text-sm font-medium text-foreground/90 mb-1">{event.subject}</p>
                            )}
                            <p className="text-sm text-muted-foreground leading-relaxed">{event.body}</p>

                            {/* Status indicators */}
                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#ffffff08]">
                                <span className="flex items-center gap-1.5 text-xs text-primary">
                                    <Mail className="h-3 w-3" /> Skickat ✓
                                </span>
                                {event.openedAt && (
                                    <span className="flex items-center gap-1.5 text-xs text-[#f5c842]">
                                        <Eye className="h-3 w-3" /> Öppnat {event.openedAt}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
