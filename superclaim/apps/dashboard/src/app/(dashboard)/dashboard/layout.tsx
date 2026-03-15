// Force all dashboard pages to be dynamic (never pre-rendered)
// Dashboard pages require auth + Supabase, so static generation is not possible
export const dynamic = 'force-dynamic'

export default function DashboardInnerLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>
}
