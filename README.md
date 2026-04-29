# ProView AI — Production Deployment Guide

AI-powered interview training platform built with React 19, TanStack Start, Supabase, and Cloudflare Workers.

## What Changed From Lovable Export

| File | Change |
|------|--------|
| `vite.config.ts` | Replaced `@lovable.dev/vite-tanstack-config` with standard Vite plugins |
| `package.json` | Removed `@lovable.dev/vite-tanstack-config`, added `wrangler` devDep |
| `superbase/functions/interview-chat/index.ts` | Replaced Lovable AI gateway → Google Gemini API |
| `superbase/functions/interview-feedback/index.ts` | Replaced Lovable AI gateway → Google Gemini API |
| `wrangler.jsonc` | Updated project name to `proview-ai` |
| `.env.example` | Added with clear instructions |
| `public/robots.txt` | Added for SEO |
| `public/sitemap.xml` | Added for SEO |

---

## Prerequisites

- Node.js 18+ (or Bun)
- A [Supabase](https://supabase.com) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com) API key (free tier works)
- A [Cloudflare](https://cloudflare.com) account (free tier works) — OR Vercel/Netlify

---

## Step 1: Install Dependencies

```bash
npm install
```

---

## Step 2: Set Up Environment Variables

```bash
cp .env.example .env
```

Open `.env` and fill in:
- `VITE_SUPABASE_URL` — from Supabase Dashboard → Settings → API → Project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — from Supabase Dashboard → Settings → API → anon/public key
- `SUPABASE_URL` — same as above (used server-side)
- `SUPABASE_PUBLISHABLE_KEY` — same as above (used server-side)

---

## Step 3: Add Google AI Key to Supabase (CRITICAL)

Your AI interview features need a Google Gemini API key stored securely as a Supabase secret.

1. Go to https://aistudio.google.com/app/apikey → Create API key (free)
2. Go to Supabase Dashboard → your project → Settings → Edge Functions → Secrets
3. Click "Add new secret"
   - Name: `GOOGLE_API_KEY`
   - Value: your key from step 1
4. Click Save

> This key is NEVER sent to the browser. It only lives in the Supabase server environment.

---

## Step 4: Run Database Migrations

Your Supabase project already has these tables if you were using it with Lovable. If starting fresh:

1. Go to Supabase Dashboard → SQL Editor
2. Run each file in order:
   - `superbase/migrations/20260423...sql` (profiles + test_attempts tables)
   - `superbase/migrations/20260424...sql` (interview_sessions table)
   - `superbase/migrations/20260425...sql` (avatars storage bucket)

---

## Step 5: Deploy Supabase Edge Functions

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login
supabase login

# Link to your existing project
supabase link --project-ref YOUR_PROJECT_ID
# (find YOUR_PROJECT_ID in Supabase Dashboard URL: supabase.com/dashboard/project/YOUR_PROJECT_ID)

# Deploy both edge functions
supabase functions deploy interview-chat --project-ref YOUR_PROJECT_ID
supabase functions deploy interview-feedback --project-ref YOUR_PROJECT_ID
```

---

## Step 6: Update Supabase Auth Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set **Site URL** to your production domain (e.g. `https://proviewai.com`)
3. Add to **Redirect URLs**: `https://proviewai.com/**`

---

## Step 7: Run Locally

```bash
npm run dev
```

Open http://localhost:3000

---

## Step 8: Deploy to Cloudflare Pages

```bash
# Build
npm run build

# First deploy (creates the Pages project)
npx wrangler pages deploy dist --project-name proview-ai

# After first deploy, you can use the shortcut:
npm run deploy
```

Or use GitHub auto-deploy:
1. Push your code to GitHub
2. Cloudflare Dashboard → Pages → Create a project → Connect to Git
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variables (Settings → Environment Variables):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`

---

## Step 9: Set Up Custom Domain

1. Cloudflare Pages → your project → Custom Domains → Add domain
2. Enter your domain (e.g. `proviewai.com`)
3. At your domain registrar, add a CNAME record:
   ```
   www   CNAME   proview-ai.pages.dev
   ```
4. SSL certificate is auto-provisioned by Cloudflare (free)

---

## Alternative: Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Set the same environment variables in the Vercel dashboard under Settings → Environment Variables.

---

## Folder Structure

```
proview-ai/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # shadcn/ui components (DO NOT EDIT)
│   │   ├── SiteHeader.tsx  # Navigation header
│   │   ├── SiteFooter.tsx  # Footer
│   │   └── WebcamCofidence.tsx  # Webcam confidence detection
│   ├── contexts/
│   │   └── AuthContext.tsx # Supabase auth state
│   ├── hooks/              # Custom React hooks
│   ├── integrations/       # Supabase client + types
│   ├── lib/
│   │   ├── questions.ts    # Aptitude test questions
│   │   └── utils.ts        # Tailwind merge utility
│   ├── routes/             # TanStack Router file-based routes
│   │   ├── __root.tsx      # HTML shell + SEO meta
│   │   ├── index.tsx       # Landing page
│   │   ├── signin.tsx      # Sign in page
│   │   ├── signup.tsx      # Sign up page
│   │   ├── _app.tsx        # Authenticated layout wrapper
│   │   ├── _app.dashboard.tsx
│   │   ├── _app.interview.tsx
│   │   ├── _app.profile.tsx
│   │   ├── _app.reports.tsx
│   │   └── _app.test.tsx
│   ├── router.tsx          # Router instance
│   ├── routeTree.gen.ts    # Auto-generated (DO NOT EDIT)
│   └── styles.css          # Tailwind + CSS variables
├── superbase/
│   ├── config.toml
│   ├── functions/
│   │   ├── interview-chat/index.ts     # AI streaming chat
│   │   └── interview-feedback/index.ts # AI feedback generation
│   └── migrations/         # SQL schema files
├── public/
│   ├── robots.txt
│   └── sitemap.xml
├── .env.example            # Copy to .env and fill in values
├── package.json
├── vite.config.ts          # Vite build config
├── wrangler.jsonc          # Cloudflare Workers config
└── tsconfig.json
```

---

## Troubleshooting

**`npm run dev` fails with module not found:**
Run `npm install` again. Make sure `node_modules` exists.

**AI interview not responding:**
- Check that `GOOGLE_API_KEY` is set in Supabase Edge Function secrets (not in .env)
- Redeploy the edge functions: `supabase functions deploy interview-chat`

**Auth redirect loop:**
- Make sure Site URL is set correctly in Supabase Auth settings
- Make sure your `.env` `VITE_SUPABASE_URL` matches your Supabase project URL

**Build fails with TypeScript errors:**
- Run `npm run lint` to see specific errors
- The `routeTree.gen.ts` file is auto-generated — if it's missing, run `npm run dev` once to regenerate it
