'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Mail, Lock, Eye, EyeOff, Zap, Loader2, TrendingUp, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ── Left panel stats ────────────────────────────────────────────────────────
const stats = [
    { label: 'Genomsnittlig indrivningsgrad', value: '73%', icon: TrendingUp, color: 'text-primary' },
    { label: 'Snitt tid till betalning', value: '18 dagar', icon: Clock, color: 'text-[#f5c842]' },
    { label: 'GDPR-säkrad plattform', value: 'SOC 2', icon: Shield, color: 'text-blue-400' },
];

const testimonial = {
    quote: '"Superclaim har sparat oss hundratals timmar och ökat vår återvinningsgrad med 40%. Det bara funkar."',
    author: 'Erik Lindström',
    role: 'CFO, Fastighetsgruppen AB',
    initials: 'EL',
};

// ── Animated floating orbs ───────────────────────────────────────────────────
function Orbs() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/8 blur-[120px] animate-[pulse_6s_ease-in-out_infinite]" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#f5c842]/5 blur-[100px] animate-[pulse_8s_ease-in-out_infinite_2s]" />
        </div>
    );
}

// ── Mini sparkline (CSS only) ────────────────────────────────────────────────
function MiniSparkline() {
    const points = [30, 45, 35, 60, 50, 75, 65, 85, 72, 90, 78, 95];
    const max = Math.max(...points);
    const min = Math.min(...points);
    const w = 140;
    const h = 32;
    const coords = points.map((p, i) => {
        const x = (i / (points.length - 1)) * w;
        const y = h - ((p - min) / (max - min)) * (h - 6) - 3;
        return `${x},${y}`;
    });
    const d = `M ${coords.join(' L ')}`;

    return (
        <svg width={w} height={h} className="opacity-70">
            <defs>
                <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5cc" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00e5cc" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`${d} L ${w},${h} L 0,${h} Z`} fill="url(#spark-grad)" />
            <path d={d} fill="none" stroke="#00e5cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ filter: 'drop-shadow(0 0 4px rgba(0,229,204,0.5))' }} />
        </svg>
    );
}

