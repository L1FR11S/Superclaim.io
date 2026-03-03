'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ReceiptText, Settings, LogOut, Bell, CircleUserRound, ChevronDown, User, CreditCard, HelpCircle, BarChart3, Mail, Workflow } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/claims', label: 'Ärenden', icon: ReceiptText },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/drafts', label: 'E-post / SMS', icon: Mail },
    { href: '/dashboard/flow-builder', label: 'Agentflöde', icon: Workflow },
    { href: '/dashboard/settings', label: 'Inställningar', icon: Settings },
];

interface Notification {
    id: string;
    text: string;
    time: string;
    type: 'info' | 'success' | 'warning';
    href?: string;
}

const defaultNotifications: Notification[] = [
    { id: '1', text: 'Acme Corp öppnade ditt mejl', time: '2 min sedan', type: 'info' },
    { id: '2', text: 'Globex Inc har betalat 4 200 SEK', time: '1 timme sedan', type: 'success', href: '/dashboard/claims' },
    { id: '3', text: 'TechNova Solutions — steg 4 skickat', time: '3 timmar sedan', type: 'warning' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>(defaultNotifications);
    const [pendingEmailsCount, setPendingEmailsCount] = useState(0);
    const [lastSeenCounts, setLastSeenCounts] = useState({ claims: 0, emails: 0 });
    const [hasNotifiedEmails, setHasNotifiedEmails] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(data.notifications || defaultNotifications);
            const pending = data.pendingEmailsCount ?? 0;
            const claimsCount = data.claimsCount ?? 0;
            setPendingEmailsCount(pending);

            if (pending > 0 && !pathname.includes('/dashboard/drafts') && !hasNotifiedEmails) {
                toast.info(`${pending} mejl väntar på godkännande`, {
                    description: 'Gå till E-post för att granska.',
                    action: {
                        label: 'Öppna',
                        onClick: () => router.push('/dashboard/drafts'),
                    },
                });
                setHasNotifiedEmails(true);
            }

            setLastSeenCounts((prev) => {
                if (claimsCount > prev.claims && prev.claims > 0) {
                    toast.success(`${claimsCount - prev.claims} nya ärenden`, {
                        description: 'Gå till Ärenden för att se dem.',
                        action: {
                            label: 'Visa',
                            onClick: () => router.push('/dashboard/claims'),
                        },
                    });
                }
                return { claims: claimsCount, emails: pending };
            });
        } catch { /* ignore */ }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 45000);
        return () => clearInterval(interval);
    }, [pathname]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
            if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-[#ffffff08] bg-[#0d1a18]/80 backdrop-blur-xl hidden md:flex flex-col">
                <div className="flex h-16 items-center border-b border-[#ffffff08] px-6">
                    <Link href="/" className="flex items-center gap-1">
                        <Image src="/logo.svg" alt="S" width={28} height={28} className="h-7 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
                        <span className="text-xl font-medium tracking-tight">Superclaim<span className="text-primary">.io</span></span>
                    </Link>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                                    active
                                        ? "bg-primary/10 text-primary shadow-[0_0_12px_rgba(0,229,204,0.1)] border border-primary/20"
                                        : "text-muted-foreground hover:text-foreground hover:bg-[#ffffff06]"
                                )}
                            >
                                <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgba(0,229,204,0.5)]")} />
                                {item.label}
                                {active && (
                                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(0,229,204,0.8)] animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-3 border-t border-[#ffffff08]">
                    <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full">
                        <LogOut className="h-5 w-5" />
                        Logga ut
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:pl-64 flex flex-col">
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#ffffff08] bg-background/60 px-6 backdrop-blur-xl">
                    <h2 className="text-lg font-medium text-muted-foreground">God kväll 👋</h2>
                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <div ref={notifRef} className="relative">
                            <button
                                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                                className="relative p-3 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-white/5 transition-all duration-200"
                            >
                                <Bell className="h-5 w-5 stroke-[1.5]" />
                                {(pendingEmailsCount > 0 || notifications.length > 0) && (
                                    <span className="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-background shadow-[0_0_8px_rgba(0,229,204,0.4)] px-1">
                                        {pendingEmailsCount > 0 ? (pendingEmailsCount > 9 ? '9+' : pendingEmailsCount) : notifications.length > 9 ? '9+' : notifications.length}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-12 w-80 rounded-xl border border-[#ffffff08] bg-[#0d1a18]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                    <div className="p-4 border-b border-[#ffffff08]">
                                        <h4 className="text-sm font-medium">Notifikationer</h4>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.map((n) => (
                                            <Link
                                                key={n.id}
                                                href={n.href || '#'}
                                                onClick={() => setShowNotifications(false)}
                                                className="block px-4 py-3 hover:bg-primary/5 transition-colors border-b border-[#ffffff05] last:border-0"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "mt-1 h-2 w-2 rounded-full shrink-0",
                                                        n.type === 'success' && "bg-[#f5c842]",
                                                        n.type === 'info' && "bg-primary",
                                                        n.type === 'warning' && "bg-amber-500",
                                                    )} />
                                                    <div>
                                                        <p className="text-sm text-foreground/90">{n.text}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="p-3 border-t border-[#ffffff08]">
                                        <button className="text-xs text-primary hover:text-primary/80 transition-colors w-full text-center">
                                            Visa alla notifikationer
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Menu */}
                        <div ref={userRef} className="relative">
                            <button
                                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-[#ffffff06] transition-all"
                            >
                                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary border border-primary/20">
                                    <CircleUserRound className="h-4 w-4" />
                                </div>
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 top-12 w-56 rounded-xl border border-[#ffffff08] bg-[#0d1a18]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                    <div className="p-4 border-b border-[#ffffff08]">
                                        <p className="text-sm font-medium">Demo Företag AB</p>
                                        <p className="text-xs text-muted-foreground">demo@foretag.se</p>
                                    </div>
                                    <div className="py-1">
                                        {[
                                            { icon: User, label: 'Min profil', href: '#' },
                                            { icon: CreditCard, label: 'Fakturering', href: '#' },
                                            { icon: HelpCircle, label: 'Hjälpcenter', href: '#' },
                                        ].map((item) => (
                                            <Link
                                                key={item.label}
                                                href={item.href}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
                                            >
                                                <item.icon className="h-4 w-4" />
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                    <div className="border-t border-[#ffffff08] py-1">
                                        <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full">
                                            <LogOut className="h-4 w-4" />
                                            Logga ut
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={`flex-1 p-6 lg:p-10 ${pathname.includes('flow-builder') ? '' : 'max-w-7xl'}`}>
                    {children}
                </div>
            </main>
        </div>
    );
}
