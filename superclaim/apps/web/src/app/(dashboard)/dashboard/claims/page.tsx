'use client';

import { GlassCard } from '@/components/shared/GlassCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

const allClaims = [
    { id: 'acme-123', name: 'Acme Corp AB', amount: 14500, currency: 'SEK', dueDate: '12 okt 2025', daysOverdue: 14, step: 2, status: 'active' as const },
    { id: 'tech-456', name: 'TechNova Solutions', amount: 82000, currency: 'SEK', dueDate: '01 okt 2025', daysOverdue: 25, step: 4, status: 'escalated' as const },
    { id: 'glob-789', name: 'Globex Inc', amount: 4200, currency: 'SEK', dueDate: '24 okt 2025', daysOverdue: 0, step: 0, status: 'paid' as const },
    { id: 'nord-012', name: 'Nordisk Design AB', amount: 28900, currency: 'SEK', dueDate: '18 okt 2025', daysOverdue: 7, step: 1, status: 'active' as const },
    { id: 'sven-345', name: 'Svensson & Co', amount: 115000, currency: 'SEK', dueDate: '05 okt 2025', daysOverdue: 20, step: 3, status: 'active' as const },
    { id: 'berg-678', name: 'Berglund Transport', amount: 7800, currency: 'SEK', dueDate: '20 sep 2025', daysOverdue: 35, step: 5, status: 'escalated' as const },
    { id: 'holm-901', name: 'Holmström IT', amount: 31400, currency: 'SEK', dueDate: '28 okt 2025', daysOverdue: 0, step: 0, status: 'paid' as const },
    { id: 'karl-234', name: 'Karlsson Bygg AB', amount: 56000, currency: 'SEK', dueDate: '10 okt 2025', daysOverdue: 16, step: 2, status: 'active' as const },
];

export default function ClaimsListPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filtered = allClaims.filter((c) => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight">Ärenden</h1>
                <p className="text-muted-foreground mt-1">Alla indrivningsärenden på ett ställe.</p>
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
                                <TableCell className="px-6 py-4 font-medium">{claim.name}</TableCell>
                                <TableCell>{claim.amount.toLocaleString('sv-SE')} {claim.currency}</TableCell>
                                <TableCell className={claim.status === 'paid' ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                                    {claim.dueDate}
                                </TableCell>
                                <TableCell>{claim.daysOverdue > 0 ? `${claim.daysOverdue} dagar` : '-'}</TableCell>
                                <TableCell>
                                    {claim.step > 0 ? (
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2 w-2 rounded-full ${claim.step <= 2 ? 'bg-primary animate-pulse' : 'bg-[#f59e0b]'
                                                }`} />
                                            Steg {claim.step}
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
