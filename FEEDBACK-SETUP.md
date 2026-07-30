# Feedback setup

Joye Life v2.5 includes a dashboard feedback form. Every submission is saved to Supabase. Email delivery is optional and becomes active as soon as Resend is configured.

## 1. Create the feedback table

In Supabase SQL Editor, paste and run the contents of `supabase/feedback.sql`.

## 2. Test database feedback

Deploy the update, submit feedback, then check `Supabase > Table Editor > feedback`.

## 3. Send feedback directly to your email

Create a Resend account and add these variables in Vercel:

- `RESEND_API_KEY` — the API key from Resend
- `FEEDBACK_TO_EMAIL` — the email address that should receive submissions
- `FEEDBACK_FROM_EMAIL` — optional; use `Joye Life Feedback <onboarding@resend.dev>` during testing

Redeploy after adding variables. Until Resend is configured, feedback is still saved in Supabase and the form remains fully usable.

For public production email, verify a domain in Resend and change `FEEDBACK_FROM_EMAIL` to an address on that domain.
