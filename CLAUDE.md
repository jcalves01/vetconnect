# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VetConnect — a professional social network for veterinarians, currently a single-file React "artifact" (`src/App.jsx`, ~3900 lines) deployed as a Vite static site on Vercel with two serverless functions proxying the Anthropic API. This is a rewrite-in-place of an earlier, more elaborate Supabase-backed version — see "Previous architecture" below if that version's patterns are ever relevant again.

```
index.html          — mounts #root, loads /src/main.jsx
src/
  main.jsx          — ReactDOM root, renders <App/>
  App.jsx           — the entire app: theming, i18n, mock data, every screen/tab
api/
  diagnosis.js      — POST /api/diagnosis, direct fetch to api.anthropic.com
  jobs-report.js    — POST /api/jobs-report, same pattern
package.json / vite.config.js / vercel.json — standard Vite + Vercel-functions setup
env.example         — ANTHROPIC_API_KEY (+ optional ALLOWED_ORIGIN)
```

`npm install && npm run build` succeeds. `vite.config.js` has no dev-time proxy for `/api/*`, so `npm run dev` alone won't reach the AI endpoints locally — use `vercel dev` (serves frontend + functions together) when working on `AIDiagnosis` or the jobs-report generator.

Everything git tracks at `HEAD` (`ab3f2fd`) belongs to a **previous, different** architecture (Supabase-backed, multi-file components under `src/components/`) and shows as deleted in `git status` — it's fully superseded on disk but still readable via `git show HEAD:<path>` if any of its patterns need to be revisited.

## Architecture of `App.jsx` (the single-file artifact)

Everything lives in one file, all styled with inline style objects (no CSS files, no CSS-in-JS library, no Tailwind). Key structure, top to bottom:

- **Design tokens**: `LIGHT` / `DARK` color objects and style-object factories (`card()`, `btn()`, `inp()`, `tag()`, `ava()`) that every component calls with the active theme (`C`) — this is the app's only "design system."
- **i18n**: `LANGS` (available languages) + `TR` (translation dict) + `getTR(lang, key)`; components read via `useLang()`/`t(key)` from `LangCtx`. Falls back to Portuguese (`TR.pt`) for missing keys.
- **Persistence**: `usePersistentState(key, initial)` wraps `window.storage.get/set` (the Claude.ai artifact sandbox API) instead of `localStorage` — this will not work in a normal browser/Vercel deploy without being swapped out first.
- **Mock data block** (`// ── Mock Data ──`): `USERS`, `POSTS`, `JOBS`, `SUPPLIERS`, `CASES_SOAP`, `DRUGS`, `PROTOCOLS`, `EXPERTS_MAP`, `SYMPTOMS`, lab-panel field defs (`BLOOD_P`/`URINE_P`/`FECES_P`), etc. — there is no real backend or database; all list/detail views render from these constants.
- **Top-level tab components**, wired up in `TABS` inside `export default function VetConnect()`: `Home`, `Community`, `Learn`, `Market` (with `SupplierDetail`), `Clinic` (hosting `AIDiagnosis`, `ClinicalCalc`, `DrugDB`, `Protocols`, `SOAPCases`, `ExpertMap`), `Profile`, plus an inline `Settings`. Navigation is `useState` tab-switching (`mainTab`), not a router.
- **AI features call two backend routes**: `AIDiagnosis` POSTs to `/api/diagnosis` with `{species, breed, age, sex, symptoms, extra, labText}` and expects back `{resumo, urgencia, proximos_passos, diagnosticos:[{nome, probabilidade, justificacao, testes, tratamento_inicial}]}`; the jobs-report generator in `Market` POSTs to `/api/jobs-report` with `{criteria, jobCount, jobList}` and expects `{report}`. `api/diagnosis.js`/`api/jobs-report.js` implement these directly against `https://api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY`, no shared helper module (unlike the old `api/_anthropic.js`) — each file inlines its own prompt building, fetch call, and `{`...`}`-slice JSON extraction from the model's text response.
- **Notification engine**: `VetConnect()` simulates incoming notifications/live-event reminders via `setTimeout` and a `pushNotif()` helper that also fires the browser Notification API — purely client-side demo behavior, not driven by any real event source.

## Previous architecture (in git history, `HEAD`)

If work resumes on the Supabase/Vercel split instead of the single-file artifact, the prior commit had:

```
supabase/migrations/  — SQL run manually in the Supabase SQL editor (schema + RLS + triggers)
src/
  App.jsx              — AuthProvider + 5-tab shell (feed/messages/jobs/soap/profile)
  main.jsx             — React root/mount
  styles.js            — shared inline style primitives
  context/AuthContext.jsx — session + profile state (useAuth())
  components/{auth,layout,feed,messages,jobs,soap,profile}/
  lib/
    api.js       — callDiagnosis(), callJobsReport() — POST to /api/*, never call Anthropic from the browser
    supabase.js  — Supabase client singleton (anon key)
    db.js        — the only place that calls supabase.from(...); one named function per table/operation
api/
  _anthropic.js  — shared server helper (leading "_" = not a route): callAnthropic(), extractJson()
  diagnosis.js   — POST /api/diagnosis
  jobs-report.js — POST /api/jobs-report
```

The key architectural rule from that version, worth preserving if it's resurrected: **two different API-access patterns, don't mix them up**. Anthropic calls are secret-key server-side proxies (`api/*.js` via `callAnthropic()`); Supabase calls go straight from the browser using the anon key, with all access control enforced by Postgres RLS policies in `supabase/migrations/*.sql` (new table → RLS policy first, then a `db.js` function — never add an `/api/*` route for Supabase reads/writes, never use the service-role key client-side).

Env vars for that setup: `ANTHROPIC_API_KEY` (required, server-only), `ANTHROPIC_MODEL` (optional), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — see `git show HEAD:.env.example`.

## Commands

```bash
npm install
npm run dev       # Vite dev server, frontend only — /api/* is NOT proxied, so AI features 404 locally
vercel dev        # frontend + api/*.js functions together (needs `npm i -g vercel` once, and ANTHROPIC_API_KEY in .env.local)
npm run build     # vite build -> dist/
npm run preview   # preview the production build
```

No test runner or linter is configured.

Local env: `cp env.example .env.local` and set `ANTHROPIC_API_KEY`.
