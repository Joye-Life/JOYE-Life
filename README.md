# Joye Life v3

Production rebuild of Joye Life using Next.js, TypeScript, Tailwind CSS, Supabase Auth, and a shared context engine.

## Included in this milestone

- New maintainable Next.js app structure
- Public marketing page
- Gated beta application form and server route
- Supabase email/password authentication screens
- Protected dashboard middleware
- Redesigned Today experience
- Shared Joye signal and recommendation engine
- Admin application list skeleton
- Supabase v3 schema and Row Level Security migration
- Mobile dashboard navigation

## Replace the current repository

This is a full rebuild, not an in-place static HTML update. Back up the current `main` branch or tag it as `v2.7`, then replace the repository contents with this folder.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Open Supabase SQL Editor.
2. Run `supabase/migrations/001_v3_foundation.sql`.
3. In Authentication settings, add your local and Vercel URLs to allowed redirect URLs.
4. Add the variables from `.env.example` to Vercel.

The server-only `SUPABASE_SECRET_KEY` must never be committed or exposed to the browser.

## Vercel

After pushing this code to `main`, Vercel should detect Next.js automatically. Remove any old static-site framework overrides or root-directory settings before redeploying.

## Important beta gate

The database defaults new profiles to `access_status = 'pending'`. The next milestone will enforce approved-email matching during signup and add Approve/Reject/Invite actions to the admin portal. The application flow is already stored in `beta_applications`.

## Next milestone

- Approval enforcement and invite flow
- Authenticated onboarding backed by Supabase
- Load real user data into the Joye Context Engine
- Functional Plan, Progress, Coach, and Profile modules
