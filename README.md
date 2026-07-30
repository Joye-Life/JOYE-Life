# Joye Life Website v2.1

A deployable Joye Life marketing site plus a functional local-first Joye Life dashboard prototype.

## Included

- Responsive marketing homepage
- Functional dashboard (`app.html`)
- Tasks, paycheck allocation, career milestones, goals, and rule-based Joye Life Coach
- Browser local-storage persistence
- Supabase-backed waitlist through a Vercel serverless function
- Privacy Policy and Terms of Use starter pages
- Vercel configuration and security headers

## Preview locally

The marketing site and dashboard can be previewed with any static server:

```powershell
py -m http.server 8080
```

Open `http://localhost:8080`. The waitlist API will not function under the Python server.

For the full API locally:

```powershell
npm install -g vercel
vercel dev
```

## Configure Supabase

The project URL and publishable key are already recorded in `.env.example`.

1. Open the Supabase SQL Editor and run `supabase/waitlist.sql`.
2. In Supabase, open **Project Settings → API Keys**.
3. Copy the server-side **secret key**. Do not send or paste it into chat.
4. In Vercel, open **Project → Settings → Environment Variables**.
5. Add:
   - `SUPABASE_URL` = `https://wgnottjuttkipccoiqhx.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY` = the publishable key already supplied
   - `SUPABASE_SECRET_KEY` = your server-side secret key
6. Redeploy after saving the variables.

Never put the secret/service-role key in `script.js`, HTML, public configuration, GitHub, screenshots, or chat.

## Deploy to Vercel

1. Create a Git repository and push this folder.
2. Import the repository into Vercel.
3. Add these Environment Variables in Vercel Project Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY` (preferred) or `SUPABASE_SERVICE_ROLE_KEY` for a legacy project
4. Deploy.
5. Test the homepage waitlist form and confirm a row appears in `public.waitlist`.

## Custom domain

In the Vercel project, open **Settings → Domains**, add the domain, then apply the DNS records Vercel provides at the domain registrar. Set the preferred production domain and redirect the alternate `www` or apex version to it.

## Before public launch

- Replace placeholder email addresses if `joye.systems` is not owned.
- Have the Privacy Policy and Terms reviewed by an attorney.
- Add authentication before storing personal dashboard data remotely.
- Add rate limiting and CAPTCHA/Turnstile if waitlist abuse appears.
- Add transactional email confirmation through Resend, Beehiiv, Kit, or another provider.


## v2.3 — Real Ask Joye responses

Ask Joye no longer silently replaces failed AI requests with canned local answers. It now:

- Answers the user’s actual free-form question through `/api/coach`
- Uses recent conversation history for follow-up questions
- Uses saved profile, money, task, goal, and career context only when relevant
- Clearly shows a setup/error message when AI is not connected
- Defaults to `gpt-5.6-luna`, so `OPENAI_MODEL` is optional

Required Vercel variable:

```text
OPENAI_API_KEY=your_server_side_api_key
```

Optional override:

```text
OPENAI_MODEL=gpt-5.6-luna
```


## v2.5 — Feedback and early-access messaging

- Replaced payment-related AI messaging with neutral early-access limitation messaging.
- Added a full in-app Feedback area.
- Saves feedback to a private Supabase table.
- Prepared optional Resend delivery directly to the owner email.
- See `FEEDBACK-SETUP.md`.
