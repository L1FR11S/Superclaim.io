'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

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
    delayDays?: number; // delay BEFORE this step
}

interface StepIndicatorProps {
    currentStep: number;
    timeline?: TimelineEvent[];
}

// Fallback steps if no flow is saved
const fallbackSteps: DisplayStep[] = [
    { type: 'trigger', label: 'Skapad' },
    { type: 'email', label: 'Påminnelse', delayDays: 3 },
    { type: 'email', label: 'Uppföljning', delayDays: 7 },
    { type: 'sms', label: 'SMS-krav', delayDays: 7 },
    { type: 'email', label: 'Varning', delayDays: 5 },
    { type: 'escalate', label: 'Eskalerat', delayDays: 5 },
];

/**
 * Traverse edges from the trigger node to build an ordered list of steps.
 * Delays are collapsed into the NEXT action step as delayDays.
 */
function extractStepsFromFlow(nodes: FlowNode[], edges: FlowEdge[]): DisplayStep[] {
    if (!nodes || nodes.length === 0) return fallbackSteps;

    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode || !edges || edges.length === 0) {
        // Fallback: just use array order, collapse delays
        return collapseDelays(nodes);
    }

    // Build adjacency map
    const adjMap = new Map<string, string>();
    for (const edge of edges) {
        if (!adjMap.has(edge.source) || edge.sourceHandle === 'no') {
            adjMap.set(edge.source, edge.target);
        }
    }

    // Traverse from trigger in edge order
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

/**
 * Collapse delay nodes into the next action step's delayDays property.
 */
function collapseDelays(nodes: FlowNode[]): DisplayStep[] {
    const steps: DisplayStep[] = [];
    let pendingDelay: number | undefined;

    for (const node of nodes) {
        if (node.type === 'delay') {
            pendingDelay = node.data?.days || 7;
        } else if (node.type === 'condition') {
            // Skip condition nodes in the step indicator
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

    // Match timeline events to steps for hover tooltips
    const getStepInfo = (stepIndex: number): string | null => {
        if (stepIndex >= currentStep) return null;
        const events = timeline.filter(e => e.step === stepIndex && e.direction === 'outbound');
        if (events.length === 0) return null;
        const latest = events[events.length - 1];
        return `${latest.subject}\n${latest.sentAt}`;
    };

    return (
        <div className="flex items-center w-full">
            {steps.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isEscalated = step.type === 'escalate' && i <= currentStep;
                const hoverInfo = getStepInfo(i);

                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Connector + dot row */}
                        <div className="flex items-center w-full">
                            {/* Left connector */}
                            {i > 0 && (
                                <div className="flex-1 flex flex-col items-center relative">
                                    <div className={cn(
                                        "h-0.5 w-full transition-all duration-500",
                                        isCompleted ? "bg-primary" : "bg-[#ffffff10]"
                                    )} />
                                    {/* Delay label on the line */}
                                    {step.delayDays && (
                                        <span className={cn(
                                            "absolute top-1/2 -translate-y-1/2 text-[8px] px-1.5 py-px rounded-full leading-none",
                                            isCompleted
                                                ? "bg-[#0d1a18] text-primary/70"
                                                : "bg-[#0d1a18] text-muted-foreground/40"
                                        )}>
                                            {step.delayDays}d
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Step dot */}
                            <div className={cn(
                                "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                isCompleted && "bg-primary border-primary",
                                isCurrent && "border-primary shadow-[0_0_12px_rgba(0,229,204,0.5)] animate-[pulse-glow_2s_ease-in-out_infinite]",
                                isEscalated && "bg-amber-500 border-amber-500",
                                !isCompleted && !isCurrent && "border-[#ffffff20] bg-transparent"
                            )}>
                                {isCompleted && (
                                    <svg className="h-2.5 w-2.5 text-background" fill="currentColor" viewBox="0 0 12 12">
                                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                                    </svg>
                                )}
                            </div>

                            {/* Right connector */}
                            {i < steps.length - 1 && (
                                <div className={cn(
                                    "h-0.5 flex-1 transition-all duration-500",
                                    i < currentStep ? "bg-primary" : "bg-[#ffffff10]"
                                )} />
                            )}
                        </div>

                        {/* Label */}
                        <span className={cn(
                            "text-[10px] font-medium tracking-wide uppercase transition-colors text-center leading-tight",
                            isCompleted && "text-primary",
                            isCurrent && "text-primary",
                            !isCompleted && !isCurrent && "text-muted-foreground/50"
                        )}>
                            {step.label}
                        </span>

                        {/* Hover tooltip */}
                        {hoverInfo && (
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50">
                                <div className="bg-[#0d1a18]/95 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] whitespace-pre-line text-center min-w-[140px]">
                                    {hoverInfo.split('\n').map((line, j) => (
                                        <p key={j} className={cn(
                                            j === 0 ? "text-xs font-medium text-foreground" : "text-[10px] text-muted-foreground mt-0.5"
                                        )}>
                                            {line}
                                        </p>
                                    ))}
                                </div>
                                <div className="w-2 h-2 bg-[#0d1a18]/95 border-b border-r border-white/10 rotate-45 mx-auto -mt-1" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
