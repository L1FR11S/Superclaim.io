'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
    Zap, Mail, MessageSquare, Clock, GitBranch, AlertTriangle, Flag,
    Check,
} from 'lucide-react';

interface FlowStep {
    type: string;
    label: string;
    days?: number;
}

interface StepIndicatorProps {
    currentStep: number;
}

const typeConfig: Record<string, { icon: typeof Zap; color: string; activeColor: string }> = {
    trigger: { icon: Zap, color: 'text-muted-foreground/40', activeColor: 'text-emerald-400' },
    email: { icon: Mail, color: 'text-muted-foreground/40', activeColor: 'text-cyan-400' },
    sms: { icon: MessageSquare, color: 'text-muted-foreground/40', activeColor: 'text-violet-400' },
    delay: { icon: Clock, color: 'text-muted-foreground/40', activeColor: 'text-amber-400' },
    condition: { icon: GitBranch, color: 'text-muted-foreground/40', activeColor: 'text-orange-400' },
    escalate: { icon: AlertTriangle, color: 'text-muted-foreground/40', activeColor: 'text-red-400' },
    end: { icon: Flag, color: 'text-muted-foreground/40', activeColor: 'text-green-400' },
};

const activeBgMap: Record<string, string> = {
    trigger: 'bg-emerald-500/15 border-emerald-500/30',
    email: 'bg-cyan-500/15 border-cyan-500/30',
    sms: 'bg-violet-500/15 border-violet-500/30',
    delay: 'bg-amber-500/15 border-amber-500/30',
    condition: 'bg-orange-500/15 border-orange-500/30',
    escalate: 'bg-red-500/15 border-red-500/30',
    end: 'bg-green-500/15 border-green-500/30',
};

const completedBgMap: Record<string, string> = {
    trigger: 'bg-emerald-500/20 border-emerald-500/40',
    email: 'bg-cyan-500/20 border-cyan-500/40',
    sms: 'bg-violet-500/20 border-violet-500/40',
    delay: 'bg-amber-500/20 border-amber-500/40',
    condition: 'bg-orange-500/20 border-orange-500/40',
    escalate: 'bg-red-500/20 border-red-500/40',
    end: 'bg-green-500/20 border-green-500/40',
};

// Fallback steps if no flow is saved
const fallbackSteps: FlowStep[] = [
    { type: 'trigger', label: 'Skapad' },
    { type: 'email', label: 'Påminnelse' },
    { type: 'email', label: 'Uppföljning' },
    { type: 'sms', label: 'SMS-krav' },
    { type: 'email', label: 'Varning' },
    { type: 'escalate', label: 'Eskalerat' },
];

function extractStepsFromFlow(flowNodes: any[]): FlowStep[] {
    if (!flowNodes || flowNodes.length === 0) return fallbackSteps;

    // Filter out delay nodes — they're shown as time between steps
    const actionNodes = flowNodes.filter((n: any) => n.type !== 'delay');

    return actionNodes.map((node: any) => ({
        type: node.type || 'email',
        label: node.data?.label || node.type || 'Steg',
        days: node.data?.days,
    }));
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    const [steps, setSteps] = useState<FlowStep[]>(fallbackSteps);

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                if (data.agent_flow?.nodes?.length > 0) {
                    setSteps(extractStepsFromFlow(data.agent_flow.nodes));
                }
            })
            .catch(() => { });
    }, []);

    return (
        <div className="flex items-center w-full">
            {steps.map((step, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const config = typeConfig[step.type] || typeConfig.email;
                const Icon = config.icon;

                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 relative group">
                        {/* Connector line */}
                        <div className="flex items-center w-full">
                            {i > 0 && (
                                <div className={cn(
                                    "h-[2px] flex-1 transition-all duration-500",
                                    isCompleted ? "bg-gradient-to-r from-primary/80 to-primary" : "bg-[#ffffff08]"
                                )} />
                            )}

                            {/* Step circle with icon */}
                            <div className={cn(
                                "relative h-10 w-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300 shrink-0",
                                isCompleted && `${completedBgMap[step.type] || 'bg-primary/20 border-primary/40'}`,
                                isCurrent && `${activeBgMap[step.type] || 'bg-primary/15 border-primary/30'} shadow-[0_0_16px_rgba(0,229,204,0.2)] animate-[pulse-glow_2s_ease-in-out_infinite]`,
                                !isCompleted && !isCurrent && "border-[#ffffff08] bg-[#ffffff03]"
                            )}>
                                {isCompleted ? (
                                    <Check className={cn("h-4 w-4", config.activeColor)} />
                                ) : (
                                    <Icon className={cn(
                                        "h-4 w-4 transition-colors",
                                        isCurrent ? config.activeColor : config.color
                                    )} />
                                )}
                            </div>

                            {i < steps.length - 1 && (
                                <div className={cn(
                                    "h-[2px] flex-1 transition-all duration-500",
                                    i < currentStep ? "bg-gradient-to-r from-primary to-primary/80" : "bg-[#ffffff08]"
                                )} />
                            )}
                        </div>

                        {/* Label */}
                        <span className={cn(
                            "text-[10px] font-medium tracking-wide uppercase transition-colors text-center leading-tight max-w-[80px]",
                            isCompleted && config.activeColor,
                            isCurrent && config.activeColor,
                            !isCompleted && !isCurrent && "text-muted-foreground/40"
                        )}>
                            {step.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
