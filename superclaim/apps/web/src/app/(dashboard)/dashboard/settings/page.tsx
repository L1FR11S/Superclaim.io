'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Copy, Check, Globe, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
    const [emailPreview, setEmailPreview] = useState(true);
    const [smsPreview, setSmsPreview] = useState(true);
    const [copied, setCopied] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [inboxId, setInboxId] = useState<string | null>(null);

    // Domain state
    const [domainInput, setDomainInput] = useState('');
    const [domainData, setDomainData] = useState<{ domain: string | null; status: string; records: any[] }>({ domain: null, status: '', records: [] });
    const [domainLoading, setDomainLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.email_preview !== undefined) setEmailPreview(data.email_preview);
                if (data.sms_preview !== undefined) setSmsPreview(data.sms_preview);
                if (data.agentmail_inbox_id) setInboxId(data.agentmail_inbox_id);
            })
            .catch(() => { })
            .finally(() => setLoading(false));

        fetch('/api/domains')
            .then(res => res.json())
            .then(data => setDomainData({ domain: data.domain, status: data.status || '', records: data.records || [] }))
            .catch(() => { });
    }, []);

    const webhookUrl = 'https://superclaim.io/api/webhooks/niora';

    const handleCopy = () => {
        navigator.clipboard.writeText(webhookUrl);
        setCopied(true);
        toast.success('Webhook URL kopierad!', {
            description: 'Klistra in i Niora Dashboard → Inställningar → Webhooks',
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_preview: emailPreview, sms_preview: smsPreview }),
            });
            if (res.ok) {
                toast.success('Inställningar sparade ✨');
            } else {
                toast.error('Kunde inte spara');
            }
        } catch {
            toast.error('Nätverksfel');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Inställningar</h1>
                <p className="text-muted-foreground mt-1">Konfigurera agentens grundinställningar.</p>
            </div>

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
                        💡 Du hittar väntande mejl under E-post / SMS i sidomenyn.
                    </p>
                )}
            </GlassCard>

            {/* SMS Preview Toggle */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">SMS-förhandsgranskning</h3>
                        <p className="text-sm text-muted-foreground mt-1">Granska AI-genererade SMS innan de skickas till gäldenärer</p>
                    </div>
                    <button
                        onClick={() => {
                            setSmsPreview(!smsPreview);
                            toast(smsPreview ? 'SMS skickas automatiskt' : 'SMS-förhandsgranskning aktiverad', {
                                description: smsPreview
                                    ? 'AI-agenten skickar SMS automatiskt utan godkännande.'
                                    : 'Alla SMS kräver nu ditt godkännande innan de skickas.',
                            });
                        }}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${smsPreview ? 'bg-primary shadow-[0_0_12px_rgba(0,229,204,0.3)]' : 'bg-[#ffffff15]'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${smsPreview ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
                {smsPreview && (
                    <p className="text-xs text-primary/60 mt-3 animate-in fade-in duration-200">
                        💡 Du hittar väntande SMS under E-post / SMS i sidomenyn.
                    </p>
                )}
            </GlassCard>

            {/* Success Fee */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Success Fee</h3>
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Avgift vid framgångsrik indrivning</p>
                    <span className="text-2xl font-serif italic text-[#f5c842]">9%</span>
                </div>
            </GlassCard>

            {/* Agent E-post */}
            {inboxId && (
                <GlassCard className="p-6">
                    <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Agent E-post</h3>
                    <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-primary" />
                        <div>
                            <p className="text-sm font-mono text-primary">{inboxId}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Din agents unika e-postadress för indrivning</p>
                        </div>
                    </div>
                </GlassCard>
            )}

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

            {/* Custom Domain */}
            <GlassCard className="p-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                    <Globe className="h-4 w-4 inline mr-2" />
                    Egen domän
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Koppla din egen domän för att skicka kravbrev från t.ex. <span className="text-primary font-mono">inkasso@dittforetag.se</span>
                </p>

                {!domainData.domain ? (
                    <div className="flex items-center gap-2">
                        <Input
                            value={domainInput}
                            onChange={(e) => setDomainInput(e.target.value)}
                            placeholder="dittforetag.se"
                            className="bg-[#122220] border-[#ffffff10] font-mono"
                        />
                        <Button
                            onClick={async () => {
                                if (!domainInput.trim()) return;
                                setDomainLoading(true);
                                try {
                                    const res = await fetch('/api/domains', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ domain: domainInput.trim() }),
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                        setDomainData({ domain: domainInput.trim(), status: data.status, records: data.records });
                                        toast.success('Domän registrerad!', { description: 'Lägg till DNS-posterna nedan.' });
                                    } else {
                                        toast.error(data.error || 'Kunde inte registrera domän');
                                    }
                                } catch { toast.error('Nätverksfel'); }
                                finally { setDomainLoading(false); }
                            }}
                            disabled={domainLoading || !domainInput.trim()}
                            className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30"
                        >
                            {domainLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lägg till'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-primary">{domainData.domain}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${domainData.status === 'VERIFIED' || domainData.status === 'ACTIVE'
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                    {domainData.status === 'VERIFIED' || domainData.status === 'ACTIVE' ? '✅ Verifierad' : '⏳ Väntar på DNS'}
                                </span>
                            </div>
                            {domainData.status !== 'VERIFIED' && domainData.status !== 'ACTIVE' && (
                                <Button
                                    size="sm"
                                    onClick={async () => {
                                        setVerifying(true);
                                        try {
                                            const res = await fetch('/api/domains', { method: 'PUT' });
                                            const data = await res.json();
                                            setDomainData(d => ({ ...d, status: data.status, records: data.records || d.records }));
                                            if (data.inbox_id) setInboxId(data.inbox_id);
                                            toast(data.message);
                                        } catch { toast.error('Verifiering misslyckades'); }
                                        finally { setVerifying(false); }
                                    }}
                                    disabled={verifying}
                                    className="bg-primary/20 text-primary hover:bg-primary/30"
                                >
                                    {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verifiera'}
                                </Button>
                            )}
                        </div>

                        {domainData.records.length > 0 && domainData.status !== 'VERIFIED' && domainData.status !== 'ACTIVE' && (
                            <div className="overflow-x-auto">
                                <p className="text-xs text-muted-foreground mb-2">Lägg till dessa DNS-poster i ditt domänhanteringsverktyg:</p>
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-muted-foreground">
                                            <th className="text-left p-2 font-medium">Typ</th>
                                            <th className="text-left p-2 font-medium">Namn</th>
                                            <th className="text-left p-2 font-medium">Värde</th>
                                            <th className="text-left p-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {domainData.records.map((r: any, i: number) => (
                                            <tr key={i} className="border-t border-[#ffffff08]">
                                                <td className="p-2 font-mono text-amber-400">{r.type}</td>
                                                <td className="p-2 font-mono break-all">{r.name}</td>
                                                <td className="p-2 font-mono break-all text-muted-foreground max-w-[200px] truncate">{r.value}</td>
                                                <td className="p-2">
                                                    <span className={`text-xs ${r.status === 'VERIFIED' ? 'text-green-400' : 'text-amber-400'}`}>
                                                        {r.status === 'VERIFIED' ? '✅' : '⏳'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
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
