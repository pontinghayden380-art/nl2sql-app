# NL2SQL — Natural Language to SQL

Ask questions about your database in plain English, get valid SQL back —
with optional live, read-only execution against your own Postgres database.

**Stack (100% free tier):**
- Next.js 14 (frontend + API routes)
- Supabase (free Postgres + built-in email/password auth)
- Groq (Llama 3.3 70B) for NL → SQL generation — free tier, no credit card
- Vercel (free hosting, auto-deploys from GitHub)

---

## 1. Supabase setup (free)

1. Go to https://supabase.com → create a free project.
2. Once created, go to **SQL Editor → New query**, paste the contents of
   `supabase/schema.sql` from this repo, and run it. This creates the
   `connections` and `queries` tables with row-level security so users
   only ever see their own data.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. (Optional but recommended) Go to **Authentication → Providers → Email**
   and disable "Confirm email" while testing, so signup doesn't require
   clicking a confirmation link every time.

## 2. Groq API key (free, no credit card)

1. Go to https://console.groq.com → sign up → **API Keys** → create a key.
2. Copy it into `GROQ_API_KEY`.
3. Free tier limits: 30 requests/min, 1,000 requests/day — plenty for personal use. If you outgrow it, Groq's paid tier is also very cheap.

## 3. Local setup

```bash
cp .env.example .env.local
# fill in the 3 values above in .env.local

npm install
npm run dev
```

Open http://localhost:3000, sign up, add a schema, start asking questions.

## 4. Deploy for free — Vercel

1. Push this folder to a new GitHub repo.
2. Go to https://vercel.com → **Add New → Project** → import the repo.
3. In **Environment Variables**, add the same 3 keys from `.env.local`.
4. Click **Deploy**. Vercel's free (Hobby) tier is enough for this app —
   you get a live `https://your-app.vercel.app` URL, auto-redeployed on
   every git push.

That's it — the app is now live, with real auth, a real database, and
real AI-generated SQL, entirely on free tiers.

---

## How it works

1. User signs up / logs in via Supabase Auth (email + password).
2. User pastes a schema (CREATE TABLE statements, or plain-English table
   descriptions) and optionally a Postgres connection string for their
   own database.
3. User asks a question in plain English. The `/api/query` route sends
   the schema + question to Groq (Llama 3.3 70B), which returns a single
   SQL SELECT statement plus a one-line explanation.
4. If a live connection string was provided, the app executes the query
   — but only if it's a single read-only `SELECT` (enforced both by the
   prompt and by a hard server-side check in `lib/db.ts`), with a 5s
   timeout and a 200-row cap.

## Security notes before real production use

- Connection strings are currently stored in plain text in the
  `connections` table. For real production use, encrypt them at rest
  (e.g. Supabase Vault, or your own KMS) before storing.
- The read-only guard in `lib/db.ts` blocks obvious write/DDL keywords
  and multiple statements, but for handling truly untrusted databases at
  scale, run queries through a database user that only has `SELECT`
  grants — that's a stronger guarantee than string-matching.
- Add rate limiting on `/api/query` (e.g. Vercel's built-in rate limiting
  or Upstash) before opening this up publicly, since each question is a
  paid Anthropic API call.

## Project structure

```
app/
  page.tsx                 landing page
  login/, signup/           auth pages
  dashboard/                main app (schema mgmt + chat UI)
  api/connections/          save/list schemas
  api/query/                NL -> SQL via Groq (+ optional execution)
lib/
  supabaseClient.ts          browser Supabase client
  supabaseServer.ts          server Supabase client
  db.ts                      safe read-only query executor
supabase/schema.sql          DB tables + RLS policies
middleware.ts                protects /dashboard routes
```
