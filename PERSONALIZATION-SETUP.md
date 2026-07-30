# Joye Life Personalization v1

This version adds a personalized onboarding flow, a local recommendation engine, free-form Ask Joye questions, and an optional server-side AI coach.

## Works immediately

The dashboard uses the user's saved profile, time, energy, current stress, money plan, goals, tasks, and career milestones to produce a personalized next move. Data remains in that browser for this prototype.

## Turn on the AI coach

In Vercel → Project → Environment Variables, add:

- `OPENAI_API_KEY` — your server-side OpenAI API key
- `OPENAI_MODEL` — a model available to your OpenAI account that supports the Responses API and JSON output

Apply them to Production, then redeploy. Never place the API key in GitHub or frontend JavaScript.

Without these variables, the app automatically uses its built-in personalized recommendation engine.

## Recommended next milestone

Add Supabase Auth and user-owned tables protected by Row Level Security so profiles and dashboard data sync across devices.
