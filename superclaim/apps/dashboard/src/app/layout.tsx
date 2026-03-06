import type { Metadata } from 'next'
import { DM_Sans, Instrument_Serif } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Superclaim.io | Autonomous AI invoice collection',
  description: 'Your invoices. Collected. Autonomously. Powered by AI.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="sv" className={`${dmSans.variable} ${instrumentSerif.variable} dark`}>
      <body className="antialiased font-sans min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(13, 26, 24, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#f0f4f3',
              backdropFilter: 'blur(12px)',
            },
          }}
        />
      </body>
    </html>
  )
}
