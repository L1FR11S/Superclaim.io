'use client'

import { useState, useCallback, useEffect } from 'react'
import { GlassCard } from '@/components/shared/GlassCard'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Check, Building2, Link2, Rocket } from 'lucide-react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { createBrowserClient } from '@supabase/ssr'

import { ProfileStep } from './components/ProfileStep'
import { ChannelsStep } from './components/ChannelsStep'
import { FirstClaimStep } from './components/FirstClaimStep'

const steps = [
    { id: 1, title: 'Profil', icon: Building2, description: 'Företagsinfo och tonalitet' },
    { id: 2, title: 'System', icon: Link2, description: 'Koppla bokföringssystem' },
    { id: 3, title: 'Aktivera', icon: Rocket, description: 'Skapa ditt första ärende' },
]

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1)
    const [loading, setLoading] = useState(false)

    // Company name from registration metadata
    const [companyName, setCompanyName] = useState('')
    const [tone, setTone] = useState<'professional' | 'friendly' | 'direct'>('professional')

    // Step 2 state
    const [preferredErp, setPreferredErp] = useState<string | null>(null)
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
    const [autoSync, setAutoSync] = useState(true)
    const [inboxUsername, setInboxUsername] = useState('')
    const [inboxDisplayName, setInboxDisplayName] = useState('')

    // Step 3 state
    const [activated, setActivated] = useState(false)
    const [inboxId, setInboxId] = useState<string | null>(null)

    const fireConfetti = useCallback(() => {
        const colors = ['#00e5cc', '#f5c842', '#00b8a3', '#ffffff']
        confetti({
            particleCount: 100,
            spread: 100,
            origin: { y: 0.6 },
            colors,
            startVelocity: 30,
            gravity: 0.8,
        })

        const end = Date.now() + 2000
        const frame = () => {
            confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors })
            confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors })
            if (Date.now() < end) requestAnimationFrame(frame)
        }
        frame()
    }, [])

    // Fetch company name from user metadata
    useEffect(() => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
        )
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.user_metadata?.company_name) {
                const name = user.user_metadata.company_name
                setCompanyName(name)
                // Set default inbox username from company name
                const defaultUsername = name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '').slice(0, 30)
                setInboxUsername(defaultUsername)
                setInboxDisplayName(name)
            }
        })
    }, [])

    // Step 1 → Save tone
    const handleStep1Next = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company_name: companyName, tone }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success('Profil sparad!')
            setCurrentStep(2)
        } catch (err: any) {
            toast.error(err.message || 'Kunde inte spara profilen')
        } finally {
            setLoading(false)
        }
    }

    // Step 2 → Save channels
    const handleStep2Next = async () => {
        if (!inboxUsername) { toast.error('Ange ett användarnamn för e-postadressen'); return }
        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/channels', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    preferred_erp: preferredErp,
                    inbox_username: inboxUsername,
                    inbox_display_name: inboxDisplayName || companyName,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            if (data.inbox_id) setInboxId(data.inbox_id)
            toast.success('E-postadress konfigurerad!')
            setCurrentStep(3)
        } catch (err: any) {
            if (err.message?.toLowerCase().includes('already') || err.message?.toLowerCase().includes('taken') || err.message?.toLowerCase().includes('exist')) {
                toast.error('Användarnamnet är redan taget — välj ett annat')
            } else {
                toast.error(err.message || 'Kunde inte konfigurera kanaler')
            }
        } finally {
            setLoading(false)
        }
    }

    // Step 3 → Activate 
    const handleActivate = async () => {
        setLoading(true)
        try {
            // Save default agent flow
            const defaultFlow = {
                nodes: [
                    { id: '1', type: 'trigger', position: { x: 300, y: 0 }, data: { label: 'Nytt ärende skapas' } },
                    { id: '2', type: 'delay', position: { x: 300, y: 120 }, data: { days: 3 } },
                    { id: '3', type: 'email', position: { x: 300, y: 240 }, data: { label: 'Vänlig påminnelse', tone: 'friendly' } },
                    { id: '4', type: 'delay', position: { x: 300, y: 370 }, data: { days: 7 } },
                    { id: '5', type: 'email', position: { x: 300, y: 490 }, data: { label: 'Formell påminnelse', tone: 'professional' } },
                    { id: '6', type: 'delay', position: { x: 300, y: 620 }, data: { days: 7 } },
                    { id: '7', type: 'condition', position: { x: 300, y: 740 }, data: { label: 'Gäldenär svarar?' } },
                    { id: '8', type: 'end', position: { x: 120, y: 920 }, data: { label: 'Avsluta — manuell hantering' } },
                    { id: '9', type: 'sms', position: { x: 480, y: 900 }, data: { label: 'SMS-krav med fakturalänk' } },
                    { id: '10', type: 'delay', position: { x: 480, y: 1030 }, data: { days: 8 } },
                    { id: '11', type: 'email', position: { x: 480, y: 1150 }, data: { label: 'Sista varning', tone: 'direct' } },
                    { id: '12', type: 'delay', position: { x: 480, y: 1280 }, data: { days: 5 } },
                    { id: '13', type: 'escalate', position: { x: 480, y: 1400 }, data: { label: 'Överlämna till inkasso' } },
                ],
                edges: [
                    { id: 'e1-2', source: '1', target: '2', animated: true },
                    { id: 'e2-3', source: '2', target: '3' },
                    { id: 'e3-4', source: '3', target: '4' },
                    { id: 'e4-5', source: '4', target: '5' },
                    { id: 'e5-6', source: '5', target: '6' },
                    { id: 'e6-7', source: '6', target: '7' },
                    { id: 'e7-8', source: '7', sourceHandle: 'yes', target: '8', label: 'Ja', style: { stroke: '#4ade80' } },
                    { id: 'e7-9', source: '7', sourceHandle: 'no', target: '9', label: 'Nej', style: { stroke: '#f87171' } },
                    { id: 'e9-10', source: '9', target: '10' },
                    { id: 'e10-11', source: '10', target: '11' },
                    { id: 'e11-12', source: '11', target: '12' },
                    { id: 'e12-13', source: '12', target: '13' },
                ],
            }

            const settingsRes = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_preview: true, agent_flow: defaultFlow }),
            })
            if (!settingsRes.ok) {
                const d = await settingsRes.json().catch(() => ({}))
                throw new Error(d.error || 'Kunde inte spara inställningar')
            }

            // Mark onboarding as completed (step 3)
            const completeRes = await fetch('/api/onboarding/complete', { method: 'POST' })
            if (!completeRes.ok) {
                const d = await completeRes.json().catch(() => ({}))
                throw new Error(d.error || 'Kunde inte slutföra onboarding')
            }

            setActivated(true)
            fireConfetti()
        } catch (err: any) {
            toast.error(err.message || 'Aktivering misslyckades')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[30%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px] will-change-transform transform-gpu" />
                {activated && (
                    <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] rounded-full bg-primary/15 blur-[120px] animate-in fade-in duration-1000 will-change-transform transform-gpu" />
                )}
            </div>

            <div className="relative z-10 w-full max-w-xl space-y-6">
                {/* Logo */}
                <div className="text-center">
                    <div className="flex justify-center items-center gap-1.5 mb-5">
                        <Image src="/logo.svg" alt="Superclaim" width={28} height={28} className="h-7 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                        <span className="text-xl font-medium tracking-tight">Superclaim<span className="text-primary">.io</span></span>
                    </div>
                    <h1 className="text-2xl font-serif italic tracking-tight">Kom igång</h1>
                    <p className="text-sm text-muted-foreground mt-1">Tre enkla steg till autonom indrivning.</p>
                </div>

                {/* Stepper */}
                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center flex-1">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium shrink-0 transition-all duration-500 ${currentStep > step.id
                                ? 'bg-primary text-background shadow-[0_0_12px_rgba(0,229,204,0.4)]'
                                : currentStep === step.id
                                    ? 'border-2 border-primary text-primary shadow-[0_0_16px_rgba(0,229,204,0.3)]'
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
                <GlassCard glowColor="cyan" className="p-6">
                    {currentStep === 1 && (
                        <ProfileStep
                            companyName={companyName}
                            tone={tone} setTone={setTone}
                            onNext={handleStep1Next} loading={loading}
                        />
                    )}
                    {currentStep === 2 && (
                        <ChannelsStep
                            companyName={companyName}
                            preferredErp={preferredErp} setPreferredErp={setPreferredErp}
                            selectedInvoices={selectedInvoices} setSelectedInvoices={setSelectedInvoices}
                            autoSync={autoSync} setAutoSync={setAutoSync}
                            inboxUsername={inboxUsername} setInboxUsername={setInboxUsername}
                            inboxDisplayName={inboxDisplayName} setInboxDisplayName={setInboxDisplayName}
                            onNext={handleStep2Next} loading={loading}
                        />
                    )}
                    {currentStep === 3 && (
                        <FirstClaimStep
                            companyName={companyName} tone={tone}
                            selectedInvoices={selectedInvoices}
                            onActivate={handleActivate} loading={loading}
                            activated={activated} inboxId={inboxId}
                        />
                    )}
                </GlassCard>

                {/* Skip */}
                {!activated && currentStep < 3 && (
                    <div className="flex justify-center">
                        <Button
                            onClick={() => setCurrentStep(currentStep + 1)}
                            variant="ghost"
                            className="text-xs text-muted-foreground/50 hover:text-muted-foreground hover:bg-transparent"
                        >
                            Hoppa över för nu <ArrowRight className="ml-1.5 h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
