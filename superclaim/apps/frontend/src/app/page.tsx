import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/shared/GlassCard';
import { ArrowRight, BrainCircuit, ShieldCheck, Zap, TrendingUp, Clock, Loader2, HeartHandshake } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#f5c842]/5 blur-[120px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-4 lg:px-12 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-1">
          <Image src="/logo.svg" alt="S" width={32} height={32} className="h-8 w-auto drop-shadow-[0_0_12px_rgba(0,229,204,0.3)]" />
          <span className="text-xl font-medium tracking-tight">Superclaim<span className="text-primary">.io</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#hurgordet" className="hover:text-foreground transition-colors">Hur det fungerar</Link>
          <Link href="#fordelar" className="hover:text-foreground transition-colors">Fördelar</Link>
          <Link href="#priser" className="hover:text-foreground transition-colors">Beräkna potentiell ROI</Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Logga in
          </Link>
          <Button asChild className="bg-gradient-to-r from-primary to-[#00b8a3] text-background font-semibold hover:opacity-90 transition-opacity">
            <Link href="/registrera">Kom igång</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 relative z-10 flex flex-col pt-24 lg:pt-36 px-4">
        {/* Gradients */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-primary/10 blur-[150px] rounded-full pointer-events-none transform translate-x-1/3 -translate-y-1/3"></div>

        <div className="max-w-[85rem] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">

          {/* Left: Copy & CTA */}
          <div className="col-span-1 lg:col-span-5 space-y-8 text-left relative z-20 animate-in fade-in slide-in-from-left-8 duration-700 pb-10">
            <div className="inline-flex items-center gap-3 text-sm font-medium mb-2 text-muted-foreground bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <span className="bg-white/10 text-white px-2 py-0.5 rounded-md text-xs font-semibold">Nyhet</span>
              <span className="flex items-center gap-1.5 text-white/90">
                <HeartHandshake className="h-4 w-4 text-primary" />
                Optimera kassaflödet och bevarar kundrelationen
              </span>
            </div>

            <h1 className="font-serif italic text-5xl lg:text-[4.7rem] tracking-tight leading-[1.03]">
              <span className="block text-white"> Minska andelen förfallna fakturor</span>
              <span className="block text-[#e8eada]">Och beroendet av</span>
              <span className="block text-[#e8eada]">
                dyra <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#00b8a3]">inkassotjänster.</span>
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed pr-8 font-light">
              Superclaim fyller gapet mellan förfallen faktura och traditionell inkasso. Vi automatiserar dina påminnelser med AI för att säkra kassaflödet, samtidigt som vi värnar om er kundrelation.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
              <p className="text-sm md:text-base font-serif italic text-white/50 w-full mb-2 sm:mb-0">


              </p>
            </div>

            <div className="flex gap-4">
              <Button size="lg" asChild className="h-14 px-8 bg-[#ccff00] text-[#0d1a18] text-lg font-semibold hover:bg-[#bbf000] rounded-full transition-all shadow-[0_0_20px_rgba(204,255,0,0.15)] hover:shadow-[0_0_30px_rgba(204,255,0,0.3)] hover:-translate-y-1">
                <Link href="/onboarding">
                  Boka en demo <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Product Mockup */}
          <div className="col-span-1 lg:col-span-7 relative w-full animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 hidden md:flex flex-col items-center justify-center mt-8 lg:mt-0">

            {/* Browser frame */}
            <div className="relative w-full max-w-[820px] mx-auto">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-primary/10 blur-[60px] rounded-3xl -z-10 scale-95" />

              {/* Window chrome */}
              <div className="rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.7)] border border-white/10 bg-[#0d1a18]">
                {/* Title bar */}
                <div className="h-10 border-b border-white/5 bg-[#122220]/90 flex items-center justify-between px-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground/70 font-mono bg-white/5 px-3 py-1 rounded-md">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    app.superclaim.io/dashboard
                  </div>
                  <div className="w-16" />
                </div>

                {/* Screenshot */}
                <div className="relative w-full aspect-[16/10]">
                  <Image
                    src="/Superclaim_dashboard.png" // Vi kan behöva uppdatera denna bild så den inte visar "inkasso-termer"
                    alt="Superclaim Dashboard"
                    fill
                    className="object-cover object-top"
                    priority
                  />
                  {/* Subtle bottom fade */}
                  <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#0d1a18] to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Floating widget — pinned bottom-left */}
              <div className="absolute -bottom-6 -left-6 w-[280px] rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.7)] border border-white/10 bg-[#0a1412]/95 backdrop-blur-xl p-5 z-30">
                <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                  <div>
                    <span className="text-sm font-semibold text-white block mb-0.5">Aktiv fakturaoptimering</span>
                    <span className="text-xs text-muted-foreground">3 pågående ärenden</span>
                  </div>
                  <span className="text-xs text-[#00b8a3] bg-[#00b8a3]/10 px-2 py-1 rounded-full font-medium flex items-center gap-1 border border-[#00b8a3]/20">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Live
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Acme Corp</span>
                      <span className="text-[#00b8a3]">Säkrad</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-[#00b8a3] w-full rounded-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> TechNova AB</span>
                      <span className="text-amber-400 animate-pulse">Analyserar gäldenär...</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 w-1/2 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trust Banner Below Hero */}
      <div className="w-full border-y border-white/5 bg-[#0a1412]/50 backdrop-blur-sm mt-10 lg:mt-24 py-10 relative z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background z-10 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-center gap-12 lg:gap-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          <span className="text-2xl font-serif font-bold italic tracking-wider text-white">Fortnox</span>
          <span className="text-2xl font-sans font-bold tracking-tight text-white flex items-center gap-2">VISMA</span>
          <span className="text-2xl font-serif font-bold tracking-widest text-white">Niora</span>
          <span className="text-xl font-sans font-medium tracking-tight text-white">Björn Lundén</span>
          <span className="text-2xl font-sans font-bold tracking-tight text-white italic">PE Accounting</span>
        </div>
      </div>

      {/* Features Cards */}
      <div id="hurgordet" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full px-4 text-left relative z-20">
        <GlassCard glowColor="cyan" className="p-8 hover:-translate-y-1 transition-transform duration-300">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-3"> Enkel uppsättning</h3>
          <p className="text-muted-foreground leading-relaxed">
            Integrera Superclaim med ditt faktureringssystem (ERP) (t.ex. Fortnox eller Visma) via några få enkla steg. Därefter krävs ingen ytterligare handpåläggning.
          </p>
        </GlassCard>

        <GlassCard glowColor="cyan" className="p-8 hover:-translate-y-1 transition-transform duration-300 delay-100">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <BrainCircuit className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-3">Systemet sköter allt</h3>
          <p className="text-muted-foreground leading-relaxed">
            Superclaim hanterar varje ärende automatiskt och unikt för optimalt utfall. Detta sker genom unika och skräddarsydda sekvenser med påminnelser via både SMS och E-post baserat på kundens betalningshistorik och beteende.
          </p>
        </GlassCard>

        <GlassCard glowColor="gold" className="p-8 hover:-translate-y-1 transition-transform duration-300 delay-200">
          <div className="h-12 w-12 rounded-lg bg-[#f5c842]/10 flex items-center justify-center mb-6 border border-[#f5c842]/20">
            <ShieldCheck className="h-6 w-6 text-[#f5c842]" />
          </div>
          <h3 className="text-xl font-medium mb-3">Positiv ROI</h3>
          <p className="text-muted-foreground leading-relaxed">
            Genom att Superclaim förbättrar kassaflödet i kombination med en rörlig prissättningsmodell har investeringen i att använda systemet resulterat i en positiv ROI för samtliga kunder.
          </p>
        </GlassCard>
      </div>

      {/* Benefits Section */}
      <div id="fordelar" className="mt-32 w-full max-w-6xl mx-auto px-4 text-left relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif italic tracking-tight leading-[1.1]">Direkt positiva effekter.</h2>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Superclaim erbjuder en helt ny typ tjänst som automatiserar något som tidigare krävde en omständig, dyr och manuell handpåläggning. Reslutatet är att i snitt 17% färre fakturor behöver drivas in via inkassotjänster och i slutändan riskera att bli ärenden hos Kronofogden.
            </p>
            <ul className="space-y-6 pt-4">
              <li className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <span className="text-lg font-medium">Optimera ditt kassaflöde. <span className="text-primary"></span></span>
              </li>
              <li className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <span className="text-lg font-medium">Minimerad administrationkostnad. <span className="text-primary"></span></span>
              </li>
            </ul>
          </div>
          <GlassCard glowColor="cyan" className="p-10 bg-[#122220]/60 relative overflow-hidden">

            <div className="absolute -right-10 -top-10 text-[150px] font-serif italic text-primary/10 select-none">"</div>
            <h3 className="text-xl font-semibold mb-6 relative z-10 text-white">&quot;Positiv ROI redan första månaden.&quot;</h3>
            <p className="text-lg leading-relaxed text-muted-foreground mb-10 relative z-10">
              "Vi är stolta och glada att vi som ett av dem första kunderna gav Superclaim-teamet möjligheten att bevisa sin produkt. Nu i efterhand ser jag ingen anledning till varför bolag med många utestående fakturor inte borde ge Superclaim samma möjlighet som vi en gång gjorde."            </p>
            <div className="flex items-center gap-4 relative z-10 mt-auto">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-[#00b8a3] flex items-center justify-center font-serif italic text-background font-bold text-lg shadow-[0_0_15px_rgba(0,229,204,0.3)]">T</div>
              <div>
                <p className="font-semibold text-white">Tidig referenskund</p>
                <p className="text-sm text-primary">VD, Bolag X</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Trust Banner / Pricing */}
      <div id="priser" className="mt-32 pb-32 w-full flex flex-col items-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-[#f5c842]/30 bg-[#f5c842]/10 text-[#f5c842] mb-8 shadow-[0_0_20px_rgba(245,200,66,0.15)]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5c842] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f5c842]"></span>
          </span>
          <span className="font-semibold tracking-wide text-sm md:text-base">
            Automatisera påminnelser och inkassoförberedande åtgärder
          </span>
        </div>
        <h2 className="text-4xl md:text-6xl font-serif italic tracking-tight text-center mb-6">Färre förfallna fakturor. <br /> Garanterad positiv ROI.</h2>
        <p className="text-xl text-muted-foreground text-center max-w-2xl mb-12 font-light">
          Låg fast kostnad i kombination med en riskfri betalningsmodell där Superclaim endast tar betalt för lyckat utfall. Alltså vi delar incitament med alla våra kunder.
        </p>
        <Button size="lg" asChild className="h-16 px-12 bg-[#ccff00] text-[#0d1a18] text-xl font-semibold shadow-[0_0_30px_rgba(204,255,0,0.2)] hover:shadow-[0_0_40px_rgba(204,255,0,0.4)] hover:scale-[1.05] transition-all rounded-full">
          <Link href="/onboarding">
            Beräkna din potentiella ROI
          </Link>
        </Button>
      </div>

      <footer className="w-full py-8 border-t border-white/5 flex items-center justify-center mt-auto">
        <p className="text-sm text-muted-foreground/60">&copy; {new Date().getFullYear()} Superclaim.io - Alla rättigheter reserverade.</p>
      </footer>
    </div>
  );
}