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

interface FlowStep {
    type: string;
    label: string;
}

interface StepIndicatorProps {
    currentStep: number;
    timeline?: TimelineEvent[];
}

// Fallback steps if no flow is saved
const fallbackSteps: FlowStep[] = [
    { type: 'trigger', label: 'Skapad' },
    { type: 'delay', label: '3 dagar' },
    { type: 'email', label: 'Påminnelse' },
    { type: 'delay', label: '7 dagar' },
    { type: 'email', label: 'Uppföljning' },
    { type: 'delay', label: '7 dagar' },
    { type: 'sms', label: 'SMS-krav' },
    { type: 'delay', label: '5 dagar' },
    { type: 'email', label: 'Varning' },
    { type: 'escalate', label: 'Eskalerat' },
];

/**
 * Traverse edges from the trigger node to build an ordered list of steps.
 * Falls back to array order if edges are missing.
 */
function extractStepsFromFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowStep[] {
    if (!nodes || nodes.length === 0) return fallbackSteps;

    // Try to find the trigger node as starting point
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode || !edges || edges.length === 0) {
        // Fallback: just use array order
        return nodes.map(n => ({
            type: n.type || 'email',
            label: n.type === 'delay' ? `${n.data?.days || 7} dagar` : (n.data?.label || n.type || 'Steg'),
        }));
    }

    // Build adjacency map (source → target), preferring "no" handle for conditions (main path)
    const adjMap = new Map<string, string>();
    for (const edge of edges) {
        // For condition nodes, follow the "no" path as the main flow
        if (!adjMap.has(edge.source) || edge.sourceHandle === 'no') {
            adjMap.set(edge.source, edge.target);
        }
    }

    // Traverse from trigger
    const ordered: FlowStep[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = triggerNode.id;

    while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        const node = nodes.find(n => n.id === currentId);
        if (node) {
            ordered.push({
                type: node.type || 'email',
                label: node.type === 'delay'
                    ? `${node.data?.days || 7} dagar`
                    : (node.data?.label || node.type || 'Steg'),
            });
        }
        currentId = adjMap.get(currentId);
    }

    return ordered.length > 0 ? ordered : fallbackSteps;
}

export function StepIndicator({ currentStep, timeline = [] }: StepIndicatorProps) {
    const [steps, setSteps] = useState<FlowStep[]>(fallbackSteps);

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
        <div className="flex items-center w-full gap-1">
            {steps.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isDelay = step.type === 'delay';
                const isEscalated = step.type === 'escalate' && i <= currentStep;
                const hoverInfo = getStepInfo(i);

                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        {/* Step dot + connector */}
                        <div className="flex items-center w-full">
                            {i > 0 && (
                                <div className={cn(
                                    "h-0.5 flex-1 transition-all duration-500",
                                    isCompleted ? "bg-primary" : "bg-[#ffffff10]"
                                )} />
                            )}
                            <div className={cn(
                                "shrink-0 flex items-center justify-center transition-all",
                                isDelay
                                    ? "h-2.5 w-2.5 rounded-full"
                                    : "h-4 w-4 rounded-full border-2",
                                isCompleted && !isDelay && "bg-primary border-primary",
                                isCompleted && isDelay && "bg-primary/60",
                                isCurrent && !isDelay && "border-primary shadow-[0_0_12px_rgba(0,229,204,0.5)] animate-[pulse-glow_2s_ease-in-out_infinite]",
                                isCurrent && isDelay && "bg-primary/40 shadow-[0_0_8px_rgba(0,229,204,0.3)]",
                                isEscalated && "bg-amber-500 border-amber-500",
                                !isCompleted && !isCurrent && !isDelay && "border-[#ffffff20] bg-transparent",
                                !isCompleted && !isCurrent && isDelay && "bg-[#ffffff15]",
                            )}>
                                {isCompleted && !isDelay && (
                                    <svg className="h-2.5 w-2.5 text-background" fill="currentColor" viewBox="0 0 12 12">
                                        <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                                    </svg>
                                )}
                            </div>
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
                            isDelay && "text-[9px] tracking-normal normal-case",
                            isCompleted && "text-primary",
                            isCurrent && "text-primary",
                            !isCompleted && !isCurrent && "text-muted-foreground/50"
                        )}>
                            {step.label}
                        </span>

                        {/* Hover tooltip for completed steps */}
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
                                {/* Arrow */}
                                <div className="w-2 h-2 bg-[#0d1a18]/95 border-b border-r border-white/10 rotate-45 mx-auto -mt-1" />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
