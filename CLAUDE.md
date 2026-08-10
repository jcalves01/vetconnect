# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VetConnect — a professional social network for veterinarians. The app itself
(feed, profiles, marketplace/jobs, SOAP cases, messaging, etc.) originated as a
single-file React artifact. This repo is the productionized split of that
artifact into:

- **Frontend** — Vite + React, served as a static site.
- **Backend** — two Vercel serverless functions (`/api/diagnosis`,
  `/api/jobs-report`) that act as a secure proxy to the Anthropic API.

The split exists purely for API-key security: the artifact version called
`api.anthropic.com` directly from the browser (via
`anthropic-dangerous-direct-browser-access`), which exposes the key to anyone
inspecting client code. Now the key lives only in a server-side env var and
the browser never touches it.

**Current state:** `src/App.jsx` is still the placeholder scaffold, not the
real VetConnect UI. Integrating the real component means pasting the artifact
JSX into `App.jsx`, ensuring it has a default export, and rewiring its two
direct-Anthropic-fetch call sites to use `callDiagnosis()` /
`callJobsReport()` from `src/lib/api.js` instead (see README.md, "Passo 4",
for the exact before/after). There is no database or auth yet — posts,
messages, SOAP cases, jobs, and users all live in local component
state/storage today; a persistence layer (e.g. Supabase) is the intended next
step per the README's "Notas para escalar" section.

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

Local backend env: `cp .env.example .env.local` and set `ANTHROPIC_API_KEY`
(never commit `.env.local`). `ANTHROPIC_MODEL` is optional, defaults to
`claude-sonnet-4-5`.

## Architecture

```
src/
  App.jsx        — top-level React component (default export), currently a placeholder
  main.jsx       — React root/mount
  lib/api.js     — frontend helpers: callDiagnosis(), callJobsReport() — POST to /api/*, never call Anthropic from the browser
api/
  _anthropic.js  — shared server helper (leading "_" = not an HTTP route). Holds callAnthropic() and extractJson()
  diagnosis.js   — POST /api/diagnosis   → AI differential-diagnosis JSON
  jobs-report.js — POST /api/jobs-report → AI-generated jobs-market report text
```

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
routing), `api/*.js` functions capped at `maxDuration: 30`. Required env var
on Vercel: `ANTHROPIC_API_KEY` (Production/Preview/Development).
