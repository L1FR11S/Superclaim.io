'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { GlassCard } from '@/components/shared/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Building2, Hash, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createBrowserClient } from '@supabase/ssr'

function RegisterForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const [companyName, setCompanyName] = useState('')
    const [orgNumber, setOrgNumber] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const handleRegister = async () => {
        if (!companyName.trim()) { toast.error('Ange företagsnamn'); return }
        if (!email || !password) { toast.error('Fyll i alla fält'); return }
        if (password.length < 6) { toast.error('Lösenord måste vara minst 6 tecken'); return }

        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { company_name: companyName, org_number: orgNumber },
                    emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=/onboarding`,
                },
            })
            if (error) throw error

            if (data.user?.identities?.length === 0) {
                toast.error('E-postadressen är redan registrerad')
            } else if (data.user) {
                // Nytt konto — spara org direkt i organizations-tabellen
                await fetch('/api/onboarding/setup-org', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: data.user.id,
                        email: data.user.email,
                        company_name: companyName,
                        org_number: orgNumber || null,
                    }),
                })

                if (data.session) {
                    toast.success('Konto skapat! 🎉')
                    router.push('/onboarding')
                } else {
                    toast.success('Konto skapat! 🎉', {
                        description: 'Kolla din e-post för verifieringslänk.',
                    })
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Något gick fel')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignup = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback?redirectTo=/onboarding` },
        })
        if (error) toast.error(error.message)
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
            {/* Background glow */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-15%] left-[30%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[20%] w-[30%] h-[30%] rounded-full bg-primary/5 blur-[80px]" />
            </div>

            <div className="relative z-10 w-full max-w-md space-y-6">
                {/* Logo */}
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center gap-1.5 mb-6">
                        <Image src="/logo.svg" alt="Superclaim" width={28} height={28} className="h-7 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                        <span className="text-xl font-medium tracking-tight">Superclaim<span className="text-primary">.io</span></span>
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight">Skapa konto</h1>
                    <p className="text-sm text-muted-foreground mt-1">Kom igång med autonom inkasso på under 3 minuter.</p>
                </div>

                <GlassCard glowColor="cyan" className="p-6">
                    {/* Google */}
                    <Button
                        onClick={handleGoogleSignup}
                        variant="outline"
                        className="w-full h-10 border-[#ffffff10] bg-[#0d1a18] hover:bg-[#122220] hover:border-primary/20 text-foreground text-sm transition-all mb-4"
                    >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                        Fortsätt med Google
                    </Button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.06]" /></div>
                        <div className="relative flex justify-center text-[10px]"><span className="bg-transparent px-3 text-muted-foreground/40">eller registrera med e-post</span></div>
                    </div>

                    <div className="space-y-3">
                        {/* Company name */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Företagsnamn *</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                <Input placeholder="Acme Corp AB" value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="pl-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 transition-all text-sm" />
                            </div>
                        </div>

                        {/* Org number */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Organisationsnummer</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                <Input placeholder="556xxx-xxxx" value={orgNumber}
                                    onChange={(e) => setOrgNumber(e.target.value)}
                                    className="pl-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 transition-all text-sm" />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">E-postadress *</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                <Input type="email" placeholder="namn@foretag.se" value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 transition-all text-sm" />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1.5 block">Lösenord *</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                    className="pl-9 pr-10 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 transition-all text-sm" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            </div>
                        </div>

                        <Button onClick={handleRegister} disabled={loading}
                            className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 mt-1">
                            {loading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <>Skapa konto <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                            }
                        </Button>
                    </div>

                    <p className="text-center mt-4 text-sm text-muted-foreground">
                        Har du redan ett konto?{' '}
                        <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                            Logga in
                        </Link>
                    </p>
                </GlassCard>

                {/* Trust badges */}
                <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/25">
                    <span>🔒 256-bit SSL</span>
                    <span>·</span>
                    <span>GDPR</span>
                    <span>·</span>
                    <span>SOC 2</span>
                </div>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    )
}
