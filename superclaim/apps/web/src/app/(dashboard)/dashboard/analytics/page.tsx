'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Sparkline } from '@/components/shared/Sparkline';
import { TrendingUp, Clock, Target, Banknote, BarChart3, Mail, MessageSquare, Zap, ArrowDownLeft, Bot } from 'lucide-react';

interface AnalyticsData {
    monthlyCollected: { month: string; amount: number }[];
    monthlyClaims: { month: string; count: number }[];
    successRate: number;
    avgDaysToCollect: number;
    totalClaims: number;
    totalCollected: number;
    source: string;
}

interface Activity {
    id: string;
    type: 'email' | 'sms' | 'agent_run';
    direction: string;
    title: string;
    description: string;
    debtor: string | null;
    amount: number | null;
    currency: string | null;
    step: number | null;
    timestamp: string;
    status?: string;
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
                    <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 6px ${color})` }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color }}>{value}%</span>
                </div>
            </div>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
    );
}

function timeAgo(dateStr: string) {
    const now = new Date();
    const d = new Date(dateStr);
    const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (mins < 1) return 'Just nu';
    if (mins < 60) return `${mins} min sedan`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h sedan`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Igår';
    if (days < 7) return `${days} dagar sedan`;
    return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

function ActivityIcon({ type, direction }: { type: string; direction: string }) {
    if (type === 'agent_run') return (
        <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/10 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-amber-400" />
        </div>
    );
    if (type === 'email' && direction === 'inbound') return (
        <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/10 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="h-4 w-4 text-blue-400" />
        </div>
    );
    if (type === 'email') return (
        <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/10 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-primary" />
        </div>
    );
    if (type === 'sms') return (
        <div className="h-9 w-9 rounded-xl bg-violet-500/10 border border-violet-500/10 flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4 text-violet-400" />
        </div>
    );
    return (
        <div className="h-9 w-9 rounded-xl bg-[#ffffff08] flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-muted-foreground" />
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [activityLoading, setActivityLoading] = useState(true);

    useEffect(() => {
        fetch('/api/analytics').then(r => r.json()).then(setData).catch(() => { });
        fetch('/api/activity').then(r => r.json())
            .then(d => setActivities(d.activities || []))
            .catch(() => { })
            .finally(() => setActivityLoading(false));
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

    const isEmpty = data.source === 'empty' || data.totalClaims === 0;

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

            {/* Empty state banner */}
            {isEmpty && (
                <GlassCard className="p-6 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BarChart3 className="h-5 w-5 text-primary/50" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Inga ärenden ännu</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Analytics fylls på automatiskt när du lägger till och driver in ärenden.</p>
                    </div>
                </GlassCard>
            )}

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
                        {isEmpty ? <span className="text-muted-foreground font-sans not-italic text-lg">–</span> : <>{data.totalCollected.toLocaleString('sv-SE')} <span className="text-sm text-muted-foreground font-sans not-italic">SEK</span></>}
                    </p>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Target className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</span>
                    </div>
                    <p className="text-2xl font-semibold text-primary">{isEmpty ? <span className="text-muted-foreground text-lg">–</span> : `${data.successRate}%`}</p>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Snitt tid</span>
                    </div>
                    <p className="text-2xl font-semibold">
                        {isEmpty ? <span className="text-muted-foreground text-lg">–</span> : <>{data.avgDaysToCollect} <span className="text-sm text-muted-foreground">dagar</span></>}
                    </p>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Totalt ärenden</span>
                    </div>
                    <p className="text-2xl font-semibold">{isEmpty ? <span className="text-muted-foreground text-lg">–</span> : data.totalClaims}</p>
                </GlassCard>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Indriven summa per månad</h3>
                        <TrendingUp className="h-4 w-4 text-[#f5c842]" />
                    </div>
                    {isEmpty
                        ? <div className="h-40 mt-4 flex items-center justify-center text-muted-foreground/30 text-sm">Inga data ännu</div>
                        : <BarChart data={data.monthlyCollected.map(d => ({ label: d.month, value: d.amount }))} color="#f5c842" />}
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Nya ärenden per månad</h3>
                        <BarChart3 className="h-4 w-4 text-primary" />
                    </div>
                    {isEmpty
                        ? <div className="h-40 mt-4 flex items-center justify-center text-muted-foreground/30 text-sm">Inga data ännu</div>
                        : <BarChart data={data.monthlyClaims.map(d => ({ label: d.month, value: d.count }))} color="#00e5cc" />}
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
                            <Sparkline data={data.monthlyCollected.map(d => d.amount)} color="#f5c842" width={200} height={60} />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Antal ärenden</p>
                            <Sparkline data={data.monthlyClaims.map(d => d.count)} color="#00e5cc" width={200} height={60} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Activity Log */}
            <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-sm font-medium uppercase tracking-wider">Aktivitetslogg</h3>
                            <p className="text-xs text-muted-foreground">Senaste åtgärder av AI-agenten</p>
                        </div>
                    </div>
                    {activities.length > 0 && (
                        <span className="text-xs text-muted-foreground bg-[#ffffff08] px-3 py-1 rounded-full">
                            {activities.length} händelser
                        </span>
                    )}
                </div>

                {activityLoading ? (
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="h-9 w-9 bg-[#ffffff08] rounded-xl animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-40 bg-[#ffffff08] rounded animate-pulse" />
                                    <div className="h-3 w-64 bg-[#ffffff06] rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-12">
                        <Bot className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Ingen aktivitet ännu</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Agenten loggar sina åtgärder här automatiskt</p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[17px] top-6 bottom-6 w-px bg-gradient-to-b from-primary/20 via-[#ffffff08] to-transparent" />

                        <div className="space-y-0.5">
                            {activities.map((activity, index) => (
                                <div
                                    key={activity.id}
                                    className="relative flex items-start gap-4 p-3 rounded-xl hover:bg-[#ffffff04] transition-colors group animate-in fade-in slide-in-from-left-2 duration-300"
                                    style={{ animationDelay: `${index * 40}ms` }}
                                >
                                    <div className="relative z-10">
                                        <ActivityIcon type={activity.type} direction={activity.direction} />
                                    </div>

                                    <div className="flex-1 min-w-0 pt-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium">{activity.title}</span>
                                            {activity.debtor && (
                                                <>
                                                    <span className="text-muted-foreground/30">·</span>
                                                    <span className="text-xs text-muted-foreground">{activity.debtor}</span>
                                                </>
                                            )}
                                            {activity.amount != null && (
                                                <>
                                                    <span className="text-muted-foreground/30">·</span>
                                                    <span className="text-xs text-[#f5c842]/70 font-medium">
                                                        {activity.amount.toLocaleString('sv-SE')} {activity.currency}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {activity.description && (
                                            <p className="text-xs text-muted-foreground/50 mt-0.5 truncate max-w-lg">{activity.description}</p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 pt-1.5">
                                        {activity.step != null && (
                                            <span className="text-[10px] text-muted-foreground/40 bg-[#ffffff05] px-1.5 py-0.5 rounded">
                                                Steg {activity.step}
                                            </span>
                                        )}
                                        <span className="text-[11px] text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors whitespace-nowrap">
                                            {timeAgo(activity.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
