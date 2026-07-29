# Joye Life — Supabase setup

## Already configured

- Project URL: `https://wgnottjuttkipccoiqhx.supabase.co`
- Publishable key: recorded in `.env.example`

## Do this in Supabase

1. Open **SQL Editor**.
2. Paste and run `supabase/waitlist.sql`.
3. Confirm the `waitlist` table appears under **Table Editor**.

## Do this in Vercel

Add these under **Project → Settings → Environment Variables**:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Get `SUPABASE_SECRET_KEY` from Supabase and enter it directly in Vercel. Never expose it publicly.

After adding the variables, redeploy and submit a test email through the homepage. The address should appear in `public.waitlist`.
