# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VetConnect — a professional social network for veterinarians. The app itself
(feed, profiles, marketplace/jobs, SOAP cases, messaging, etc.) originated as a
single-file React artifact. This repo is the productionized split of that
artifact into:

- **Frontend** — Vite + React, served as a static site. Auth and data
  (profiles, posts, messages, jobs, SOAP cases) are backed by Supabase,
  called directly from the browser.
- **Backend** — two Vercel serverless functions (`/api/diagnosis`,
  `/api/jobs-report`) that act as a secure proxy to the Anthropic API.

The `/api` split exists purely for API-key security: the artifact version
called `api.anthropic.com` directly from the browser (via
`anthropic-dangerous-direct-browser-access`), which exposes the key to anyone
inspecting client code. Now the key lives only in a server-side env var and
the browser never touches it. Supabase access is architected the opposite
way on purpose — see "Two different API-access patterns" below.

**Current state:** `src/App.jsx` is a working shell (not the pasted artifact
JSX) with its own from-scratch UI: an auth screen (email/password + Google)
gating a 5-tab app (feed, mensagens, vagas, casos SOAP, perfil), all wired to
Supabase via `src/lib/db.js`. The AI features (`/api/diagnosis`,
`/api/jobs-report`) exist as backend routes but have no frontend UI calling
them yet — see README.md "Passo 4" if that gets added later.

## Commands

```bash
npm install          # install deps

# Local dev — pick one:
vercel dev           # serves frontend + /api together on :3000 (needs `npm i -g vercel` once)
npm run dev           # Vite only, on :5173; proxies /api/* to :3000 (see vite.config.js) —
                      # run `vercel dev` in a second terminal for the backend

npm run build         # vite build -> dist/
npm run preview       # preview the production build locally
```

There is no test runner or linter configured in this repo.

Local env: `cp .env.example .env.local` and set `ANTHROPIC_API_KEY`,
`VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` (never commit
`.env.local`). `ANTHROPIC_MODEL` is optional, defaults to
`claude-sonnet-4-5`. The Supabase project itself (tables/RLS/auth providers)
is set up manually per README.md, "Passo 4.5" — nothing under `supabase/` is
applied automatically, you must run the migration SQL yourself.

## Architecture

```
supabase/migrations/  — SQL run manually in the Supabase SQL Editor (schema + RLS + triggers, see below)
src/
  App.jsx              — AuthProvider + 5-tab shell (feed/messages/jobs/soap/profile), tab switch via useState (no router)
  main.jsx             — React root/mount
  styles.js             — shared inline style primitives (card/input/button/page) — the app styles itself inline, no CSS framework
  context/AuthContext.jsx — session + profile state; useAuth() exposes user/profile/loading + sign-in/up/out
  components/
    auth/       — AuthScreen, LoginForm, SignupForm, GoogleButton
    layout/     — TabNav
    feed/       — Feed, PostComposer, PostCard, CommentList, CommentComposer
    messages/   — Messages, ConversationList, NewConversationModal, MessageThread, MessageComposer
    jobs/       — Jobs, JobCard, JobForm
    soap/       — SoapCases, SoapCaseCard, SoapCaseForm, SoapCaseComments
    profile/    — Profile
  lib/
    api.js       — frontend helpers: callDiagnosis(), callJobsReport() — POST to /api/*, never call Anthropic from the browser
    supabase.js  — Supabase client singleton (anon key, safe for the browser)
    db.js        — named data-access functions per table/operation (getPosts, createPost, listConversations, applyToJob, …) — the only place that calls supabase.from(...)
api/
  _anthropic.js  — shared server helper (leading "_" = not an HTTP route). Holds callAnthropic() and extractJson()
  diagnosis.js   — POST /api/diagnosis   → AI differential-diagnosis JSON
  jobs-report.js — POST /api/jobs-report → AI-generated jobs-market report text
```

### Two different API-access patterns — don't mix them up

- **Anthropic (`/api/*`)**: the API key is secret, so the browser never sees
  it. Routes proxy through `api/_anthropic.js`'s `callAnthropic()`.
- **Supabase (`src/lib/db.js`)**: the anon key is *meant* to ship to the
  browser. There is no proxy — `db.js` calls `supabase.from(...)` directly,
  and access control is enforced entirely by Postgres Row Level Security
  policies defined in `supabase/migrations/*.sql`. When adding a new table or
  query, add the RLS policy in a new migration file first, then add the
  matching function to `db.js` — never add a `/api/*` route for Supabase
  reads/writes, and never use the service-role key client-side.

New Supabase tables need: RLS enabled (`alter table ... enable row level
security`), explicit `select`/`insert`/`update`/`delete` policies (nothing is
readable/writable by default once RLS is on), and — if the table has an
`updated_at` column — the shared `set_updated_at()` trigger function from
`0001_profiles.sql`.

Both `api/*.js` routes follow the same shape: `readPostBody(req, res)` from
`_anthropic.js` enforces POST + parses the body, the route builds a
`system`/`userPrompt` pair in Portuguese, calls `callAnthropic({ system,
messages, maxTokens })`, and returns JSON. `diagnosis.js` additionally runs
the model's text through `extractJson()` since it expects structured JSON
back (schema: `{ resumo, diagnosticos: [...] }`); `jobs-report.js` returns the
model's raw text as `{ relatorio }`.

When adding new AI-backed endpoints, follow this same pattern: a new
`api/<name>.js` route importing `callAnthropic`/`extractJson`/`readPostBody`
from `_anthropic.js`, plus a matching helper in `src/lib/api.js` that POSTs to
it. Never add a fetch to `api.anthropic.com` from anything under `src/`.

The `lang` field threaded through both API payloads is the UI's current
language code (e.g. `"pt"`); it's passed straight into the system prompt so
model output matches the UI locale. Dates (e.g. `jobs-report`'s `data` field)
are always supplied by the client, not computed server-side, since Vercel
functions don't know the user's timezone.

## Deployment

Deploys via Vercel (`vercel.json`): framework auto-detected as Vite
(`vite build` → `dist/`), non-`/api` routes rewritten to `/index.html` (SPA
routing), `api/*.js` functions capped at `maxDuration: 30`. Required env vars
on Vercel (Production/Preview/Development): `ANTHROPIC_API_KEY`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Supabase's Auth redirect URLs
(Authentication → URL Configuration) must separately include the Vercel
domain, or Google OAuth sign-in will fail in production even with correct
env vars.
