'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Trash2, Unplug, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'destructive' | 'warning' | 'default';
    loading?: boolean;
}

const variantConfig = {
    destructive: {
        icon: Trash2,
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-400',
        confirmClass: 'bg-red-500/90 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_28px_rgba(239,68,68,0.35)]',
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-400',
        confirmClass: 'bg-amber-500/90 hover:bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_28px_rgba(245,158,11,0.35)]',
    },
    default: {
        icon: RefreshCw,
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        confirmClass: 'bg-gradient-to-r from-primary to-[#00b8a3] text-background shadow-[0_0_20px_rgba(0,229,204,0.2)] hover:shadow-[0_0_28px_rgba(0,229,204,0.35)]',
    },
};

export function ConfirmDialog({
    open,
    onConfirm,
    onCancel,
    title,
    description,
    confirmLabel = 'Bekräfta',
    cancelLabel = 'Avbryt',
    variant = 'destructive',
    loading = false,
}: ConfirmDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    // Focus trap
    useEffect(() => {
        if (open) dialogRef.current?.focus();
    }, [open]);

    if (!open) return null;

    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={cn(
                    "relative z-10 w-full max-w-md mx-4",
                    "rounded-2xl border border-white/5 bg-[#0d1a18]/95 backdrop-blur-xl",
                    "shadow-[0_8px_64px_rgba(0,0,0,0.5)]",
                    "animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200",
                    "outline-none"
                )}
            >
                <div className="p-6 space-y-4">
                    {/* Icon + Title */}
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "shrink-0 h-10 w-10 rounded-xl flex items-center justify-center",
                            config.iconBg
                        )}>
                            <Icon className={cn("h-5 w-5", config.iconColor)} />
                        </div>
                        <div className="space-y-1 pt-0.5">
                            <h3 className="text-base font-semibold text-foreground">
                                {title}
                            </h3>
                            {description && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 px-6 pb-6">
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="border-white/5 bg-white/[0.03] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground transition-all"
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className={cn(
                            "font-semibold transition-all",
                            config.confirmClass
                        )}
                        disabled={loading}
                    >
                        {loading && (
                            <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        )}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