// ── Left Panel ───────────────────────────────────────────────────────────────
function LeftPanel() {
    return (
        <div className="hidden md:flex md:w-[42%] relative bg-black/[0.02] flex-col p-6 pl-8 lg:p-8 lg:pl-12 overflow-hidden">
            <Orbs />

            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-[0.025]" style={{
                backgroundImage: 'linear-gradient(rgba(0,229,204,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,204,0.5) 1px, transparent 1px)',
                backgroundSize: '48px 48px',
            }} />

            {/* Logo */}
            <div className="relative z-10 mb-8">
                <div className="flex items-center gap-2">
                    <Image src="/logo.svg" alt="Superclaim" width={28} height={28} className="h-7 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                    <span className="text-lg font-medium tracking-tight">
                        Superclaim<span className="text-primary">.io</span>
                    </span>
                </div>
            </div>

            {/* Center content – vertically centered to match the form */}
            <div className="relative z-10 space-y-6">
                <div>
                    <p className="text-[10px] text-primary/70 uppercase tracking-[0.2em] font-medium mb-2">Autonom inkasso</p>
                    <h2 className="text-2xl lg:text-3xl font-serif italic leading-snug tracking-tight">
                        Din AI-agent som<br />
                        återvinner skulder<br />
                        <span className="text-primary">dygnet runt.</span>
                    </h2>
                </div>

                {/* Stats – compact */}
                <div className="grid grid-cols-1 gap-2.5">
                    {stats.map((s) => (
                        <div key={s.label} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                            <div className="h-7 w-7 rounded-md bg-white/[0.06] flex items-center justify-center shrink-0">
                                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                            </div>
                            <p className="flex-1 text-xs text-muted-foreground truncate">{s.label}</p>
                            <span className={`text-sm font-semibold ${s.color} shrink-0`}>{s.value}</span>
                        </div>
                    ))}
                </div>

                {/* Live chart – compact */}
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-muted-foreground">Indriven summa, senaste 12 mån</p>
                        <span className="text-[10px] text-primary flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5" /> +38%
                        </span>
                    </div>
                    <MiniSparkline />
                </div>
            </div>

            {/* Testimonial */}
            <div className="relative z-10 mt-6">
                <div className="px-4 py-3 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    <p className="text-xs text-muted-foreground leading-relaxed italic mb-2.5">
                        {testimonial.quote}
                    </p>
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary/30 to-[#00b8a3]/30 flex items-center justify-center text-[10px] font-bold text-primary">
                            {testimonial.initials}
                        </div>
                        <div>
                            <p className="text-xs font-medium">{testimonial.author}</p>
                            <p className="text-[10px] text-muted-foreground">{testimonial.role}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Right Panel / Form ───────────────────────────────────────────────────────
function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;

    const [isRegister, setIsRegister] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [orgNumber, setOrgNumber] = useState('');

    const supabase = createClient();

    const handleEmailAuth = async () => {
        if (!email || !password) { toast.error('Fyll i alla fält'); return; }
        setLoading(true);
        try {
            if (isRegister) {
                const { data, error } = await supabase.auth.signUp({
                    email, password,
                    options: {
                        data: { company_name: companyName, org_number: orgNumber },
                        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/onboarding`,
                    },
                });
                if (error) throw error;
                if (data.user?.identities?.length === 0) {
                    toast.error('E-postadressen är redan registrerad');
                } else {
                    toast.success('Konto skapat! 🎉', { description: 'Kolla din e-post för verifieringslänk.' });
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                // Get session tokens and pass them to app.superclaim.io
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
                    const setSessionUrl = new URL(`${appUrl}/auth/set-session`);
                    setSessionUrl.searchParams.set('access_token', session.access_token);
                    setSessionUrl.searchParams.set('refresh_token', session.refresh_token);
                    setSessionUrl.searchParams.set('next', '/dashboard');
                    toast.success('Inloggad!');
                    window.location.href = setSessionUrl.toString();
                } else {
                    toast.error('Kunde inte hämta session');
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Något gick fel');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) { toast.error('Ange din e-postadress ovan'); return; }
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            });
            if (error) throw error;
            setResetSent(true);
        } catch (err: any) {
            toast.error(err.message || 'Kunde inte skicka återställningslänk');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}` },
        });
        if (error) toast.error(error.message);
    };

    return (
        <div className="w-full md:w-[58%] flex items-center justify-center p-8 md:p-12 relative">
            {/* Subtle bg glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/4 blur-[120px] pointer-events-none" />

            {/* Mobile logo only */}
            <div className="absolute top-5 left-5 md:hidden flex items-center gap-2">
                <Image src="/logo.svg" alt="Superclaim" width={24} height={24} className="h-6 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                <span className="text-base font-medium">Superclaim<span className="text-primary">.io</span></span>
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Heading */}
                <div className="mb-6">
                    <h1 className="text-xl font-semibold tracking-tight">
                        {showForgotPassword ? 'Återställ lösenord' : isRegister ? 'Skapa ditt konto' : 'Välkommen tillbaka'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {showForgotPassword
                            ? resetSent ? 'Kolla din e-post! 📬' : 'Vi skickar en länk till din e-post'
                            : isRegister ? 'Kom igång på under 2 minuter'
                                : 'Logga in för att hantera dina ärenden'}
                    </p>
                </div>

                {/* Google */}
                <Button
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full h-10 border-[#ffffff10] bg-[#0d1a18] hover:bg-[#122220] hover:border-primary/20 text-foreground text-sm transition-all mb-5"
                >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Fortsätt med Google
                </Button>

                {/* Divider */}
                <div className="relative mb-5">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#ffffff08]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-3 text-muted-foreground/40">eller med e-post</span>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-3.5">
                    {isRegister && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Företagsnamn</Label>
                                <div className="relative">
                                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                    <Input placeholder="Acme Corp AB" value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="pl-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 focus:shadow-[0_0_12px_rgba(0,229,204,0.1)] transition-all text-sm" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">Organisationsnummer</Label>
                                <Input placeholder="556xxx-xxxx" value={orgNumber}
                                    onChange={(e) => setOrgNumber(e.target.value)}
                                    className="h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 focus:shadow-[0_0_12px_rgba(0,229,204,0.1)] transition-all text-sm" />
                            </div>
                        </div>
                    )}

                    <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">E-postadress</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                            <Input type="email" placeholder="namn@foretag.se" value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                                className="pl-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 focus:shadow-[0_0_12px_rgba(0,229,204,0.1)] transition-all text-sm" />
                        </div>
                    </div>

                    {!showForgotPassword && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <Label className="text-xs text-muted-foreground">Lösenord</Label>
                                {!isRegister && (
                                    <button
                                        onClick={() => setShowForgotPassword(true)}
                                        className="text-xs text-primary/50 hover:text-primary transition-colors"
                                    >
                                        Glömt lösenord?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                                    className="pl-9 pr-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 focus:shadow-[0_0_12px_rgba(0,229,204,0.1)] transition-all text-sm" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {resetSent ? (
                        <div className="text-center py-2 space-y-3">
                            <p className="text-sm text-muted-foreground">Återställningslänk skickad till <span className="text-foreground font-medium">{email}</span></p>
                            <button onClick={() => { setShowForgotPassword(false); setResetSent(false); }} className="text-xs text-primary hover:text-primary/80 transition-colors">
                                ← Tillbaka till inloggning
                            </button>
                        </div>
                    ) : showForgotPassword ? (
                        <div className="space-y-2">
                            <Button onClick={handleForgotPassword} disabled={loading}
                                className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)] transition-all disabled:opacity-50 mt-1">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Skicka återställningslänk <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
                            </Button>
                            <button onClick={() => setShowForgotPassword(false)} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1">
                                ← Tillbaka till inloggning
                            </button>
                        </div>
                    ) : (
                        <Button onClick={handleEmailAuth} disabled={loading}
                            className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:hover:scale-100 mt-1">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{isRegister ? 'Skapa konto' : 'Logga in'} <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
                        </Button>
                    )}
                </div>

                {/* Toggle */}
                <p className="text-center mt-4 text-sm text-muted-foreground">
                    Inget konto ännu?{' '}
                    <a href="/registrera"
                        className="text-primary hover:text-primary/80 font-medium transition-colors">
                        Skapa konto
                    </a>
                </p>

                {/* Demo */}
                <div className="mt-4 flex justify-center">
                    <button
                        onClick={() => {
                            document.cookie = 'demo_mode=true; path=/; max-age=86400';
                            toast.success('Demo-läge aktiverat! 🚀');
                            window.location.href = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;
                        }}
                        className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                    >
                        ✨ Vill du bara kika? Testa demot
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </button>
                </div>

                {/* Trust badges */}
                <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground/25">
                    <span>🔒 256-bit SSL</span>
                    <span>·</span>
                    <span>GDPR</span>
                    <span>·</span>
                    <span>SOC 2</span>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <div className="min-h-screen flex">
                <LeftPanel />
                <LoginForm />
            </div>
        </Suspense>
    );
}
