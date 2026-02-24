# Vercel Deployment Guide

## Quick Deploy

1. **GitHub**
   - Create a new repo or use existing
   - Push the `superclaim/apps/web` folder (or the whole superclaim project)

2. **Vercel**
   - Import from GitHub
   - **Root Directory:** `apps/web` (if deploying from monorepo) OR deploy this folder as root
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)

3. **Environment Variables** (Vercel Dashboard → Settings → Environment Variables)
   - `NEXT_PUBLIC_SUPABASE_URL` – Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase anon/public key
   - `NEXT_PUBLIC_APP_URL` – Your Vercel URL (e.g. `https://superclaim.vercel.app`)

4. **Supabase Redirect URLs**
   - In Supabase Dashboard → Authentication → URL Configuration
   - Add: `https://your-app.vercel.app/auth/callback`
   - Add: `https://your-app.vercel.app` to Site URL
