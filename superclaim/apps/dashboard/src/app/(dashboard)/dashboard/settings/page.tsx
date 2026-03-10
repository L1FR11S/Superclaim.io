'use client';

import { useState, useEffect, Suspense } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Copy, Check, Globe, Loader2, Mail, RefreshCw, Link2, Unlink, Download, Settings, Plug, User, CreditCard, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';

const tabs = [
    { id: 'general', label: 'Allmänt', icon: Settings },
    { id: 'integrations', label: 'Integrationer', icon: Plug },
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'billing', label: 'Fakturering', icon: CreditCard },
];

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="animate-pulse h-96 bg-[#ffffff08] rounded-xl" />}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get('tab') || 'general';

    const [emailPreview, setEmailPreview] = useState(true);
    const [smsPreview, setSmsPreview] = useState(true);
    const [smsSenderName, setSmsSenderName] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [inboxId, setInboxId] = useState<string | null>(null);

    // Domain state
    const [domainInput, setDomainInput] = useState('');
    const [domainData, setDomainData] = useState<{ domain: string | null; status: string; records: any[] }>({ domain: null, status: '', records: [] });
    const [domainLoading, setDomainLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Fortnox state
    const [fortnoxConnected, setFortnoxConnected] = useState(false);
    const [fortnoxAutoImport, setFortnoxAutoImport] = useState(false);
    const [fortnoxLastImport, setFortnoxLastImport] = useState<string | null>(null);
    const [fortnoxLoading, setFortnoxLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);

    const [copied, setCopied] = useState(false);
    const webhookUrl = 'https://superclaim.io/api/webhooks/niora';

    useEffect(() => {
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.email_preview !== undefined) setEmailPreview(data.email_preview);
                if (data.sms_preview !== undefined) setSmsPreview(data.sms_preview);
                if (data.sms_sender_name) setSmsSenderName(data.sms_sender_name);
                if (data.agentmail_inbox_id) setInboxId(data.agentmail_inbox_id);
            })
            .catch(() => { })
            .finally(() => setLoading(false));

        fetch('/api/domains')
            .then(res => res.json())
            .then(data => setDomainData({ domain: data.domain, status: data.status || '', records: data.records || [] }))
            .catch(() => { });

        fetch('/api/fortnox/status')
            .then(res => res.json())
            .then(data => {
                setFortnoxConnected(data.connected || false);
                setFortnoxAutoImport(data.autoImport || false);
                if (data.lastImportAt) setFortnoxLastImport(data.lastImportAt);
            })
            .catch(() => { });
    }, []);

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
                body: JSON.stringify({
                    email_preview: emailPreview,
                    sms_preview: smsPreview,
                    sms_sender_name: smsSenderName || undefined,
                    fortnox_auto_import: fortnoxAutoImport,
                }),
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

    const setTab = (id: string) => {
        router.push(`/dashboard/settings?tab=${id}`);
    };

    return (
        <div className="flex gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Sidebar */}
            <div className="w-52 shrink-0">
                <h1 className="text-2xl font-semibold tracking-tight mb-6">Inställningar</h1>
                <nav className="space-y-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setTab(tab.id)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                activeTab === tab.id
                                    ? "bg-primary/10 text-primary border border-primary/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-[#ffffff06]"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-2xl space-y-6">
                {activeTab === 'general' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Allmänt</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Konfigurera agentens grundinställningar</p>
                        </div>

                        {/* SMS Sender Name */}
                        <GlassCard className="p-6">
                            <div className="space-y-3">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <MessageSquare className="h-4 w-4" /> SMS Avsändarnamn
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Visas som avsändare när SMS skickas till gäldenärer. Max 11 tecken, alfanumeriskt.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Input
                                        value={smsSenderName}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^a-zA-Z0-9åäöÅÄÖ ]/g, '').slice(0, 11);
                                            setSmsSenderName(val);
                                        }}
                                        placeholder="DittFöretag"
                                        maxLength={11}
                                        className="bg-[#122220] border-[#ffffff10] font-mono max-w-xs"
                                    />
                                    <span className="text-xs text-muted-foreground">{smsSenderName.length}/11</span>
                                </div>
                                {smsSenderName && (
                                    <p className="text-xs text-primary/60 animate-in fade-in duration-200">
                                        💡 Mottagaren ser &quot;{smsSenderName}&quot; som avsändare istället för ett telefonnummer.
                                    </p>
                                )}
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
                    </>
                )}

                {activeTab === 'integrations' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Integrationer</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Koppla externa tjänster till Superclaim</p>
                        </div>

                        {/* Fortnox */}
                        <GlassCard className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 bg-[#1e7e34]/15 rounded-xl flex items-center justify-center">
                                    <svg className="h-5 w-5 text-[#1e7e34]" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm2 3h10v2H7V8zm0 4h7v2H7v-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-medium">Fortnox</h3>
                                    <p className="text-xs text-muted-foreground">Importera förfallna fakturor automatiskt</p>
                                </div>
                                <div className="ml-auto">
                                    {fortnoxConnected ? (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                            Kopplad
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff08] text-muted-foreground text-xs">
                                            Ej kopplad
                                        </span>
                                    )}
                                </div>
                            </div>

                            {!fortnoxConnected ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Koppla ditt Fortnox-konto för att automatiskt importera förfallna fakturor som inkassoärenden.
                                    </p>
                                    <Button
                                        disabled={fortnoxLoading}
                                        onClick={async () => {
                                            setFortnoxLoading(true);
                                            try {
                                                const res = await fetch('/api/fortnox/connect');
                                                const data = await res.json();
                                                if (!data.url) throw new Error(data.error || 'Kunde inte hämta URL');

                                                const w = 600, h = 700;
                                                const left = window.screenX + (window.innerWidth - w) / 2;
                                                const top = window.screenY + (window.innerHeight - h) / 2;
                                                const popup = window.open(
                                                    data.url,
                                                    'fortnox_oauth',
                                                    `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`
                                                );
                                                const interval = setInterval(() => {
                                                    if (popup?.closed) {
                                                        clearInterval(interval);
                                                        fetch('/api/fortnox/status').then(r => r.json()).then(d => {
                                                            if (d.connected) {
                                                                setFortnoxConnected(true);
                                                                toast.success('Fortnox kopplat! ✅');
                                                            }
                                                        });
                                                    }
                                                }, 500);
                                            } catch (err: any) {
                                                toast.error(err.message || 'Något gick fel');
                                            } finally {
                                                setFortnoxLoading(false);
                                            }
                                        }}
                                        className="bg-[#1e7e34] hover:bg-[#166b29] text-white"
                                    >
                                        {fortnoxLoading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <Link2 className="h-4 w-4 mr-2" />
                                        )}
                                        Koppla Fortnox
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-t border-[#ffffff08]">
                                        <div>
                                            <Label className="text-sm">Automatisk import</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Hämta nya förfallna fakturor automatiskt varje dag</p>
                                        </div>
                                        <button
                                            onClick={() => setFortnoxAutoImport(!fortnoxAutoImport)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${fortnoxAutoImport ? 'bg-[#1e7e34]' : 'bg-[#ffffff15]'
                                                }`}
                                        >
                                            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${fortnoxAutoImport ? 'translate-x-5' : ''
                                                }`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between py-3 border-t border-[#ffffff08]">
                                        <div>
                                            <Label className="text-sm">Importera nu</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {fortnoxLastImport
                                                    ? `Senast: ${new Date(fortnoxLastImport).toLocaleString('sv-SE')}`
                                                    : 'Ingen import gjord ännu'}
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={importLoading}
                                            onClick={async () => {
                                                setImportLoading(true);
                                                try {
                                                    const res = await fetch('/api/fortnox/import', { method: 'POST' });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        toast.success(`Import klar`, {
                                                            description: `${data.imported} nya ärenden importerade, ${data.skipped} redan fanns.`
                                                        });
                                                        setFortnoxLastImport(new Date().toISOString());
                                                    } else {
                                                        toast.error(data.error || 'Import misslyckades');
                                                    }
                                                } catch {
                                                    toast.error('Nätverksfel vid import');
                                                } finally {
                                                    setImportLoading(false);
                                                }
                                            }}
                                            className="border-[#ffffff10] hover:bg-[#1e7e34]/10 hover:text-[#1e7e34] hover:border-[#1e7e34]/30"
                                        >
                                            {importLoading ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <><Download className="h-4 w-4 mr-1" /> Hämta fakturor</>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-t border-[#ffffff08]">
                                        <div>
                                            <Label className="text-sm text-red-400">Koppla från Fortnox</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Tar bort koppling och raderar tokens</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                if (!confirm('Är du säker på att du vill koppla från Fortnox?')) return;
                                                try {
                                                    const res = await fetch('/api/fortnox/disconnect', { method: 'POST' });
                                                    if (res.ok) {
                                                        setFortnoxConnected(false);
                                                        setFortnoxAutoImport(false);
                                                        toast.success('Fortnox frånkopplat');
                                                    } else {
                                                        toast.error('Kunde inte koppla från');
                                                    }
                                                } catch {
                                                    toast.error('Nätverksfel');
                                                }
                                            }}
                                            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                                        >
                                            <Unlink className="h-4 w-4 mr-1" /> Koppla från
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* Niora Webhook */}
                        <GlassCard className="p-6">
                            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Niora Webhook</h3>
                            <p className="text-sm text-muted-foreground mb-3">Klistra in denna URL i Niora för att automatiskt importera betalningar:</p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-[#122220] border border-[#ffffff10] rounded-lg px-4 py-2.5 text-sm font-mono text-primary overflow-x-auto">
                                    {webhookUrl}
                                </code>
                                <Button
                                    size="sm"
                                    onClick={handleCopy}
                                    className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30"
                                >
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </GlassCard>

                        {/* Save for integrations */}
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
                    </>
                )}

                {activeTab === 'profile' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Profil</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Hantera din personliga information</p>
                        </div>

                        <GlassCard className="p-8 text-center">
                            <User className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-muted-foreground/60">Kommer snart</h3>
                            <p className="text-sm text-muted-foreground/40 mt-1">Profilinställningar är på väg. Du kan redan nu ändra din e-post via Supabase.</p>
                        </GlassCard>
                    </>
                )}

                {activeTab === 'billing' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Fakturering</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Hantera din prenumeration och betalning</p>
                        </div>

                        <GlassCard className="p-8 text-center">
                            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                            <h3 className="text-lg font-medium text-muted-foreground/60">Kommer snart</h3>
                            <p className="text-sm text-muted-foreground/40 mt-1">Faktureringsinställningar och prenumerationshantering är under utveckling.</p>
                        </GlassCard>
                    </>
                )}
            </div>
        </div>
    );
}
