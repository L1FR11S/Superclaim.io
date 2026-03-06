# Superclaim.io Web

Autonomous AI invoice collection platform.

## Deploy to Vercel

1. **Push to GitHub**
   ```bash
   cd superclaim
   git add apps/web
   git commit -m "Add Superclaim web app"
   git push
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import your GitHub repo
   - **Root Directory:** Set to `apps/web` (or deploy from this folder directly)
   - Add environment variables from `.env.example`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `NEXT_PUBLIC_APP_URL` (your Vercel URL)

3. **Deploy** – Vercel will auto-detect Next.js and build.

## Local development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

## Project structure

- `src/app/` – Next.js App Router pages
- `src/components/` – React components
- `src/lib/` – Utilities
- `src/utils/supabase/` – Supabase client (browser + server)
