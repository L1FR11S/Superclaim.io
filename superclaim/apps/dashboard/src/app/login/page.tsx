'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { GlassCard } from '@/components/shared/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Mail, Lock, Eye, EyeOff, Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';

    const [isRegister, setIsRegister] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');

    const supabase = createClient();

    const handleEmailAuth = async () => {
        if (!email || !password) {
            toast.error('Fyll i alla fält');
            return;
        }

        setLoading(true);

        try {
            if (isRegister) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { company_name: companyName },
                        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/onboarding`,
                    },
                });

                if (error) throw error;

                if (data.user?.identities?.length === 0) {
                    toast.error('E-postadressen är redan registrerad');
                } else {
                    toast.success('Konto skapat! 🎉', {
                        description: 'Kolla din e-post för verifieringslänk.',
                    });
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) throw error;

                toast.success('Inloggad!');
                router.push(redirectTo);
                router.refresh();
            }
        } catch (err: any) {
            toast.error(err.message || 'Något gick fel');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
            },
        });
        if (error) toast.error(error.message);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
            {/* Animated background glows */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary/6 blur-[150px] animate-[pulse-glow_4s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-15%] right-[15%] w-[40%] h-[40%] rounded-full bg-[#f5c842]/4 blur-[120px] animate-[pulse-glow_6s_ease-in-out_infinite_1s]" />
            </div>

            {/* Grid pattern overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(0,229,204,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,204,0.3) 1px, transparent 1px)',
                    backgroundSize: '60px 60px',
                }}
            />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-[#00b8a3] flex items-center justify-center text-background font-bold text-xl shadow-[0_0_24px_rgba(0,229,204,0.3)]">
                            S
                        </div>
                    </div>
                    <h1 className="text-3xl font-serif italic tracking-tight mb-1">
                        Superclaim<span className="text-primary">.io</span>
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {isRegister ? 'Skapa ditt konto för att komma igång' : 'Logga in på ditt konto'}
                    </p>
                </div>

                {/* Auth Card */}
                <GlassCard glowColor="cyan" className="p-8">
                    <div className="space-y-5">
                        {isRegister && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label className="text-sm text-muted-foreground">Företagsnamn</Label>
                                <div className="relative">
                                    <Zap className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                    <Input
                                        placeholder="Acme Corp AB"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="pl-10 h-12 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/50 focus:shadow-[0_0_12px_rgba(0,229,204,0.15)] transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">E-postadress</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    type="email"
                                    placeholder="namn@foretag.se"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                                    className="pl-10 h-12 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/50 focus:shadow-[0_0_12px_rgba(0,229,204,0.15)] transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Lösenord</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
                                    className="pl-10 pr-10 h-12 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/50 focus:shadow-[0_0_12px_rgba(0,229,204,0.15)] transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {!isRegister && (
                            <div className="text-right">
                                <button className="text-xs text-primary/70 hover:text-primary transition-colors">
                                    Glömt lösenord?
                                </button>
                            </div>
                        )}

                        <Button
                            onClick={handleEmailAuth}
                            disabled={loading}
                            className="w-full h-12 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-base shadow-[0_0_24px_rgba(0,229,204,0.25)] hover:shadow-[0_0_32px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    {isRegister ? 'Skapa konto' : 'Logga in'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>

                        {/* Divider */}
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-[#ffffff08]" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-card px-3 text-muted-foreground/50">eller</span>
                            </div>
                        </div>

                        {/* Google SSO */}
                        <Button
                            onClick={handleGoogleLogin}
                            variant="outline"
                            className="w-full h-12 border-[#ffffff10] bg-[#0d1a18] hover:bg-[#122220] hover:border-[#ffffff20] text-foreground transition-all"
                        >
                            <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Fortsätt med Google
                        </Button>
                    </div>
                </GlassCard>

                {/* Toggle login/register */}
                <p className="text-center mt-6 text-sm text-muted-foreground">
                    {isRegister ? 'Har redan ett konto?' : 'Inget konto ännu?'}{' '}
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                        {isRegister ? 'Logga in' : 'Skapa konto'}
                    </button>
                </p>

                {/* Demo Button */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => {
                            document.cookie = "demo_mode=true; path=/; max-age=86400";
                            toast.success('Demo-läge aktiverat! 🚀');
                            router.push('/dashboard');
                        }}
                        className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-all"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 translate-x-[-100%] animate-[shimmer_2s_infinite] transition-all group-hover:animate-none" />
                        ✨ Vill du bara kika? Testa demot
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>

                <div className="text-center mt-8 flex items-center justify-center gap-4 text-xs text-muted-foreground/40">
                    <span className="flex items-center gap-1">🔒 256-bit SSL</span>
                    <span>•</span>
                    <span>GDPR</span>
                    <span>•</span>
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
            <LoginForm />
        </Suspense>
    );
}
