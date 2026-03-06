'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/shared/GlassCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Search, Filter, Download, Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { NewClaimModal } from '@/components/claims/NewClaimModal';

interface Claim {
    id: string;
    debtor_name: string;
    amount: number;
    currency: string;
    due_date: string;
    current_step: number;
    status: 'active' | 'paid' | 'escalated' | 'cancelled';
    days_overdue?: number;
}

function escapeCsvCell(val: string | number): string {
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

function exportToCsv(claims: Claim[]) {
    const headers = ['Gäldenär', 'Belopp', 'Valuta', 'Förfallodatum', 'Försenad (dagar)', 'Steg', 'Status'];
    const rows = claims.map((c) => [
        escapeCsvCell(c.debtor_name),
        escapeCsvCell(c.amount),
        escapeCsvCell(c.currency),
        escapeCsvCell(new Date(c.due_date).toLocaleDateString('sv-SE')),
        escapeCsvCell(c.days_overdue ?? 0),
        escapeCsvCell(c.current_step),
        escapeCsvCell(c.status === 'active' ? 'Aktiv' : c.status === 'paid' ? 'Betald' : c.status === 'escalated' ? 'Eskalerad' : 'Avbruten'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `superclaim-arenden-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export default function ClaimsListPage() {
    const router = useRouter();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [showNewClaim, setShowNewClaim] = useState(false);
    const [fortnoxConnected, setFortnoxConnected] = useState(false);
    const [syncLoading, setSyncLoading] = useState(false);

    const loadClaims = () => {
        setLoading(true);
        fetch('/api/claims')
            .then((res) => res.json())
            .then((data) => {
                const list = (data.claims || []).map((c: any) => ({
                    ...c,
                    days_overdue: c.days_overdue ?? Math.max(0, Math.floor((Date.now() - new Date(c.due_date).getTime()) / 86400000)),
                }));
                setClaims(list);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        loadClaims();
        fetch('/api/fortnox/status').then(r => r.json()).then(d => setFortnoxConnected(d.connected || false)).catch(() => { });
    }, []);

    const filtered = claims.filter((c) => {
        const matchesSearch = c.debtor_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleExport = () => {
        exportToCsv(filtered);
        toast.success('Export klar 📥', {
            description: `${filtered.length} ärenden exporterade till CSV.`,
        });
    };

    if (loading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-300">
                <div className="h-8 w-56 bg-[#ffffff08] rounded animate-pulse" />
                <div className="h-96 bg-[#ffffff08] rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Ärenden</h1>
                    <p className="text-muted-foreground mt-1">Alla indrivningsärenden på ett ställe.</p>
                </div>
                <div className="flex items-center gap-2">
                    {fortnoxConnected && (
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={syncLoading}
                            onClick={async () => {
                                setSyncLoading(true);
                                try {
                                    const res = await fetch('/api/fortnox/import', { method: 'POST' });
                                    const data = await res.json();
                                    if (res.ok) {
                                        toast.success('Fortnox-sync klar', {
                                            description: `${data.imported} nya, ${data.skipped} redan fanns.`
                                        });
                                        if (data.imported > 0) loadClaims();
                                    } else {
                                        toast.error(data.error || 'Sync misslyckades');
                                    }
                                } catch {
                                    toast.error('Nätverksfel');
                                } finally {
                                    setSyncLoading(false);
                                }
                            }}
                            className="border-[#1e7e34]/30 bg-[#1e7e34]/5 hover:bg-[#1e7e34]/15 text-[#1e7e34] shrink-0"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
                            Synca Fortnox
                        </Button>
                    )}
                    <Button
                        onClick={() => setShowNewClaim(true)}
                        className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold shadow-[0_0_16px_rgba(0,229,204,0.2)] hover:shadow-[0_0_24px_rgba(0,229,204,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Nytt ärende
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={filtered.length === 0}
                        className="border-[#ffffff10] bg-[#122220]/50 hover:bg-primary/10 hover:border-primary/20 hover:text-primary text-muted-foreground shrink-0"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Exportera CSV
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Sök gäldenär..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-[#122220] border-[#ffffff10]"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    {['all', 'active', 'escalated', 'paid'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${statusFilter === s
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-[#ffffff10] text-muted-foreground hover:border-[#ffffff20]'
                                }`}
                        >
                            {s === 'all' ? 'Alla' : s === 'active' ? 'Aktiva' : s === 'escalated' ? 'Eskalerade' : 'Betalda'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <GlassCard className="rounded-xl overflow-hidden border-[#ffffff08]">
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
                        {filtered.map((claim) => (
                            <TableRow
                                key={claim.id}
                                className="border-[#ffffff08] hover:bg-primary/5 transition-colors cursor-pointer"
                                onClick={() => router.push(`/dashboard/claims/${claim.id}`)}
                            >
                                <TableCell className="px-6 py-4 font-medium">{claim.debtor_name}</TableCell>
                                <TableCell>{claim.amount.toLocaleString('sv-SE')} {claim.currency}</TableCell>
                                <TableCell className={claim.status === 'paid' ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                                    {new Date(claim.due_date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </TableCell>
                                <TableCell>{(claim.days_overdue ?? 0) > 0 ? `${claim.days_overdue} dagar` : '-'}</TableCell>
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
                        ))}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-muted-foreground">Inga ärenden hittades.</p>
                                        <Button
                                            onClick={() => setShowNewClaim(true)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-primary hover:bg-primary/10"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Skapa ditt första ärende
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </GlassCard>

            {/* New Claim Modal */}
            <NewClaimModal
                open={showNewClaim}
                onClose={() => setShowNewClaim(false)}
                onCreated={loadClaims}
            />
        </div>
    );
}
