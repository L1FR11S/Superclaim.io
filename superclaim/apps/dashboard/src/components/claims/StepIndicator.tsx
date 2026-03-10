'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    Zap, Mail, MessageSquare, AlertTriangle, Flag, Check,
    Clock,
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

/* ─── Icon + color config ────────────────────────────── */

const stepConfig: Record<string, { icon: typeof Zap; color: string }> = {
    trigger: { icon: Zap, color: 'text-emerald-400' },
    email: { icon: Mail, color: 'text-cyan-400' },
    sms: { icon: MessageSquare, color: 'text-violet-400' },
    escalate: { icon: AlertTriangle, color: 'text-red-400' },
    end: { icon: Flag, color: 'text-green-400' },
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

    /* tooltip helpers */
    const getCompletedInfo = (stepIndex: number) => {
        const events = timeline.filter(e => e.step === stepIndex && e.direction === 'outbound');
        if (events.length === 0) return null;
        const latest = events[events.length - 1];
        return { subject: latest.subject, date: latest.sentAt, channel: latest.channel };
    };

    const getFutureInfo = (step: DisplayStep) => {
        if (!step.delayDays) return null;
        return `Väntar — skickas om ${step.delayDays} dagar`;
    };

    return (
        <div className="flex items-center w-full">
            {steps.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isFuture = i > currentStep;
                const isEscalated = step.type === 'escalate' && isCompleted;
                const config = stepConfig[step.type] || stepConfig.email;
                const Icon = config.icon;

                const completedInfo = isCompleted ? getCompletedInfo(i) : null;
                const futureInfo = isFuture ? getFutureInfo(step) : null;
                const hasTooltip = completedInfo || futureInfo || (isCurrent && step.delayDays);

                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2.5 group relative">
                        {/* ── Connector + dot row ── */}
                        <div className="flex items-center w-full">
                            {/* Left connector */}
                            {i > 0 && (
                                <div className="flex-1 flex items-center relative">
                                    <div className={cn(
                                        "h-[2px] w-full transition-all duration-700",
                                        (isCompleted || isCurrent)
                                            ? "bg-gradient-to-r from-primary to-primary shadow-[0_0_6px_rgba(0,229,204,0.3)]"
                                            : "bg-[#ffffff08]"
                                    )} />
                                    {/* Delay badge on the line */}
                                    {step.delayDays && (
                                        <span className={cn(
                                            "absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full leading-none font-medium border",
                                            (isCompleted || isCurrent)
                                                ? "bg-[#0a1a18] text-primary/80 border-primary/20"
                                                : "bg-[#0a1a18] text-muted-foreground/30 border-[#ffffff08]"
                                        )}>
                                            <Clock className="h-2 w-2" />
                                            {step.delayDays}d
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Step dot with icon */}
                            <div className={cn(
                                "relative h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0",
                                isCompleted && !isEscalated && "bg-primary/20 border-primary",
                                isCompleted && isEscalated && "bg-amber-500/20 border-amber-500",
                                isCurrent && "border-primary bg-primary/10 shadow-[0_0_16px_rgba(0,229,204,0.4)] animate-[pulse-glow_2s_ease-in-out_infinite]",
                                isFuture && "border-[#ffffff12] bg-[#ffffff04]"
                            )}>
                                {isCompleted ? (
                                    <Check className={cn("h-3.5 w-3.5", isEscalated ? "text-amber-400" : "text-primary")} />
                                ) : (
                                    <Icon className={cn(
                                        "h-3.5 w-3.5 transition-colors",
                                        isCurrent ? config.color : "text-muted-foreground/30"
                                    )} />
                                )}
                            </div>

                            {/* Right connector */}
                            {i < steps.length - 1 && (
                                <div className={cn(
                                    "h-[2px] flex-1 transition-all duration-700",
                                    isCompleted
                                        ? "bg-gradient-to-r from-primary to-primary shadow-[0_0_6px_rgba(0,229,204,0.3)]"
                                        : "bg-[#ffffff08]"
                                )} />
                            )}
                        </div>

                        {/* ── Label ── */}
                        <span className={cn(
                            "text-[10px] font-medium tracking-wide uppercase transition-colors text-center leading-tight max-w-[90px]",
                            isCompleted && "text-primary",
                            isCurrent && "text-primary",
                            isFuture && "text-muted-foreground/40"
                        )}>
                            {step.label}
                        </span>

                        {/* ── Date under completed steps ── */}
                        {completedInfo && (
                            <span className="text-[9px] text-primary/50 -mt-1">
                                {completedInfo.date}
                            </span>
                        )}

                        {/* ── Hover tooltip ── */}
                        {hasTooltip && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200 pointer-events-none z-50">
                                <div className="bg-[#0a1a18]/95 backdrop-blur-xl border border-primary/10 rounded-xl px-3.5 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-center min-w-[160px]">
                                    {completedInfo ? (
                                        <>
                                            <p className="text-xs font-medium text-foreground">{completedInfo.subject}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-center gap-1">
                                                {completedInfo.channel === 'sms'
                                                    ? <MessageSquare className="h-2.5 w-2.5" />
                                                    : <Mail className="h-2.5 w-2.5" />
                                                }
                                                Skickad {completedInfo.date}
                                            </p>
                                        </>
                                    ) : futureInfo ? (
                                        <p className="text-[11px] text-muted-foreground/70">{futureInfo}</p>
                                    ) : isCurrent && step.delayDays ? (
                                        <p className="text-[11px] text-primary/70">Pågående — väntar {step.delayDays} dagar</p>
                                    ) : null}
                                </div>
                                {/* Arrow */}
                                <div className="w-2 h-2 bg-[#0a1a18]/95 border-b border-r border-primary/10 rotate-45 mx-auto -mt-1" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
