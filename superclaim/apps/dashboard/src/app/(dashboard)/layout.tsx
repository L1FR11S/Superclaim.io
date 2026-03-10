'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, ReceiptText, Settings, LogOut, Bell, CircleUserRound, ChevronDown, User, CreditCard, HelpCircle, BarChart3, Mail, Workflow, FlaskConical, Check, X, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/claims', label: 'Ärenden', icon: ReceiptText },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/drafts', label: 'E-post / SMS', icon: Mail },
    { href: '/dashboard/flow-builder', label: 'Agentflöde', icon: Workflow },
    { href: '/dashboard/settings', label: 'Inställningar', icon: Settings },
    { href: '/dashboard/test', label: 'Test Panel', icon: FlaskConical },
];

interface Notification {
    id: string;
    text: string;
    time: string;
    type: string;
    href?: string;
    read: boolean;
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [pendingDraftsCount, setPendingDraftsCount] = useState(0);
    const [userEmail, setUserEmail] = useState<string>('');
    const [orgName, setOrgName] = useState<string>('');
    const [orgId, setOrgId] = useState<string>('');
    const notifRef = useRef<HTMLDivElement>(null);
    const userRef = useRef<HTMLDivElement>(null);

    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch('/api/notifications');
            const data = await res.json();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
            setPendingDraftsCount(data.pendingDraftsCount || 0);
        } catch { /* ignore */ }
    }, []);

    // Initial fetch + polling fallback (var 60:e sekund)
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [pathname, fetchNotifications]);

    // Supabase Realtime subscription
    useEffect(() => {
        if (!orgId) return;

        const channel = supabase
            .channel('notifications-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `org_id=eq.${orgId}`,
                },
                (payload) => {
                    const n = payload.new as any;
                    const newNotif: Notification = {
                        id: n.id,
                        type: n.type,
                        text: n.text,
                        href: n.href,
                        time: n.created_at,
                        read: false,
                    };
                    setNotifications(prev => [newNotif, ...prev].slice(0, 20));
                    setUnreadCount(prev => prev + 1);

                    // Toast
                    if (n.type === 'reply') {
                        toast.info(n.text, {
                            description: 'Klicka för att visa ärendet',
                            action: n.href ? { label: 'Visa', onClick: () => router.push(n.href) } : undefined,
                        });
                    } else if (n.type === 'paid') {
                        toast.success(n.text, {
                            action: n.href ? { label: 'Visa', onClick: () => router.push(n.href) } : undefined,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId, supabase, router]);

    // Fetch user info + org_id
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user?.email) setUserEmail(user.email);
        });
        fetch('/api/settings').then(r => r.json()).then(d => {
            if (d?.org_name) setOrgName(d.org_name);
        }).catch(() => { });
        // Get org_id for realtime filter
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user?.email) return;
            const { data } = await supabase.from('organizations').select('id, name').eq('email', user.email).single();
            if (data?.name) setOrgName(data.name);
            if (data?.id) setOrgId(data.id);
        });
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
            if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id] }),
        });
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        await fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        });
    };

    const clearNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        setUnreadCount(prev => {
            const wasUnread = notifications.find(n => n.id === id && !n.read);
            return wasUnread ? Math.max(0, prev - 1) : prev;
        });
        await fetch('/api/notifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [id] }),
        });
    };

    const clearAllNotifications = async () => {
        setNotifications([]);
        setUnreadCount(0);
        await fetch('/api/notifications', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ all: true }),
        });
    };

    const isActive = (href: string) => {
        if (href === '/dashboard') return pathname === '/dashboard';
        return pathname.startsWith(href);
    };

    const getGreeting = () => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'God morgon ☀️';
        if (h >= 12 && h < 17) return 'God dag 👋';
        if (h >= 17 && h < 22) return 'God kväll 🌆';
        return 'God natt 🌙';
    };

    const totalBadgeCount = unreadCount + pendingDraftsCount;

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
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://superclaim.io'}/`;
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
                    >
                        <LogOut className="h-5 w-5" />
                        Logga ut
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:pl-64 flex flex-col">
                {/* Topbar */}
                <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#ffffff08] bg-background/60 px-6 backdrop-blur-xl">
                    <h2 className="text-lg font-medium text-muted-foreground" suppressHydrationWarning>{getGreeting()}</h2>
                    <div className="flex items-center gap-2">
                        {/* Notifications */}
                        <div ref={notifRef} className="relative">
                            <button
                                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                                className="relative p-3 rounded-xl text-muted-foreground/80 hover:text-foreground hover:bg-white/5 transition-all duration-200"
                            >
                                <Bell className="h-5 w-5 stroke-[1.5]" />
                                {totalBadgeCount > 0 && (
                                    <span className="absolute top-2 right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-background shadow-[0_0_8px_rgba(0,229,204,0.4)] px-1">
                                        {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-12 w-80 rounded-xl border border-[#ffffff08] bg-[#0d1a18]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
                                    <div className="p-4 border-b border-[#ffffff08] flex items-center justify-between">
                                        <h4 className="text-sm font-medium">Notifikationer</h4>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-[10px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                            >
                                                <Check className="h-3 w-3" /> Markera alla som lästa
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-64 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="px-4 py-8 text-center text-sm text-muted-foreground/50">Inga notiser just nu</div>
                                        ) : notifications.map((n) => (
                                            <Link
                                                key={n.id}
                                                href={n.href || '#'}
                                                onClick={() => {
                                                    if (!n.read) markAsRead(n.id);
                                                    setShowNotifications(false);
                                                }}
                                                className={cn(
                                                    "block px-4 py-3 hover:bg-primary/5 transition-colors border-b border-[#ffffff05] last:border-0",
                                                    !n.read && "bg-primary/[0.03]"
                                                )}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={cn(
                                                        "mt-1 h-2 w-2 rounded-full shrink-0 transition-opacity",
                                                        n.read ? "opacity-0" : "opacity-100",
                                                        n.type === 'paid' && "bg-[#f5c842]",
                                                        n.type === 'reply' && "bg-violet-400",
                                                        n.type === 'info' && "bg-primary",
                                                        n.type === 'draft' && "bg-primary",
                                                        n.type === 'warning' && "bg-amber-500",
                                                        n.type === 'escalated' && "bg-amber-500",
                                                    )} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn(
                                                            "text-sm",
                                                            n.read ? "text-foreground/60" : "text-foreground/90"
                                                        )}>{n.text}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            {new Date(n.time).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                    {notifications.length > 0 && (
                                        <div className="p-3 border-t border-[#ffffff08]">
                                            <button
                                                onClick={() => { setShowAllNotifications(true); setShowNotifications(false); }}
                                                className="text-xs text-primary hover:text-primary/80 transition-colors w-full text-center"
                                            >
                                                Visa alla notifikationer
                                            </button>
                                        </div>
                                    )}
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
                                        <p className="text-sm font-medium">{orgName || '—'}</p>
                                        <p className="text-xs text-muted-foreground">{userEmail}</p>
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
                                        <button
                                            onClick={async () => {
                                                await supabase.auth.signOut();
                                                window.location.href = `${process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://superclaim.io'}/`;
                                            }}
                                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full"
                                        >
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

            {/* All Notifications Modal */}
            {showAllNotifications && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowAllNotifications(false)}
                    />
                    {/* Modal */}
                    <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-[#ffffff10] bg-[#0d1a18]/95 backdrop-blur-xl shadow-[0_16px_64px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-[#ffffff08]">
                            <div>
                                <h3 className="text-lg font-semibold">Notifikationer</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {unreadCount > 0 ? `${unreadCount} olästa` : 'Alla lästa'}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-primary/10"
                                    >
                                        <Check className="h-3 w-3" /> Markera alla
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={clearAllNotifications}
                                        className="text-xs text-red-400/70 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-3 w-3" /> Rensa alla
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowAllNotifications(false)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-[#ffffff08] transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Notification list */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="px-5 py-16 text-center">
                                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground/50">Inga notifikationer ännu</p>
                                </div>
                            ) : notifications.map((n) => (
                                <Link
                                    key={n.id}
                                    href={n.href || '#'}
                                    onClick={() => {
                                        if (!n.read) markAsRead(n.id);
                                        setShowAllNotifications(false);
                                    }}
                                    className={cn(
                                        "group flex items-start gap-3 px-5 py-4 hover:bg-primary/5 transition-colors border-b border-[#ffffff05] last:border-0",
                                        !n.read && "bg-primary/[0.03]"
                                    )}
                                >
                                    <div className={cn(
                                        "mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 transition-opacity",
                                        n.read ? "opacity-0" : "opacity-100",
                                        n.type === 'paid' && "bg-[#f5c842]",
                                        n.type === 'reply' && "bg-violet-400",
                                        n.type === 'info' && "bg-primary",
                                        n.type === 'draft' && "bg-primary",
                                        n.type === 'warning' && "bg-amber-500",
                                        n.type === 'escalated' && "bg-amber-500",
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm",
                                            n.read ? "text-foreground/60" : "text-foreground/90 font-medium"
                                        )}>{n.text}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(n.time).toLocaleString('sv-SE', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearNotification(n.id); }}
                                        className="p-1 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                                        title="Ta bort"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
