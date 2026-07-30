# Deployment checklist

1. Tag or download your current v2.7 repository before replacing it.
2. Delete the old static files from the repository.
3. Upload the contents of `joye-life-v3` to the repository root.
4. Run the Supabase migration in `supabase/migrations/001_v3_foundation.sql`.
5. In Vercel, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `ADMIN_EMAIL`
6. Remove old variables named `SUPABASE_URL` only after confirming the waitlist/API code no longer depends on them.
7. Vercel Project Settings → Framework Preset: Next.js (automatic).
8. Root Directory: `./`.
9. Redeploy without the old build cache.
10. Test `/`, `/apply`, `/login`, and `/dashboard`.
