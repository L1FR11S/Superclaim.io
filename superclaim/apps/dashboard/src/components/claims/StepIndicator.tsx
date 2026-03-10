'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    Zap, Mail, MessageSquare, AlertTriangle, Flag, Check,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────── */

interface TimelineEvent {
    step: number;
    channel: 'email' | 'sms';
    direction?: 'outbound' | 'inbound';
    subject: string;
    sentAt: string;
    status?: 'sent' | 'draft';
}

interface FlowNode {
    id: string;
    type: string;
    data: any;
}

interface FlowEdge {
    source: string;
    target: string;
    sourceHandle?: string;
}

interface DisplayStep {
    type: string;
    label: string;
    delayDays?: number;
}

interface StepIndicatorProps {
    currentStep: number;
    timeline?: TimelineEvent[];
}

/* ─── Icon config ────────────────────────────────────── */

const stepIcons: Record<string, typeof Zap> = {
    trigger: Zap,
    email: Mail,
    sms: MessageSquare,
    escalate: AlertTriangle,
    end: Flag,
};

/* ─── Fallback steps ─────────────────────────────────── */

const fallbackSteps: DisplayStep[] = [
    { type: 'trigger', label: 'Skapad' },
    { type: 'email', label: 'Påminnelse', delayDays: 3 },
    { type: 'email', label: 'Uppföljning', delayDays: 7 },
    { type: 'sms', label: 'SMS-krav', delayDays: 7 },
    { type: 'email', label: 'Varning', delayDays: 5 },
    { type: 'escalate', label: 'Eskalerat', delayDays: 5 },
];

/* ─── Flow extraction ────────────────────────────────── */

function extractStepsFromFlow(nodes: FlowNode[], edges: FlowEdge[]): DisplayStep[] {
    if (!nodes || nodes.length === 0) return fallbackSteps;

    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode || !edges || edges.length === 0) {
        return collapseDelays(nodes);
    }

    const adjMap = new Map<string, string>();
    for (const edge of edges) {
        if (!adjMap.has(edge.source) || edge.sourceHandle === 'no') {
            adjMap.set(edge.source, edge.target);
        }
    }

    const orderedNodes: FlowNode[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = triggerNode.id;

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = nodes.find(n => n.id === currentId);
        if (node) orderedNodes.push(node);
        currentId = adjMap.get(currentId);
    }

    return collapseDelays(orderedNodes);
}

function collapseDelays(nodes: FlowNode[]): DisplayStep[] {
    const steps: DisplayStep[] = [];
    let pendingDelay: number | undefined;

    for (const node of nodes) {
        if (node.type === 'delay') {
            pendingDelay = node.data?.days || 7;
        } else if (node.type === 'condition') {
            continue;
        } else {
            steps.push({
                type: node.type || 'email',
                label: node.data?.label || node.type || 'Steg',
                delayDays: pendingDelay,
            });
            pendingDelay = undefined;
        }
    }

    return steps.length > 0 ? steps : fallbackSteps;
}

/* ─── Component ──────────────────────────────────────── */

/**
 * current_step mapping:
 * Engine increments current_step for each email/sms node executed (not for trigger/delay).
 * Display index 0 = trigger (always complete when current_step >= 0).
 * Display index N (N>=1) is an action node → completed when current_step >= N.
 * Current (active) step = the first display step where current_step < N.
 */
