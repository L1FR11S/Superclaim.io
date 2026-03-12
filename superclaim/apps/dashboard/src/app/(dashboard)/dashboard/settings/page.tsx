'use client';

import { useState, useEffect, Suspense } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Save, Copy, Check, Globe, Loader2, Mail, Link2, Unlink, Download, FileText,
    Settings, Plug, User, CreditCard, MessageSquare, Building, UserPlus, Trash2, Shield, Eye, EyeOff, Lock, Bell, Lightbulb, Bot
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

const tabs = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'organization', label: 'Organisation', icon: Building },
    { id: 'agent', label: 'Agent', icon: Bot },
    { id: 'channels', label: 'E-post & SMS', icon: Mail },
    { id: 'integrations', label: 'Integrationer', icon: Plug },
    { id: 'billing', label: 'Fakturering', icon: CreditCard },
];

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="animate-pulse h-96 bg-[#ffffff08] rounded-xl" />}>
            <SettingsContent />
        </Suspense>
    );
}

interface Member {
    id: string;
    email: string;
    role: 'admin' | 'member';
    status: 'active' | 'invited';
    first_name?: string;
    last_name?: string;
    created_at: string;
}

function SettingsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get('tab') || 'profile';

    // Profile state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);

    // Password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);

    // General state
    const [emailPreview, setEmailPreview] = useState(true);
    const [smsPreview, setSmsPreview] = useState(true);
    const [smsSenderName, setSmsSenderName] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [inboxId, setInboxId] = useState<string | null>(null);

    // Pre-reminder state
    const [preReminderEnabled, setPreReminderEnabled] = useState(false);
    const [preReminderDays, setPreReminderDays] = useState(5);
    const [preReminderChannels, setPreReminderChannels] = useState<'email' | 'sms' | 'both'>('email');

    // Confirm dialog state
    const [removeMember, setRemoveMember] = useState<{ id: string; email: string } | null>(null);
    const [showFortnoxDisconnect, setShowFortnoxDisconnect] = useState(false);

    // Domain state
    const [domainInput, setDomainInput] = useState('');
    const [domainData, setDomainData] = useState<{ domain: string | null; status: string; records: any[] }>({ domain: null, status: '', records: [] });
    const [domainLoading, setDomainLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Email provider state
    const [emailProvider, setEmailProvider] = useState<'agentmail' | 'google' | 'microsoft' | 'custom_domain'>('agentmail');
    const [emailProviderAddress, setEmailProviderAddress] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [microsoftLoading, setMicrosoftLoading] = useState(false);
    const [connections, setConnections] = useState<{ google?: { email: string } | null; microsoft?: { email: string } | null }>({});

    // Fortnox state
    const [fortnoxConnected, setFortnoxConnected] = useState(false);
    const [fortnoxAutoImport, setFortnoxAutoImport] = useState(false);
    const [fortnoxLastImport, setFortnoxLastImport] = useState<string | null>(null);
    const [fortnoxLoading, setFortnoxLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);

    // Organization state
    const [orgData, setOrgData] = useState({ id: '', name: '', email: '', org_number: '', address: '', postal_code: '', city: '', phone: '' });
    const [orgSaving, setOrgSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    // Members state
    const [members, setMembers] = useState<Member[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        // Profile data from Supabase Auth
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setProfileEmail(user.email || '');
                setFirstName(user.user_metadata?.first_name || '');
                setLastName(user.user_metadata?.last_name || '');
            }
        });

        // Settings
        fetch('/api/settings')
            .then(res => res.json())
            .then(data => {
                if (data.email_preview !== undefined) setEmailPreview(data.email_preview);
                if (data.sms_preview !== undefined) setSmsPreview(data.sms_preview);
                if (data.sms_sender_name) setSmsSenderName(data.sms_sender_name);
                if (data.agentmail_inbox_id) setInboxId(data.agentmail_inbox_id);
                if (data.pre_reminder_enabled !== undefined) setPreReminderEnabled(data.pre_reminder_enabled);
                if (data.pre_reminder_days !== undefined) setPreReminderDays(data.pre_reminder_days);
                if (data.pre_reminder_channels) setPreReminderChannels(data.pre_reminder_channels);
            })
            .catch(() => { })
            .finally(() => setLoading(false));

        // Email provider status
        fetch('/api/email-provider/status')
            .then(res => res.json())
            .then(data => {
                if (data.provider) setEmailProvider(data.provider);
                if (data.address) setEmailProviderAddress(data.address);
                if (data.connections) setConnections(data.connections);
            })
            .catch(() => { });

        // Domain
        fetch('/api/domains')
            .then(res => res.json())
            .then(data => setDomainData({ domain: data.domain, status: data.status || '', records: data.records || [] }))
            .catch(() => { });

        // Organization
        fetch('/api/organization')
            .then(res => res.json())
            .then(data => { if (data.id) setOrgData(d => ({ ...d, ...data })); })
            .catch(() => { });

        // Members
        fetch('/api/members')
            .then(res => res.json())
            .then(data => { if (data.members) setMembers(data.members); })
            .catch(() => { });

        // Fortnox
        fetch('/api/fortnox/status')
            .then(res => res.json())
            .then(data => {
                setFortnoxConnected(data.connected || false);
                setFortnoxAutoImport(data.autoImport || false);
                if (data.lastImportAt) setFortnoxLastImport(data.lastImportAt);
            })
            .catch(() => { });
    }, []);

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({
                data: { first_name: firstName, last_name: lastName },
            });
            if (error) throw error;
            toast.success('Profil uppdaterad ✨');
        } catch (err: any) {
            toast.error(err.message || 'Kunde inte spara');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword.length < 8) {
            toast.error('Lösenordet måste vara minst 8 tecken');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('Lösenorden matchar inte');
            return;
        }
        setPasswordSaving(true);
        try {
            const supabase = createClient();
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            toast.success('Lösenord uppdaterat!');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            toast.error(err.message || 'Kunde inte uppdatera lösenord');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleSaveSettings = async () => {
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
                    pre_reminder_enabled: preReminderEnabled,
                    pre_reminder_days: preReminderDays,
                    pre_reminder_channels: preReminderChannels,
                }),
            });
            if (res.ok) toast.success('Inställningar sparade ✨');
            else toast.error('Kunde inte spara');
        } catch { toast.error('Nätverksfel'); }
        finally { setSaving(false); }
    };

    const handleSaveOrg = async () => {
        setOrgSaving(true);
        try {
            const res = await fetch('/api/organization', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: orgData.name, org_number: orgData.org_number,
                    address: orgData.address, postal_code: orgData.postal_code,
                    city: orgData.city, phone: orgData.phone,
                }),
            });
            if (res.ok) toast.success('Organisation uppdaterad ✨');
            else toast.error('Kunde inte spara');
        } catch { toast.error('Nätverksfel'); }
        finally { setOrgSaving(false); }
    };

    const handleInvite = async () => {
        if (!inviteEmail.trim()) return;
        setInviting(true);
        try {
            const res = await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Inbjudan skickad till ${inviteEmail}`);
                setInviteEmail('');
                setMembers(prev => [...prev, data.member]);
            } else {
                toast.error(data.error || 'Kunde inte bjuda in');
            }
        } catch { toast.error('Nätverksfel'); }
        finally { setInviting(false); }
    };

    const handleRemoveMember = async (id: string, email: string) => {
        setRemoveMember({ id, email });
    };

    const confirmRemoveMember = async () => {
        if (!removeMember) return;
        const { id } = removeMember;
        setRemoveMember(null);
        try {
            const res = await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                setMembers(prev => prev.filter(m => m.id !== id));
                toast.success('Medlem borttagen');
            } else {
                toast.error('Kunde inte ta bort');
            }
        } catch { toast.error('Nätverksfel'); }
    };

    const setTab = (id: string) => router.push(`/dashboard/settings?tab=${id}`);

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

                {/* ───────── PROFIL ───────── */}
                {activeTab === 'profile' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Profil</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Hantera din personliga information</p>
                        </div>

                        <GlassCard className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Förnamn</Label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Förnamn"
                                        className="h-11 bg-black/20 border-white/5 text-foreground placeholder:text-muted-foreground/30"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Efternamn</Label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Efternamn"
                                        className="h-11 bg-black/20 border-white/5 text-foreground placeholder:text-muted-foreground/30"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 mt-6 pt-6 border-t border-[#ffffff08]">
                                <Label className="text-sm text-muted-foreground">E-post</Label>
                                <Input
                                    value={profileEmail}
                                    disabled
                                    className="h-11 bg-black/20 border-white/5 opacity-50 cursor-not-allowed"
                                />
                                <p className="text-xs text-muted-foreground">Inloggnings-e-post kan inte ändras här</p>
                            </div>
                        </GlassCard>

                        <Button
                            onClick={handleSaveProfile}
                            disabled={profileSaving}
                            className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all h-11 px-8 disabled:opacity-50"
                        >
                            {profileSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Spara profil
                        </Button>

                        {/* Password */}
                        <GlassCard className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Lock className="h-4 w-4" /> Byt lösenord
                                </h3>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Nytt lösenord</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Minst 8 tecken"
                                        className="h-11 bg-black/20 border-white/5 pr-10 placeholder:text-muted-foreground/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Bekräfta lösenord</Label>
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Upprepa lösenordet"
                                    className="h-11 bg-black/20 border-white/5 placeholder:text-muted-foreground/30"
                                />
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-xs text-red-400 animate-in fade-in">Lösenorden matchar inte</p>
                                )}
                            </div>
                            <Button
                                onClick={handleChangePassword}
                                disabled={passwordSaving || !newPassword || newPassword !== confirmPassword}
                                variant="outline"
                                className="border-[#ffffff10] hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                            >
                                {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                                Uppdatera lösenord
                            </Button>
                        </GlassCard>
                    </>
                )}

                {/* ───────── ORGANISATION ───────── */}
                {activeTab === 'organization' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Organisation</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Företagsinformation och medlemmar</p>
                        </div>

                        <GlassCard className="p-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Organisationsnamn</Label>
                                <Input value={orgData.name} onChange={(e) => setOrgData(d => ({ ...d, name: e.target.value }))}
                                    placeholder="Ditt Företag AB" className="h-11 bg-black/20 border-white/5 placeholder:text-muted-foreground/30" />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Organisationsnummer</Label>
                                <Input value={orgData.org_number} onChange={(e) => setOrgData(d => ({ ...d, org_number: e.target.value }))}
                                    placeholder="XXXXXX-XXXX" className="h-11 bg-black/20 border-white/5 font-mono placeholder:text-muted-foreground/30" />
                            </div>

                            <div className="space-y-2 mt-6 pt-6 border-t border-[#ffffff08]">
                                <Label className="text-sm text-muted-foreground">Gatuadress</Label>
                                <Input value={orgData.address || ''} onChange={(e) => setOrgData(d => ({ ...d, address: e.target.value }))}
                                    placeholder="Storgatan 1" className="h-11 bg-black/20 border-white/5 placeholder:text-muted-foreground/30" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Postnummer</Label>
                                    <Input value={orgData.postal_code || ''} onChange={(e) => setOrgData(d => ({ ...d, postal_code: e.target.value }))}
                                        placeholder="111 22" className="h-11 bg-black/20 border-white/5 font-mono placeholder:text-muted-foreground/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm text-muted-foreground">Ort</Label>
                                    <Input value={orgData.city || ''} onChange={(e) => setOrgData(d => ({ ...d, city: e.target.value }))}
                                        placeholder="Stockholm" className="h-11 bg-black/20 border-white/5 placeholder:text-muted-foreground/30" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm text-muted-foreground">Telefonnummer</Label>
                                <Input value={orgData.phone || ''} onChange={(e) => setOrgData(d => ({ ...d, phone: e.target.value }))}
                                    placeholder="+46 70 123 45 67" className="h-11 bg-black/20 border-white/5 font-mono placeholder:text-muted-foreground/30" />
                            </div>

                            <div className="space-y-2 mt-6 pt-6 border-t border-[#ffffff08]">
                                <Label className="text-sm text-muted-foreground">Kontakt-e-post</Label>
                                <Input value={orgData.email} disabled
                                    className="h-11 bg-black/20 border-white/5 opacity-50 cursor-not-allowed" />
                                <p className="text-xs text-muted-foreground">Kontot som äger organisationen</p>
                            </div>
                        </GlassCard>

                        {orgData.id && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/40">
                                <span>Organisations-ID: {orgData.id}</span>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(orgData.id);
                                        setCopied(true);
                                        toast.success('ID kopierat!');
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="hover:text-muted-foreground transition-colors"
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                </button>
                            </div>
                        )}

                        <Button
                            onClick={handleSaveOrg}
                            disabled={orgSaving}
                            className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all h-11 px-8 disabled:opacity-50"
                        >
                            {orgSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Spara organisation
                        </Button>

                        {/* Members */}
                        <div className="pt-4 border-t border-[#ffffff08]">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Medlemmar</h3>

                            {members.length > 0 ? (
                                <GlassCard className="divide-y divide-[#ffffff08]">
                                    {members.map((member) => (
                                        <div key={member.id} className="flex items-center justify-between px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                                    {(member.first_name?.[0] || member.email[0]).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {member.first_name && member.last_name
                                                            ? `${member.first_name} ${member.last_name}`
                                                            : member.email}
                                                    </p>
                                                    {member.first_name && (
                                                        <p className="text-xs text-muted-foreground">{member.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={cn(
                                                    "text-xs px-2 py-0.5 rounded-full",
                                                    member.role === 'admin'
                                                        ? "bg-primary/10 text-primary border border-primary/20"
                                                        : "bg-[#ffffff08] text-muted-foreground"
                                                )}>
                                                    {member.role === 'admin' ? 'Admin' : 'Medlem'}
                                                </span>
                                                {member.status === 'invited' && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                        Inbjuden
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleRemoveMember(member.id, member.email)}
                                                    className="p-1 text-muted-foreground/40 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </GlassCard>
                            ) : (
                                <GlassCard className="p-6 text-center">
                                    <p className="text-sm text-muted-foreground/60">Inga medlemmar tillagda ännu</p>
                                </GlassCard>
                            )}

                            {/* Invite */}
                            <div className="mt-4 flex items-center gap-2">
                                <Input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="namn@foretag.se"
                                    className="h-11 bg-black/20 border-white/5 flex-1 placeholder:text-muted-foreground/30"
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                />
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                                    className="h-11 px-4 rounded-md bg-black/20 border border-white/5 text-sm text-foreground"
                                >
                                    <option value="member">Medlem</option>
                                    <option value="admin">Admin</option>
                                </select>
                                <Button
                                    onClick={handleInvite}
                                    disabled={inviting || !inviteEmail.trim()}
                                    className="h-11 bg-primary/20 text-primary hover:bg-primary/30 shrink-0 px-6"
                                >
                                    {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" /> Bjud in</>}
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                {/* ───────── AGENT ───────── */}
                {activeTab === 'agent' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Agent</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Konfigurera hur agenten hanterar ärenden</p>
                        </div>

                        {/* ─── Förvarning ─── */}
                        <GlassCard className="p-6">
                            <div className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <Bell className="h-4 w-4" /> Förvarningspåminnelse
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Skicka en vänlig påminnelse innan fakturan förfaller — kassaflödesoptimering istället för krav.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPreReminderEnabled(!preReminderEnabled)}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                            preReminderEnabled ? 'bg-primary shadow-[0_0_12px_rgba(0,229,204,0.3)]' : 'bg-[#ffffff15]'
                                        }`}
                                    >
                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                            preReminderEnabled ? 'translate-x-6' : 'translate-x-1'
                                        }`} />
                                    </button>
                                </div>

                                {preReminderEnabled && (
                                    <div className="space-y-4 pt-2 border-t border-[#ffffff08] animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <Label className="text-sm text-muted-foreground">Dagar före förfall</Label>
                                            <div className="flex gap-2">
                                                {[3, 5, 7, 10, 14].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setPreReminderDays(d)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                            preReminderDays === d
                                                                ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_8px_rgba(0,229,204,0.15)]'
                                                                : 'bg-[#ffffff06] text-muted-foreground border border-[#ffffff08] hover:border-[#ffffff15]'
                                                        }`}
                                                    >
                                                        {d} dagar
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-muted-foreground/60">
                                                Påminnelsen skickas {preReminderDays} dagar innan förfallodatumet.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm text-muted-foreground">Kanal</Label>
                                            <div className="flex gap-2">
                                                {[
                                                    { value: 'email' as const, icon: <Mail className="h-3.5 w-3.5" />, label: 'E-post' },
                                                    { value: 'sms' as const, icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'SMS' },
                                                    { value: 'both' as const, icon: null, label: '' },
                                                ].map((ch) => (
                                                    <button
                                                        key={ch.value}
                                                        onClick={() => setPreReminderChannels(ch.value)}
                                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                                                            preReminderChannels === ch.value
                                                                ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_8px_rgba(0,229,204,0.15)]'
                                                                : 'bg-[#ffffff06] text-muted-foreground border border-[#ffffff08] hover:border-[#ffffff15]'
                                                        }`}
                                                    >
                                                        {ch.value === 'both' ? (
                                                            <><Mail className="h-3.5 w-3.5" /> + <MessageSquare className="h-3.5 w-3.5" /> Båda</>
                                                        ) : (
                                                            <>{ch.icon} {ch.label}</>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 flex gap-2">
                                            <Lightbulb className="h-4 w-4 text-primary/80 shrink-0 mt-0.5" />
                                            <p className="text-xs text-primary/80">
                                                Exempel: &quot;Hej! Vi vill påminna om att faktura #1234 på 45 000 kr förfaller om {preReminderDays} dagar. Betala gärna i tid så slipper ni extra avgifter.&quot;
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </GlassCard>

                        {/* E-postförhandsgranskning */}
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">E-postförhandsgranskning</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Granska AI-genererade mejl innan de skickas</p>
                                </div>
                                <button
                                    onClick={() => setEmailPreview(!emailPreview)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${emailPreview ? 'bg-primary shadow-[0_0_12px_rgba(0,229,204,0.3)]' : 'bg-[#ffffff15]'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${emailPreview ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </GlassCard>

                        {/* SMS-förhandsgranskning */}
                        <GlassCard className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">SMS-förhandsgranskning</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Granska AI-genererade SMS innan de skickas</p>
                                </div>
                                <button
                                    onClick={() => setSmsPreview(!smsPreview)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${smsPreview ? 'bg-primary shadow-[0_0_12px_rgba(0,229,204,0.3)]' : 'bg-[#ffffff15]'}`}
                                >
                                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${smsPreview ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </GlassCard>

                        <Button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all h-11 px-8 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Spara inställningar
                        </Button>
                    </>
                )}

                {/* ───────── E-POST & SMS ───────── */}
                {activeTab === 'channels' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">E-post & SMS</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Konfigurera e-postkälla och SMS-avsändare</p>
                        </div>

                        {/* ─── E-postkälla ─── */}
                        <GlassCard className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <Mail className="h-4 w-4" /> E-postkälla
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">Välj vilken e-posttjänst agenten använder för att skicka kravmejl</p>
                                </div>

                                <div className="space-y-2">
                                    {/* AgentMail */}
                                    <button
                                        onClick={async () => {
                                            if (emailProvider !== 'agentmail') {
                                                await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email_provider: 'agentmail' }) });
                                                setEmailProvider('agentmail');
                                                setEmailProviderAddress(null);
                                                toast.success('AgentMail vald som e-postkälla');
                                            }
                                        }}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                                            emailProvider === 'agentmail'
                                                ? 'bg-primary/10 border-primary/30 shadow-[0_0_12px_rgba(0,229,204,0.1)]'
                                                : 'bg-[#ffffff04] border-[#ffffff08] hover:border-[#ffffff15]'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                                emailProvider === 'agentmail' ? 'border-primary' : 'border-[#ffffff30]'
                                            }`}>
                                                {emailProvider === 'agentmail' && <div className="h-2 w-2 rounded-full bg-primary" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">AgentMail</p>
                                                <p className="text-xs text-muted-foreground">Standard — mejl skickas från din Superclaim-adress</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Google */}
                                    <div className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        emailProvider === 'google'
                                            ? 'bg-primary/10 border-primary/30 shadow-[0_0_12px_rgba(0,229,204,0.1)]'
                                            : 'bg-[#ffffff04] border-[#ffffff08]'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <button
                                                className="flex items-center gap-3 flex-1 text-left"
                                                onClick={async () => {
                                                    if (connections.google) {
                                                        // Already connected — just switch active provider
                                                        await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email_provider: 'google', email_provider_address: connections.google.email }) });
                                                        setEmailProvider('google');
                                                        setEmailProviderAddress(connections.google.email);
                                                        toast.success('Google vald som e-postkälla');
                                                    }
                                                }}
                                                disabled={!connections.google}
                                            >
                                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                                    emailProvider === 'google' ? 'border-primary' : 'border-[#ffffff30]'
                                                }`}>
                                                    {emailProvider === 'google' && <div className="h-2 w-2 rounded-full bg-primary" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Google Workspace</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {connections.google
                                                            ? <span className="text-primary">{connections.google.email}</span>
                                                            : 'Skicka mejl från din Gmail / Google Workspace'}
                                                    </p>
                                                </div>
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                {connections.google ? (
                                                    <Button
                                                        size="sm" variant="outline"
                                                        onClick={async () => {
                                                            await fetch('/api/email-provider/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'google' }) });
                                                            setConnections(c => ({ ...c, google: null }));
                                                            if (emailProvider === 'google') { setEmailProvider('agentmail'); setEmailProviderAddress(null); }
                                                            toast.success('Google frånkopplad');
                                                        }}
                                                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs"
                                                    >
                                                        <Unlink className="h-3.5 w-3.5 mr-1" /> Koppla från
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        disabled={googleLoading}
                                                        onClick={async () => {
                                                            setGoogleLoading(true);
                                                            try {
                                                                const res = await fetch('/api/email-provider/google/connect');
                                                                const data = await res.json();
                                                                if (data.url) {
                                                                    const w = 600, h = 700;
                                                                    const left = window.screenX + (window.innerWidth - w) / 2;
                                                                    const top = window.screenY + (window.innerHeight - h) / 2;
                                                                    const popup = window.open(data.url, 'google_oauth', `width=${w},height=${h},left=${left},top=${top}`);
                                                                    const interval = setInterval(() => {
                                                                        if (popup?.closed) {
                                                                            clearInterval(interval);
                                                                            fetch('/api/email-provider/status').then(r => r.json()).then(d => {
                                                                                if (d.connections?.google) {
                                                                                    setConnections(c => ({ ...c, google: d.connections.google }));
                                                                                    setEmailProvider('google');
                                                                                    setEmailProviderAddress(d.connections.google.email);
                                                                                    toast.success('Gmail ansluten!');
                                                                                }
                                                                            });
                                                                        }
                                                                    }, 500);
                                                                }
                                                            } catch { toast.error('Kunde inte ansluta Google'); }
                                                            finally { setGoogleLoading(false); }
                                                        }}
                                                        className="bg-primary/20 text-primary hover:bg-primary/30 text-xs"
                                                    >
                                                        {googleLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Link2 className="h-3.5 w-3.5 mr-1" /> Anslut</>}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Microsoft */}
                                    <div className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        emailProvider === 'microsoft'
                                            ? 'bg-primary/10 border-primary/30 shadow-[0_0_12px_rgba(0,229,204,0.1)]'
                                            : 'bg-[#ffffff04] border-[#ffffff08]'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <button
                                                className="flex items-center gap-3 flex-1 text-left"
                                                onClick={async () => {
                                                    if (connections.microsoft) {
                                                        await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email_provider: 'microsoft', email_provider_address: connections.microsoft.email }) });
                                                        setEmailProvider('microsoft');
                                                        setEmailProviderAddress(connections.microsoft.email);
                                                        toast.success('Microsoft vald som e-postkälla');
                                                    }
                                                }}
                                                disabled={!connections.microsoft}
                                            >
                                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                                                    emailProvider === 'microsoft' ? 'border-primary' : 'border-[#ffffff30]'
                                                }`}>
                                                    {emailProvider === 'microsoft' && <div className="h-2 w-2 rounded-full bg-primary" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium">Microsoft 365</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {connections.microsoft
                                                            ? <span className="text-primary">{connections.microsoft.email}</span>
                                                            : 'Skicka mejl från din Outlook / Microsoft 365'}
                                                    </p>
                                                </div>
                                            </button>
                                            <div className="flex items-center gap-1.5">
                                                {connections.microsoft ? (
                                                    <Button
                                                        size="sm" variant="outline"
                                                        onClick={async () => {
                                                            await fetch('/api/email-provider/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'microsoft' }) });
                                                            setConnections(c => ({ ...c, microsoft: null }));
                                                            if (emailProvider === 'microsoft') { setEmailProvider('agentmail'); setEmailProviderAddress(null); }
                                                            toast.success('Microsoft frånkopplad');
                                                        }}
                                                        className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 text-xs"
                                                    >
                                                        <Unlink className="h-3.5 w-3.5 mr-1" /> Koppla från
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        disabled={microsoftLoading}
                                                        onClick={async () => {
                                                            setMicrosoftLoading(true);
                                                            try {
                                                                const res = await fetch('/api/email-provider/microsoft/connect');
                                                                const data = await res.json();
                                                                if (data.url) {
                                                                    const w = 600, h = 700;
                                                                    const left = window.screenX + (window.innerWidth - w) / 2;
                                                                    const top = window.screenY + (window.innerHeight - h) / 2;
                                                                    const popup = window.open(data.url, 'microsoft_oauth', `width=${w},height=${h},left=${left},top=${top}`);
                                                                    const interval = setInterval(() => {
                                                                        if (popup?.closed) {
                                                                            clearInterval(interval);
                                                                            fetch('/api/email-provider/status').then(r => r.json()).then(d => {
                                                                                if (d.connections?.microsoft) {
                                                                                    setConnections(c => ({ ...c, microsoft: d.connections.microsoft }));
                                                                                    setEmailProvider('microsoft');
                                                                                    setEmailProviderAddress(d.connections.microsoft.email);
                                                                                    toast.success('Microsoft 365 ansluten!');
                                                                                }
                                                                            });
                                                                        }
                                                                    }, 500);
                                                                }
                                                            } catch { toast.error('Kunde inte ansluta Microsoft'); }
                                                            finally { setMicrosoftLoading(false); }
                                                        }}
                                                        className="bg-primary/20 text-primary hover:bg-primary/30 text-xs"
                                                    >
                                                        {microsoftLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Link2 className="h-3.5 w-3.5 mr-1" /> Anslut</>}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                                        <p className="text-xs text-muted-foreground mt-0.5">Din agents unika e-postadress</p>
                                    </div>
                                </div>
                            </GlassCard>
                        )}

                        {/* SMS Avsändarnamn */}
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
                                        className="h-11 bg-black/20 border-white/5 font-mono max-w-xs placeholder:text-muted-foreground/30"
                                    />
                                    <span className="text-xs text-muted-foreground">{smsSenderName.length}/11</span>
                                </div>
                                {smsSenderName && (
                                    <p className="text-xs text-primary/60 animate-in fade-in duration-200 flex items-center gap-1.5">
                                        <Lightbulb className="h-3.5 w-3.5 shrink-0" /> Mottagaren ser &quot;{smsSenderName}&quot; som avsändare istället för ett telefonnummer.
                                    </p>
                                )}
                            </div>
                        </GlassCard>

                        {/* Custom Domain */}
                        <GlassCard className="p-6">
                            <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                <Globe className="h-4 w-4 inline mr-2" /> Egen domän
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Koppla din egen domän för att skicka kravbrev från t.ex. <span className="text-primary font-mono">inkasso@dittforetag.se</span>
                            </p>

                            {!domainData.domain ? (
                                <div className="flex items-center gap-2">
                                    <Input value={domainInput} onChange={(e) => setDomainInput(e.target.value)}
                                        placeholder="dittforetag.se" className="h-11 bg-black/20 border-white/5 font-mono placeholder:text-muted-foreground/30" />
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
                                                    toast.success('Domän registrerad!');
                                                } else toast.error(data.error || 'Kunde inte registrera');
                                            } catch { toast.error('Nätverksfel'); }
                                            finally { setDomainLoading(false); }
                                        }}
                                        disabled={domainLoading || !domainInput.trim()}
                                        className="h-11 shrink-0 bg-primary/20 text-primary hover:bg-primary/30 px-6"
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
                                            <Button size="sm"
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
                                            <p className="text-xs text-muted-foreground mb-2">Lägg till dessa DNS-poster:</p>
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

                        <Button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all h-11 px-8 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Spara inställningar
                        </Button>
                    </>
                )}

                {/* ───────── INTEGRATIONER ───────── */}
                {activeTab === 'integrations' && (
                    <>
                        <div>
                            <h2 className="text-lg font-medium">Integrationer</h2>
                            <p className="text-sm text-muted-foreground mt-0.5">Koppla externa tjänster till Superclaim</p>
                        </div>

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
                                            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Kopplad
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffffff08] text-muted-foreground text-xs">Ej kopplad</span>
                                    )}
                                </div>
                            </div>

                            {!fortnoxConnected ? (
                                <div className="space-y-3">
                                    <p className="text-sm text-muted-foreground">Koppla ditt Fortnox-konto för att automatiskt importera förfallna fakturor.</p>
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
                                                const popup = window.open(data.url, 'fortnox_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
                                                const interval = setInterval(() => {
                                                    if (popup?.closed) {
                                                        clearInterval(interval);
                                                        fetch('/api/fortnox/status').then(r => r.json()).then(d => {
                                                            if (d.connected) { setFortnoxConnected(true); toast.success('Fortnox kopplat! ✅'); }
                                                        });
                                                    }
                                                }, 500);
                                            } catch (err: any) { toast.error(err.message); }
                                            finally { setFortnoxLoading(false); }
                                        }}
                                        className="bg-[#1e7e34] hover:bg-[#166b29] text-white"
                                    >
                                        {fortnoxLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                                        Koppla Fortnox
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between py-3 border-t border-[#ffffff08]">
                                        <div>
                                            <Label className="text-sm">Automatisk import</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Hämta nya fakturor automatiskt varje dag</p>
                                        </div>
                                        <button onClick={() => setFortnoxAutoImport(!fortnoxAutoImport)}
                                            className={`relative w-11 h-6 rounded-full transition-colors ${fortnoxAutoImport ? 'bg-[#1e7e34]' : 'bg-[#ffffff15]'}`}>
                                            <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${fortnoxAutoImport ? 'translate-x-5' : ''}`} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-t border-[#ffffff08]">
                                        <div>
                                            <Label className="text-sm">Importera nu</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {fortnoxLastImport ? `Senast: ${new Date(fortnoxLastImport).toLocaleString('sv-SE')}` : 'Ingen import gjord ännu'}
                                            </p>
                                        </div>
                                        <Button size="sm" variant="outline" disabled={importLoading}
                                            onClick={async () => {
                                                setImportLoading(true);
                                                try {
                                                    const res = await fetch('/api/fortnox/import', { method: 'POST' });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        toast.success(`Import klar`, { description: `${data.imported} importerade, ${data.skipped} redan fanns.` });
                                                        setFortnoxLastImport(new Date().toISOString());
                                                    } else toast.error(data.error || 'Import misslyckades');
                                                } catch { toast.error('Nätverksfel'); }
                                                finally { setImportLoading(false); }
                                            }}
                                            className="border-[#ffffff10] hover:bg-[#1e7e34]/10 hover:text-[#1e7e34] hover:border-[#1e7e34]/30"
                                        >
                                            {importLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1" /> Hämta fakturor</>}
                                        </Button>
                                        <Button size="sm" variant="outline"
                                            onClick={async () => {
                                                try {
                                                    toast.info('Hämtar PDF-fakturor...');
                                                    const res = await fetch('/api/fortnox/sync-pdfs', { method: 'POST' });
                                                    const data = await res.json();
                                                    if (res.ok) {
                                                        toast.success(data.message);
                                                    } else toast.error(data.error || 'Synk misslyckades');
                                                } catch { toast.error('Nätverksfel'); }
                                            }}
                                            className="border-[#ffffff10] hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                                        >
                                            <FileText className="h-4 w-4 mr-1" /> Synka PDF
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between py-3 border-t border-[#ffffff08]">
                                        <div>
                                            <Label className="text-sm text-red-400">Koppla från Fortnox</Label>
                                            <p className="text-xs text-muted-foreground mt-0.5">Tar bort koppling och raderar tokens</p>
                                        </div>
                                        <Button size="sm" variant="outline"
                                            onClick={() => setShowFortnoxDisconnect(true)}
                                            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                                        >
                                            <Unlink className="h-4 w-4 mr-1" /> Koppla från
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        <Button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_24px_rgba(0,229,204,0.2)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all h-11 px-8 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Spara inställningar
                        </Button>
                    </>
                )}

                {/* ───────── FAKTURERING ───────── */}
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

            {/* Remove Member Confirm */}
            <ConfirmDialog
                open={!!removeMember}
                onConfirm={confirmRemoveMember}
                onCancel={() => setRemoveMember(null)}
                title={`Ta bort ${removeMember?.email}?`}
                description="Användaren förlorar tillgång till organisationen."
                confirmLabel="Ta bort"
                variant="destructive"
            />

            {/* Fortnox Disconnect Confirm */}
            <ConfirmDialog
                open={showFortnoxDisconnect}
                onConfirm={async () => {
                    setShowFortnoxDisconnect(false);
                    try {
                        const res = await fetch('/api/fortnox/disconnect', { method: 'POST' });
                        if (res.ok) { setFortnoxConnected(false); setFortnoxAutoImport(false); toast.success('Frånkopplat'); }
                        else toast.error('Misslyckades');
                    } catch { toast.error('Nätverksfel'); }
                }}
                onCancel={() => setShowFortnoxDisconnect(false)}
                title="Koppla från Fortnox?"
                description="Alla tokens raderas och synkronisering stoppas."
                confirmLabel="Koppla från"
                variant="warning"
            />
        </div>
    );
}
