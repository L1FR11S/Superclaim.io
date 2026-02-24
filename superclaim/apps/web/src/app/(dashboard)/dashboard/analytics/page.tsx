'use client';

import { useState, useEffect, useRef } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Sparkline } from '@/components/shared/Sparkline';
import { TrendingUp, Clock, Target, Banknote, BarChart3 } from 'lucide-react';

interface AnalyticsData {
    monthlyCollected: { month: string; amount: number }[];
    monthlyClaims: { month: string; count: number }[];
    successRate: number;
    avgDaysToCollect: number;
    totalClaims: number;
    totalCollected: number;
    source: string;
}

function BarChart({ data, color = '#00e5cc' }: { data: { label: string; value: number }[]; color?: string }) {
    const max = Math.max(...data.map(d => d.value));

    return (
        <div className="flex items-end gap-2 h-40 mt-4">
            {data.map((d, i) => (
                <div key={d.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="relative w-full flex justify-center">
                        <div
                            className="w-full max-w-[40px] rounded-t-lg transition-all duration-700 ease-out relative overflow-hidden"
                            style={{
                                height: max > 0 ? `${(d.value / max) * 130}px` : '4px',
                                background: `linear-gradient(to top, ${color}40, ${color})`,
                                animationDelay: `${i * 100}ms`,
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                        </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                </div>
            ))}
        </div>
    );
}

function CircularProgress({ value, label, color = '#00e5cc' }: { value: number; label: string; color?: string }) {
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative">
                <svg width="120" height="120" className="-rotate-90">
                    <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                    <circle
                        cx="60" cy="60" r={radius} fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 6px ${color})` }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
                </div>
            </div>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetch('/api/analytics')
            .then(res => res.json())
            .then(setData)
            .catch(() => { });
    }, []);

    if (!data) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="h-8 w-48 bg-[#ffffff08] rounded animate-pulse" />
                <div className="grid grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 bg-[#ffffff08] rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground mt-1">Insikter om dina indrivningsresultat.</p>
                </div>
                {data.source === 'mock' && (
                    <span className="text-xs text-muted-foreground bg-[#ffffff08] px-3 py-1 rounded-full">Demodata</span>
                )}
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Banknote className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Totalt indriven</span>
                    </div>
                    <p className="text-2xl font-semibold font-serif italic text-[#f5c842]">
                        {data.totalCollected.toLocaleString('sv-SE')} <span className="text-sm text-muted-foreground font-sans not-italic">SEK</span>
                    </p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Target className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</span>
                    </div>
                    <p className="text-2xl font-semibold text-primary">{data.successRate}%</p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Snitt tid</span>
                    </div>
                    <p className="text-2xl font-semibold">{data.avgDaysToCollect} <span className="text-sm text-muted-foreground">dagar</span></p>
                </GlassCard>

                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Totalt ärenden</span>
                    </div>
                    <p className="text-2xl font-semibold">{data.totalClaims}</p>
                </GlassCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Indriven summa per månad</h3>
                        <TrendingUp className="h-4 w-4 text-[#f5c842]" />
                    </div>
                    <BarChart
                        data={data.monthlyCollected.map(d => ({ label: d.month, value: d.amount }))}
                        color="#f5c842"
                    />
                </GlassCard>

                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Nya ärenden per månad</h3>
                        <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    <BarChart
                        data={data.monthlyClaims.map(d => ({ label: d.month, value: d.count }))}
                        color="#00e5cc"
                    />
                </GlassCard>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <GlassCard className="p-6 flex flex-col items-center justify-center lg:col-span-1">
                    <CircularProgress value={data.successRate} label="Indrivningsgrad" color="#00e5cc" />
                </GlassCard>

                <GlassCard className="p-6 lg:col-span-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Trend (6 månader)</h3>
                    <div className="flex items-end gap-8">
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Indriven summa</p>
                            <Sparkline
                                data={data.monthlyCollected.map(d => d.amount)}
                                color="#f5c842"
                                width={200}
                                height={60}
                            />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Antal ärenden</p>
                            <Sparkline
                                data={data.monthlyClaims.map(d => d.count)}
                                color="#00e5cc"
                                width={200}
                                height={60}
                            />
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
