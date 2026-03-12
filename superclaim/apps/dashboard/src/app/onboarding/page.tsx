'use client';

import { useState, useCallback } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Zap, Settings, Rocket } from 'lucide-react';
import confetti from 'canvas-confetti';

const steps = [
    { id: 1, title: 'Koppla Niora', icon: Zap, description: 'Anslut ditt Niora-konto för att automatiskt synka obetalda fakturor.' },
    { id: 2, title: 'Inställningar', icon: Settings, description: 'Ange din föredragna ton och timing för AI-kommunikation.' },
    { id: 3, title: 'Aktivera', icon: Rocket, description: 'Bekräfta och starta din autonoma indrivningsagent.' },
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [tone, setTone] = useState<'professional' | 'friendly' | 'direct'>('professional');
    const [activated, setActivated] = useState(false);

    const fireConfetti = useCallback(() => {
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ['#00e5cc', '#f5c842', '#00b8a3', '#ffffff'];

        const frame = () => {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0, y: 0.7 },
                colors,
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1, y: 0.7 },
                colors,
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        // Big burst first
        confetti({
            particleCount: 100,
            spread: 100,
            origin: { y: 0.6 },
            colors,
            startVelocity: 30,
            gravity: 0.8,
        });

        frame();
    }, []);

    const handleActivate = () => {
        setActivated(true);
        fireConfetti();
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            {/* Optimized Background glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[30%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] will-change-transform transform-gpu" />
                {activated && (
                    <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] rounded-full bg-primary/15 blur-[120px] animate-in fade-in duration-1000 will-change-transform transform-gpu" />
                )}
            </div>

            <div className="relative z-10 w-full max-w-2xl space-y-8">
                {/* Logo */}
                <div className="text-center">
                    <div className="flex justify-center items-center gap-1 mb-6">
                        <Image src="/logo.svg" alt="S" width={28} height={28} className="h-7 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                        <span className="text-xl font-medium tracking-tight">Superclaim<span className="text-primary">.io</span></span>
                    </div>
                    <h1 className="text-3xl font-serif italic tracking-tight">Kom igång</h1>
                    <p className="text-muted-foreground mt-2">Tre enkla steg till autonom indrivning.</p>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium shrink-0 transition-all duration-500 ${currentStep > step.id
                                ? 'bg-primary text-background shadow-[0_0_12px_rgba(0,229,204,0.4)]'
                                : currentStep === step.id
                                    ? 'border-2 border-primary text-primary shadow-[0_0_16px_rgba(0,229,204,0.4)] animate-[pulse-glow_2s_ease-in-out_infinite] will-change-transform transform-gpu'
                                    : 'border border-[#ffffff15] text-muted-foreground'
                                }`}>
                                {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`h-px flex-1 mx-2 transition-all duration-700 ${currentStep > step.id ? 'bg-primary shadow-[0_0_4px_rgba(0,229,204,0.5)]' : 'bg-[#ffffff10]'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <GlassCard glowColor="cyan" className="p-8">
                    {!activated ? (
                        <>
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-medium mb-2">{steps[currentStep - 1].title}</h2>
                                <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
                            </div>

                            {currentStep === 1 && (
                                <div className="flex flex-col items-center gap-4">
                                    <Button className="h-14 px-8 bg-gradient-to-r from-primary to-[#00b8a3] text-background text-lg font-semibold shadow-[0_0_24px_rgba(0,229,204,0.3)] hover:shadow-[0_0_32px_rgba(0,229,204,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                                        <Zap className="mr-2 h-5 w-5" /> Koppla med Niora
                                    </Button>
                                    <p className="text-xs text-muted-foreground">Du kommer omdirigeras till Niora för att godkänna åtkomst.</p>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground text-center">Välj tonalitet för AI-agenten:</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(['professional', 'friendly', 'direct'] as const).map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTone(t)}
                                                className={`p-4 rounded-xl border text-center transition-all ${tone === t
                                                    ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,229,204,0.15)]'
                                                    : 'border-[#ffffff08] bg-[#122220]/50 hover:border-[#ffffff15]'
                                                    }`}
                                            >
                                                <span className="text-sm font-medium capitalize block">
                                                    {t === 'professional' ? '🏢 Professionell' : t === 'friendly' ? '😊 Vänlig' : '⚡ Direkt'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="flex flex-col items-center gap-4">
                                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 animate-[pulse-glow_2s_ease-in-out_infinite] will-change-transform transform-gpu">
                                        <Rocket className="h-10 w-10 text-primary animate-pulse" />
                                    </div>
                                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                                        Din AI-agent är redo. Obetalda fakturor hämtas automatiskt och indrivningsprocessen startar direkt.
                                    </p>
                                    <Button
                                        onClick={handleActivate}
                                        className="h-14 px-8 bg-gradient-to-r from-primary to-[#00b8a3] text-background text-lg font-semibold shadow-[0_0_24px_rgba(0,229,204,0.3)] hover:shadow-[0_0_32px_rgba(0,229,204,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        🎉 Aktivera agenten
                                    </Button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-6 py-4 animate-in fade-in zoom-in-95 duration-500">
                            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_32px_rgba(0,229,204,0.3)]">
                                <Check className="h-12 w-12 text-primary" />
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-serif italic mb-2">Agenten är aktiverad! 🚀</h2>
                                <p className="text-muted-foreground max-w-sm">
                                    Din autonoma indrivningsagent arbetar nu. Du kan följa framstegen i din dashboard.
                                </p>
                            </div>
                            <Button
                                onClick={() => window.location.href = '/dashboard'}
                                className="h-12 px-8 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.3)] hover:scale-[1.02] transition-all"
                            >
                                Gå till Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </GlassCard>

                {/* Navigation */}
                {!activated && currentStep < 3 && (
                    <div className="flex justify-end">
                        <Button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            variant="ghost"
                            className="text-primary hover:bg-primary/10"
                        >
                            {currentStep === 1 ? 'Hoppa över (demo)' : 'Nästa'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
