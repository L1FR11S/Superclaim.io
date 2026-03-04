'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRight, Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
    const router = useRouter()
    const supabase = createClient()

    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)
    const [done, setDone] = useState(false)
    const [validSession, setValidSession] = useState(false)

    useEffect(() => {
        // Supabase sends a hash-based token for password recovery
        // The browser client handles it automatically on load
        supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setValidSession(true)
            }
        })
        // Also check if there's already a session (e.g. email link already exchanged)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setValidSession(true)
        })
    }, [])

    const handleReset = async () => {
        if (!password || !confirm) { toast.error('Fyll i båda fälten'); return }
        if (password !== confirm) { toast.error('Lösenorden matchar inte'); return }
        if (password.length < 8) { toast.error('Lösenordet måste vara minst 8 tecken'); return }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error
            setDone(true)
            toast.success('Lösenord uppdaterat!')
            setTimeout(() => {
                window.location.href = '/login'
            }, 2500)
        } catch (err: any) {
            toast.error(err.message || 'Något gick fel')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#080f0e] flex items-center justify-center p-6">
            {/* Background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[50%] h-[50%] rounded-full bg-primary/6 blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <Image src="/logo.svg" alt="Superclaim" width={28} height={28} className="h-7 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                    <span className="text-lg font-medium tracking-tight">Superclaim<span className="text-primary">.io</span></span>
                </div>

                <div className="rounded-2xl border border-[#ffffff08] bg-[#0d1a18]/60 backdrop-blur-xl p-8 shadow-[0_8px_48px_rgba(0,0,0,0.4)]">
                    {done ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="h-14 w-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto border border-primary/30 shadow-[0_0_24px_rgba(0,229,204,0.3)]">
                                <CheckCircle2 className="h-7 w-7 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold mb-1">Klart!</h2>
                                <p className="text-sm text-muted-foreground">Ditt lösenord är uppdaterat. Du skickas till inloggningen...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="text-center mb-2">
                                <h1 className="text-xl font-semibold">Nytt lösenord</h1>
                                <p className="text-sm text-muted-foreground mt-1">Välj ett starkt lösenord (minst 8 tecken)</p>
                            </div>

                            {!validSession && (
                                <div className="text-xs text-center text-amber-400/80 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
                                    Väntar på återställningslänk... Om du kom hit via e-post bör det fungera direkt.
                                </div>
                            )}

                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Nytt lösenord</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                        <Input
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-9 pr-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 focus:shadow-[0_0_12px_rgba(0,229,204,0.1)] transition-all text-sm"
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                                            {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs text-muted-foreground mb-1.5 block">Bekräfta lösenord</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                                        <Input
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            value={confirm}
                                            onChange={(e) => setConfirm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                                            className="pl-9 h-10 bg-[#0d1a18] border-[#ffffff10] focus:border-primary/40 focus:shadow-[0_0_12px_rgba(0,229,204,0.1)] transition-all text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Button
                                onClick={handleReset}
                                disabled={loading}
                                className="w-full h-10 bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold text-sm shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)] transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Spara nytt lösenord <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>}
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                <a href="/login" className="text-primary/60 hover:text-primary transition-colors">← Tillbaka till inloggning</a>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
