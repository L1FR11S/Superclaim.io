import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    glowColor?: "cyan" | "gold" | "none";
}

export function GlassCard({ children, className, glowColor = "none", ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-2xl bg-[#0d1a18]/60 backdrop-blur-xl border border-white/5",
                "shadow-[0_4px_32px_rgba(0,0,0,0.2)]",
                className
            )}
            {...props}
        >
            {glowColor === "cyan" && (
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-primary/20 blur-[32px] pointer-events-none will-change-transform transform-gpu" />
            )}
            {glowColor === "gold" && (
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-32 w-32 rounded-full bg-[#f5c842]/20 blur-[32px] pointer-events-none will-change-transform transform-gpu" />
            )}
            <div className="relative z-10">{children}</div>
        </div>
    );
}