export function StepIndicator({ currentStep, timeline = [] }: StepIndicatorProps) {
    const [steps, setSteps] = useState<DisplayStep[]>(fallbackSteps);

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                if (data.agent_flow?.nodes?.length > 0) {
                    setSteps(extractStepsFromFlow(
                        data.agent_flow.nodes,
                        data.agent_flow.edges || []
                    ));
                }
            })
            .catch(() => { });
    }, []);

    /* Map display index to engine step:
       Display 0 = trigger (always done, engine step 0)
       Display 1 = first action (done when current_step >= 1)
       Display 2 = second action (done when current_step >= 2)
       etc.
    */
    const isStepCompleted = (displayIndex: number) => {
        if (displayIndex === 0) return true; // trigger always done
        return currentStep >= displayIndex;
    };

    const isStepCurrent = (displayIndex: number) => {
        if (displayIndex === 0) return false; // trigger is never "current"
        return currentStep === displayIndex - 1;
    };

    /* Tooltip helpers */
    const getCompletedInfo = (displayIndex: number) => {
        // Engine step number = displayIndex (action nodes use claim.current_step + 1)
        const events = timeline.filter(e => e.step === displayIndex && e.direction === 'outbound');
        if (events.length === 0) return null;
        const latest = events[events.length - 1];
        return { subject: latest.subject, date: latest.sentAt, channel: latest.channel };
    };

    /* Progress line width */
    const totalSteps = steps.length - 1; // exclude trigger from count
    const completedActions = Math.min(currentStep, totalSteps);
    const progressPercent = totalSteps > 0 ? (completedActions / totalSteps) * 100 : 0;

    return (
        <div className="relative w-full pt-1 pb-1">
            {/* ── Continuous background line ── */}
            <div className="absolute top-[22px] left-[16px] right-[16px] h-[2px] bg-[#ffffff08] rounded-full" />
            {/* ── Active glow progress ── */}
            <div
                className="absolute top-[22px] left-[16px] h-[2px] rounded-full bg-primary transition-all duration-700 ease-out"
                style={{
                    width: `calc((100% - 32px) * ${Math.min(progressPercent, 100) / 100})`,
                    boxShadow: '0 0 8px rgba(0,229,204,0.4), 0 0 2px rgba(0,229,204,0.6)',
                }}
            />

            {/* ── Step dots + labels ── */}
            <div className="relative flex w-full">
                {steps.map((step, i) => {
                    const completed = isStepCompleted(i);
                    const current = isStepCurrent(i);
                    const future = !completed && !current;
                    const isEscalated = step.type === 'escalate' && completed;
                    const Icon = stepIcons[step.type] || Mail;
                    const completedInfo = completed && i > 0 ? getCompletedInfo(i) : null;

                    return (
                        <div key={i} className="flex-1 flex flex-col items-center group relative">
                            {/* Dot */}
                            <div className={cn(
                                "h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0 z-10",
                                completed && !isEscalated && "bg-primary border-primary",
                                completed && isEscalated && "bg-amber-500 border-amber-500",
                                current && "border-primary bg-[#0a1a18] shadow-[0_0_12px_rgba(0,229,204,0.5)] animate-[pulse-glow_2s_ease-in-out_infinite]",
                                future && "border-[#ffffff15] bg-[#0a1a18]"
                            )}>
                                {completed ? (
                                    <Check className={cn("h-2.5 w-2.5", isEscalated ? "text-[#0a1a18]" : "text-[#0a1a18]")} />
                                ) : (
                                    <Icon className={cn(
                                        "h-2.5 w-2.5",
                                        current ? "text-primary" : "text-[#ffffff20]"
                                    )} />
                                )}
                            </div>

                            {/* Label */}
                            <span className={cn(
                                "text-[9px] font-medium tracking-wider uppercase transition-colors text-center leading-tight mt-2 max-w-[80px]",
                                completed && "text-primary",
                                current && "text-primary",
                                future && "text-muted-foreground/30"
                            )}>
                                {step.label}
                            </span>

                            {/* Delay info */}
                            {step.delayDays && i > 0 && (
                                <span className={cn(
                                    "text-[8px] mt-0.5",
                                    (completed || current) ? "text-primary/40" : "text-muted-foreground/20"
                                )}>
                                    {step.delayDays} dagar
                                </span>
                            )}

                            {/* Date for completed steps */}
                            {completedInfo && (
                                <span className="text-[8px] text-primary/40 mt-0.5">
                                    {completedInfo.date}
                                </span>
                            )}

                            {/* Hover tooltip */}
                            {(completedInfo || (future && step.delayDays) || (current && step.delayDays)) && (
                                <div className="absolute top-full mt-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50">
                                    <div className="w-2 h-2 bg-[#0a1a18]/95 border-t border-l border-primary/10 rotate-45 mx-auto -mb-1 relative z-10" />
                                    <div className="bg-[#0a1a18]/95 backdrop-blur-xl border border-primary/10 rounded-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center min-w-[140px]">
                                        {completedInfo ? (
                                            <>
                                                <p className="text-[11px] font-medium text-foreground">{completedInfo.subject}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                                                    {completedInfo.channel === 'sms'
                                                        ? <MessageSquare className="h-2.5 w-2.5" />
                                                        : <Mail className="h-2.5 w-2.5" />
                                                    }
                                                    Skickad {completedInfo.date}
                                                </p>
                                            </>
                                        ) : current ? (
                                            <p className="text-[10px] text-primary/70">Pågående — väntar {step.delayDays} dagar</p>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground/60">Väntar — skickas om {step.delayDays} dagar</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
