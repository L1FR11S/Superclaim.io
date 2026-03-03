'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2, Sparkles } from 'lucide-react'

interface TonePreviewProps {
    tone: string
    companyName: string
}

function TonePreview({ tone, companyName }: TonePreviewProps) {
    const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null)
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const generatePreview = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/onboarding/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tone, company_name: companyName }),
            })
            const data = await res.json()
            if (data.subject && data.body) {
                setPreview(data)
                setFetched(true)
            }
        } catch (err) {
            console.error('Preview failed:', err)
        } finally {
            setLoading(false)
        }
    }

    if (!fetched) {
        return (
            <button
                onClick={generatePreview}
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg border border-dashed border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] transition-all text-sm text-primary/70 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Genererar med AI...</>
                ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> Förhandsgranska exempelmejl</>
                )}
            </button>
        )
    }

    return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Email toolbar */}
            <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
                <p className="text-[10px] text-primary/50 uppercase tracking-wider font-medium">AI-genererad förhandsgranskning</p>
                <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-white/[0.06]" />
                    <div className="h-2 w-2 rounded-full bg-white/[0.06]" />
                    <div className="h-2 w-2 rounded-full bg-white/[0.06]" />
                </div>
            </div>
            {/* Email header */}
            <div className="px-4 py-3 border-b border-white/[0.04] space-y-1.5">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/40 w-8 shrink-0">Från</span>
                    <span className="text-xs text-muted-foreground">agent@{companyName.toLowerCase().replace(/\s+/g, '')}.superclaim.io</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/40 w-8 shrink-0">Till</span>
                    <span className="text-xs text-muted-foreground">anna.karlsson@karlssonbygg.se</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/40 w-8 shrink-0">Ämne</span>
                    <span className="text-xs font-medium text-foreground">{preview?.subject}</span>
                </div>
            </div>
            {/* Email body */}
            <div className="px-4 py-3">
                <div className="text-xs text-muted-foreground/80 leading-relaxed whitespace-pre-line">
                    {preview?.body}
                </div>
            </div>
        </div>
    )
}

interface ProfileStepProps {
    companyName: string
    tone: 'professional' | 'friendly' | 'direct'
    setTone: (v: 'professional' | 'friendly' | 'direct') => void
    onNext: () => void
    loading: boolean
}

export function ProfileStep({
    companyName,
    tone, setTone,
    onNext, loading,
}: ProfileStepProps) {
    const tones = [
        { key: 'professional' as const, label: '🏢 Professionell', desc: 'Saklig och formell' },
        { key: 'friendly' as const, label: '😊 Vänlig', desc: 'Empatisk men tydlig' },
        { key: 'direct' as const, label: '⚡ Direkt', desc: 'Rak och koncis' },
    ]

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-xl font-medium mb-1">Välkommen, {companyName || 'ditt företag'}!</h2>
                <p className="text-sm text-muted-foreground">Välj hur din AI-agent ska kommunicera med gäldenärer.</p>
            </div>

            {/* Tone selector */}
            <div className="space-y-3">
                <Label className="text-xs text-muted-foreground block">Tonalitet för påminnelser</Label>
                <div className="grid grid-cols-3 gap-2.5">
                    {tones.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTone(t.key)}
                            className={`p-3 rounded-xl border text-center transition-all ${tone === t.key
                                ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,229,204,0.15)]'
                                : 'border-[#ffffff08] bg-white/[0.02] hover:border-[#ffffff15]'
                                }`}
                        >
                            <span className="text-sm font-medium block">{t.label}</span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">{t.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* AI preview */}
            <TonePreview tone={tone} companyName={companyName} />

            <Button
                onClick={onNext}
                disabled={loading}
                className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)] transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fortsätt'}
            </Button>
        </div>
    )
}
