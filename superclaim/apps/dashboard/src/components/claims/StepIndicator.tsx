'use client';

import { cn } from "@/lib/utils";

interface StepIndicatorProps {
    currentStep: number;
    totalSteps?: number;
}

const stepLabels = [
    'Skapad',
    'Påminnelse',
    'Uppföljning',
    'Betalplan',
    'Varning',
    'Eskalerat',
];

export function StepIndicator({ currentStep, totalSteps = 6 }: StepIndicatorProps) {
    return (
        <div className="flex items-center w-full gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => {
                const isCompleted = i < currentStep;
                const isCurrent = i === currentStep;
                const isEscalated = i === totalSteps - 1 && currentStep >= totalSteps - 1;

                return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        {/* Step dot + connector */}
                        <div className="flex items-center w-full">
                            {i > 0 && (
                                <div className={cn(
                                    "h-0.5 flex-1 transition-colors",
                                    isCompleted ? "bg-primary" : "bg-[#ffffff10]"
                                )} />
                            )}
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
                            {i < totalSteps - 1 && (
                                <div className={cn(
                                    "h-0.5 flex-1 transition-colors",
                                    i < currentStep ? "bg-primary" : "bg-[#ffffff10]"
                                )} />
                            )}
                        </div>
                        {/* Label */}
                        <span className={cn(
                            "text-[10px] font-medium tracking-wide uppercase transition-colors",
                            isCompleted && "text-primary",
                            isCurrent && "text-primary",
                            !isCompleted && !isCurrent && "text-muted-foreground/50"
                        )}>
                            {stepLabels[i]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
