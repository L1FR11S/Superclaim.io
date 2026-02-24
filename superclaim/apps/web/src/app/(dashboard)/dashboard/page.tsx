'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Sparkline } from '@/components/shared/Sparkline';
import { useRouter } from 'next/navigation';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface Claim {
    id: string;
    debtor_name: string;
    amount: number;
    currency: string;
    due_date: string;
    days_overdue: number;
    current_step: number;
    status: 'active' | 'paid' | 'escalated' | 'cancelled';
}

interface DashboardData {
    claims: Claim[];
    kpis: {
        totalOutstanding: number;
        activeClaims: number;
        totalCollected: number;
    };
    source: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        fetch('/api/claims')
            .then(res => res.json())
            .then(setData)
            .catch(() => { });
    }, []);

    if (!data) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="h-8 w-48 bg-[#ffffff08] rounded animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-[#ffffff08] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    // Sort claims to show most recent/urgent first, take top 5
    const recentClaims = [...data.claims]
        .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
        .slice(0, 5);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Översikt</h1>
                    <p className="text-muted-foreground mt-1">Här är den senaste statusen för dina indrivningar.</p>
                </div>
                {data.source === 'mock' && (
                    <span className="text-xs text-muted-foreground bg-[#ffffff08] px-3 py-1 rounded-full">Demodata</span>
                )}
            </div>

            {/* KPI Cards with Sparklines */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard glowColor="cyan" className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Totalt utestående</p>
                            <p className="text-3xl font-semibold font-serif italic text-white flex items-baseline gap-2">
                                {data.kpis?.totalOutstanding?.toLocaleString('sv-SE') || 0} <span className="text-lg text-muted-foreground font-sans not-italic">SEK</span>
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingDown className="h-3 w-3 text-primary" />
                                <span className="text-xs text-primary font-medium">−12%</span>
                                <span className="text-xs text-muted-foreground">vs förra mån</span>
                            </div>
                        </div>
                        <Sparkline data={[320, 280, 310, 295, 260, 248, 248]} color="#00e5cc" />
                    </div>
                </GlassCard>

                <GlassCard glowColor="cyan" className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Under indrivning</p>
                            <p className="text-3xl font-semibold font-serif italic text-white">
                                {data.kpis?.activeClaims || 0} <span className="text-lg text-muted-foreground font-sans not-italic">ärenden</span>
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="h-3 w-3 text-amber-400" />
                                <span className="text-xs text-amber-400 font-medium">+3</span>
                                <span className="text-xs text-muted-foreground">nya denna vecka</span>
                            </div>
                        </div>
                        <Sparkline data={[5, 7, 8, 9, 11, 10, 12]} color="#00e5cc" />
                    </div>
                </GlassCard>

                <GlassCard glowColor="gold" className="p-6">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">Indriven summa (30d)</p>
                            <p className="text-3xl font-semibold font-serif italic text-[#f5c842] flex items-baseline gap-2">
                                {data.kpis?.totalCollected?.toLocaleString('sv-SE') || 0} <span className="text-lg text-muted-foreground font-sans not-italic">SEK</span>
                            </p>
                            <div className="flex items-center gap-1 mt-2">
                                <TrendingUp className="h-3 w-3 text-[#f5c842]" />
                                <span className="text-xs text-[#f5c842] font-medium">+28%</span>
                                <span className="text-xs text-muted-foreground">vs förra mån</span>
                            </div>
                        </div>
                        <Sparkline data={[12, 18, 22, 28, 32, 38, 45]} color="#f5c842" />
                    </div>
                </GlassCard>
            </div>

            {/* Claims Table */}
            <GlassCard className="mt-8 rounded-xl overflow-hidden border-[#ffffff08]">
                <div className="p-6 border-b border-[#ffffff08] flex items-center justify-between">
                    <h3 className="text-lg font-medium tracking-tight">Senaste Ärenden</h3>
                    <button
                        onClick={() => router.push('/dashboard/claims')}
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                        Visa alla →
                    </button>
                </div>

                <Table>
                    <TableHeader className="bg-[#122220]">
                        <TableRow className="border-[#ffffff08] hover:bg-transparent">
                            <TableHead className="text-muted-foreground py-4 px-6 font-medium">Gäldenär</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Belopp</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Förfall</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Försenad</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Steg</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentClaims.map((claim) => {
                            const dueDateStr = new Date(claim.due_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
                            return (
                                <TableRow
                                    key={claim.id}
                                    className="border-[#ffffff08] hover:bg-primary/5 transition-colors cursor-pointer"
                                    onClick={() => router.push(`/dashboard/claims/${claim.id}`)}
                                >
                                    <TableCell className="px-6 py-4 font-medium">{claim.debtor_name}</TableCell>
                                    <TableCell>{claim.amount.toLocaleString('sv-SE')} {claim.currency}</TableCell>
                                    <TableCell className={claim.status === 'paid' ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                                        {dueDateStr}
                                    </TableCell>
                                    <TableCell>{claim.days_overdue > 0 ? `${claim.days_overdue} dagar` : '-'}</TableCell>
                                    <TableCell>
                                        {claim.current_step > 0 ? (
                                            <div className="flex items-center gap-2">
                                                <span className={`h-2 w-2 rounded-full ${claim.current_step <= 2 ? 'bg-primary animate-pulse' : 'bg-[#f59e0b]'
                                                    }`} />
                                                Steg {claim.current_step}
                                            </div>
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={claim.status} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {recentClaims.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                    Inga ärenden hittades.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </GlassCard>
        </div>
    );
}
