'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [tone, setTone] = useState<'professional' | 'friendly' | 'direct'>('professional');
    const [delays, setDelays] = useState({ step1: 3, step2: 7, step3: 7, step4: 8 });
    const [smsEnabled, setSmsEnabled] = useState(false);
    const [emailPreview, setEmailPreview] = useState(true);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);

    const webhookUrl = 'https://superclaim.io/api/webhooks/niora';

    const handleCopy = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        toast.success('Webhook URL kopierad!', {
            description: 'Klistra in i Niora Dashboard → Inställningar → Webhooks',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        setSaving(true);
        setTimeout(() => {
            setSaving(false);
            toast.success('Inställningar sparade ✨', {
                description: 'AI-agentens beteende har uppdaterats.',
            });
        }, 800);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Inställningar</h1>
                <p className="text-muted-foreground mt-1">Konfigurera hur AI-agenten kommunicerar.</p>
            </div>

            {/* AI Tone */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">AI-ton</h3>
                <p className="text-sm text-muted-foreground mb-4">Bestäm vilken tonalitet agenten använder i indrivningskommunikation.</p>
                <div className="grid grid-cols-3 gap-3">
                    {(['professional', 'friendly', 'direct'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => {
                                setTone(t);
                                toast('Ton ändrad', {
                                    description: `${t === 'professional' ? 'Professionell' : t === 'friendly' ? 'Vänlig' : 'Direkt'} ton vald. Spara för att aktivera.`,
                                });
                            }}
                            className={`p-4 rounded-xl border text-left transition-all ${tone === t
                                ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,229,204,0.15)]'
                                : 'border-[#ffffff08] bg-[#122220]/50 hover:border-[#ffffff15]'
                                }`}
                        >
                            <span className="text-sm font-medium capitalize block mb-1">
                                {t === 'professional' ? '🏢 Professionell' : t === 'friendly' ? '😊 Vänlig' : '⚡ Direkt'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {t === 'professional' ? 'Formell och affärsmässig' : t === 'friendly' ? 'Empatisk och personlig' : 'Tydlig och koncis'}
                            </span>
                        </button>
                    ))}
                </div>
            </GlassCard>

            {/* Step Delays */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Stegfördröjningar</h3>
                <p className="text-sm text-muted-foreground mb-4">Antal dagar mellan varje automatiskt steg i indrivningsprocessen.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(delays).map(([key, value]) => (
                        <div key={key}>
                            <Label className="text-xs text-muted-foreground mb-2 block">
                                {key === 'step1' ? 'Steg 1 → 2' : key === 'step2' ? 'Steg 2 → 3' : key === 'step3' ? 'Steg 3 → 4' : 'Steg 4 → 5'}
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={value}
                                    onChange={(e) => setDelays({ ...delays, [key]: parseInt(e.target.value) || 0 })}
                                    className="bg-[#122220] border-[#ffffff10] text-center"
                                    min={1}
                                    max={30}
                                />
                                <span className="text-xs text-muted-foreground shrink-0">dagar</span>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* Success Fee */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Success Fee</h3>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Avgift vid framgångsrik indrivning</p>
                    <span className="text-2xl font-serif italic text-[#f5c842]">9%</span>
                </div>
            </GlassCard>

            {/* SMS Toggle */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">SMS-notiser</h3>
                        <p className="text-sm text-muted-foreground mt-1">Skicka SMS-påminnelser utöver e-post</p>
                    </div>
                    <button
                        onClick={() => {
                            setSmsEnabled(!smsEnabled);
                            toast(smsEnabled ? 'SMS avstängt' : 'SMS aktiverat', {
                                description: smsEnabled ? 'Påminnelser skickas nu enbart via e-post.' : 'SMS-påminnelser är nu aktiva. Spara för att bekräfta.',
                            });
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${smsEnabled ? 'bg-primary shadow-[0_0_12px_rgba(0,229,204,0.3)]' : 'bg-[#ffffff15]'
                            }`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${smsEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                    </button>
                </div>
            </GlassCard>

            {/* Email Preview Toggle */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">E-postförhandsgranskning</h3>
                        <p className="text-sm text-muted-foreground mt-1">Granska AI-genererade mejl innan de skickas till gäldenärer</p>
                    </div>
                    <button
                        onClick={() => {
                            setEmailPreview(!emailPreview);
                            toast(emailPreview ? 'Automatiskt skickläge aktiverat' : 'Förhandsgranskning aktiverad', {
                                description: emailPreview
                                    ? 'AI-agenten skickar mejl automatiskt utan godkännande.'
                                    : 'Alla mejl kräver nu ditt godkännande innan de skickas.',
                            });
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${emailPreview ? 'bg-primary shadow-[0_0_12px_rgba(0,229,204,0.3)]' : 'bg-[#ffffff15]'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${emailPreview ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                {emailPreview && (
                    <p className="text-xs text-primary/60 mt-3 animate-in fade-in duration-200">
                        💡 Du hittar väntande mejl under E-post i sidomenyn.
                    </p>
                )}
            </GlassCard>

            {/* Niora Config */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Niora-integration</h3>
                <div className="space-y-4">
                    <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">Webhook URL</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={webhookUrl}
                                className="bg-[#122220] border-[#ffffff10] text-muted-foreground font-mono text-sm"
                            />
                            <Button variant="ghost" size="sm" onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-primary">
                                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">API-nyckel</Label>
                        <Input
                            type="password"
                            placeholder="niora_sk_..."
                            className="bg-[#122220] border-[#ffffff10]"
                        />
                    </div>
                </div>
            </GlassCard>

            {/* Save */}
            <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all h-12 px-8 disabled:opacity-50"
            >
                {saving ? (
                    <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        Sparar...
                    </div>
                ) : (
                    <>
                        <Save className="h-4 w-4 mr-2" /> Spara inställningar
                    </>
                )}
            </Button>
        </div>
    );
}
