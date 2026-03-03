import { redirect } from 'next/navigation'

// app.superclaim.io root → redirect to dashboard
export default function RootPage() {
    redirect('/dashboard')
}
