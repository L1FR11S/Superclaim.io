# Vercel Deployment – 404 Fix

Om du får **404 NOT_FOUND** på Vercel:

## Sätt Root Directory

1. Gå till [vercel.com/dashboard](https://vercel.com/dashboard)
2. Välj ditt **Superclaim**-projekt
3. **Settings** → **General**
4. Under **Root Directory** → klicka **Edit**
5. Ange: `superclaim/apps/web`
6. Klicka **Save**
7. Gå till **Deployments** → klicka **⋯** på senaste deploy → **Redeploy**

Vercel bygger då från rätt mapp där `package.json` och Next.js finns.
