import { FileSearch, Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: 'search' | 'inbox';
    title: string;
    description: string;
    children?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, children }: EmptyStateProps) {
    const Icon = icon === 'search' ? FileSearch : Inbox;

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in duration-500">
            {/* Glowing icon container */}
            <div className="relative mb-6">
                <div className="h-20 w-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                    <Icon className="h-8 w-8 text-primary/50" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl -z-10" />
            </div>

            <h3 className="text-lg font-medium text-foreground/90 mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">{description}</p>

            {children && (
                <div className="mt-6">
                    {children}
                </div>
            )}
        </div>
    );
}
