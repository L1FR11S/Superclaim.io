# Superclaim.io

**Autonom AI-baserad inkasso & fakturaindrivning**

Superclaim.io är en SaaS-plattform som automatiserar faktura-till-kassa-processen med AI-agenter. Plattformen analyserar obetalda fakturor, skickar skräddarsydda påminnelser via e-post och SMS, och eskalerar ärenden till inkasso som sista utväg.

---

## Tech Stack

| Lager | Teknik |
|-------|--------|
| **Framework** | Next.js 16 (App Router) |
| **Språk** | TypeScript, React 19 |
| **Styling** | Tailwind CSS v4 (via `@tailwindcss/postcss`) |
| **Auth & DB** | Supabase (Auth + PostgreSQL) |
| **AI** | Google Gemini (`@google/genai`) |
| **E-post** | AgentMail (`agentmail`) |
| **SMS** | 46elks (Elks API) |
| **Cache/Queue** | Upstash Redis |
| **Flow Builder** | React Flow (`@xyflow/react`) |
| **UI-komponenter** | Radix UI, Lucide Icons, Sonner (toasts) |
| **Deploy** | Vercel |

---

## Projektstruktur

```
superclaim/apps/web/
├── src/app/
│   ├── layout.tsx              # Root layout (fonts, metadata, Toaster)
│   ├── page.tsx                # Landing page
│   ├── login/page.tsx          # Login / registrering
│   ├── onboarding/page.tsx     # 3-stegs onboarding
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard shell (sidebar + topbar)
│   │   └── dashboard/
│   │       ├── page.tsx        # Översikt (KPI:er + senaste ärenden)
│   │       ├── claims/         # Ärendelista + detaljvy
│   │       ├── analytics/      # Grafik & aktivitetslogg
│   │       ├── emails/         # E-post/SMS-utkast & godkännande
│   │       ├── flow-builder/   # Visuell agentflödesbyggare
│   │       └── settings/       # Inställningar, webhook, domän
│   └── api/
│       ├── claims/             # CRUD ärenden + [id] detaljvy
│       ├── agent/run/          # Kör AI-agenten på ett ärende
│       ├── email-drafts/       # Skapa/godkänn e-postutkast
│       ├── sms-drafts/         # Skapa/godkänn SMS-utkast
│       ├── activity/           # Aktivitetslogg
│       ├── analytics/          # Aggregerad statistik
│       ├── notifications/      # Notifikationer
│       ├── settings/           # Generella inställningar
│       ├── domains/            # Anpassad avsändardomän
│       ├── inbox/create/       # Skapa AgentMail-inbox
│       └── webhooks/agentmail/ # Inkommande e-post-webhook
├── src/components/
│   ├── ui/                     # Shadcn-baserade (Button, Input, Label, Table)
│   ├── shared/                 # GlassCard, Sparkline, StatusBadge, EmptyState
│   ├── claims/                 # NewClaimModal, StepIndicator, Timeline
│   └── flow/                   # Flow Builder-noder (React Flow)
├── src/utils/supabase/         # Supabase client helpers
└── public/
    ├── logo.svg                # Logotyp
    └── dashboard-preview.png   # Screenshot för landing page
```

---

## Kom igång

### 1. Klona & installera
```bash
git clone https://github.com/din-org/superclaim.git
cd superclaim/apps/web
npm install
```

### 2. Konfigurera miljövariabler
Skapa `apps/web/.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI (Google Gemini)
GEMINI_API_KEY=AIza...

# E-post (AgentMail)
AGENTMAIL_API_KEY=am_...

# SMS (46elks)
ELKS_API_USERNAME=u...
ELKS_API_PASSWORD=...

# Cache (Upstash Redis)
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=AX...

# Niora-integration
NIORA_API_KEY=niora_sk_...
NIORA_API_URL=https://api.niora.app
NIORA_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Starta dev-server
```bash
npm run dev
```
Öppna [http://localhost:3000](http://localhost:3000).

---

## API-routes

| Route | Metod | Beskrivning |
|-------|-------|-------------|
| `/api/claims` | GET, POST | Lista/skapa ärenden |
| `/api/claims/[id]` | GET, PUT | Detaljvy + uppdatera ärende |
| `/api/agent/run` | POST | Kör AI-agenten på ett specifikt ärende |
| `/api/email-drafts` | GET, POST, PUT | Hantera e-postutkast |
| `/api/sms-drafts` | GET, POST, PUT | Hantera SMS-utkast |
| `/api/activity` | GET | Hämta aktivitetslogg |
| `/api/analytics` | GET | Aggregerad statistik |
| `/api/notifications` | GET | Notifikationer + badge-counts |
| `/api/settings` | GET, PUT | Användarinställningar |
| `/api/domains` | GET, POST, PUT | Anpassad avsändardomän |
| `/api/inbox/create` | POST | Skapa ny AgentMail-inbox |
| `/api/webhooks/agentmail` | POST | Ta emot inkommande e-post |

---

## Indrivningsflöde (Default)

```
Nytt ärende → 3 dagar → Vänlig påminnelse (e-post)
                         ↓
                    7 dagar → Formell påminnelse (e-post)
                              ↓
                         7 dagar → Gäldenär svarar?
                                   ├─ Ja → Avsluta
                                   └─ Nej → SMS-krav
                                             ↓
                                        8 dagar → Sista varning (e-post)
                                                  ↓
                                             5 dagar → Eskalera till inkasso
```

Flödet är konfigurerbart via den visuella **Flow Builder** (`/dashboard/flow-builder`).

---

## Deploy (Vercel)

```bash
npm run build   # Verifiera att builden går igenom
vercel deploy   # Deploy till Vercel
```

Lägg till alla env-variabler i Vercel Dashboard → Settings → Environment Variables.

---

## Licens

Proprietär — © 2026 Superclaim.io. Alla rättigheter förbehållna.
