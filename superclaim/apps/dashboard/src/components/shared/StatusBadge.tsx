import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
    status: 'active' | 'paid' | 'escalated' | 'cancelled';
    paused?: boolean;
}

const statusConfig = {
    paused: {
        label: 'Pausad',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
    },
    active: {
        label: 'Aktiv',
        className: 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_8px_rgba(0,229,204,0.2)]',
    },
    paid: {
        label: 'Betald',
        className: 'bg-[#f5c842]/10 text-[#f5c842] border-[#f5c842]/30',
    },
    escalated: {
        label: 'Eskalerad',
        className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    },
    cancelled: {
        label: 'Avbruten',
        className: 'bg-white/5 text-[#8aada8] border-white/10',
    },
};

export function StatusBadge({ status, paused }: StatusBadgeProps) {
    // Om ärendet är pausat och fortfarande aktivt → visa "Pausad"
    const effectiveStatus = (paused && status === 'active') ? 'paused' : status;
    const config = statusConfig[effectiveStatus];
    return (
        <Badge variant="outline" className={cn(config.className)}>
            {config.label}
        </Badge>
    );
}
