# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VetConnect — a professional social network for veterinarians, currently a single-file React "artifact" (`src/App.jsx`, ~3900 lines) deployed as a Vite static site on Vercel with two serverless functions proxying the Anthropic API. This is a rewrite-in-place of an earlier, more elaborate Supabase-backed version — see "Previous architecture" below if that version's patterns are ever relevant again.

```
index.html          — mounts #root, loads /src/main.jsx
src/
  main.jsx          — ReactDOM root, renders <App/>
  App.jsx           — the entire app: theming, i18n, mock data, every screen/tab
  lib/
    supabase.js     — Supabase client singleton (anon key, safe for the browser)
api/
  diagnosis.js      — POST /api/diagnosis, direct fetch to api.anthropic.com
  jobs-report.js    — POST /api/jobs-report, same pattern
supabase/migrations/0001_profiles.sql — profiles table + RLS + auto-provisioning trigger
package.json / vite.config.js / vercel.json — standard Vite + Vercel-functions setup
env.example         — ANTHROPIC_API_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

`npm install && npm run build` succeeds. `vite.config.js` has no dev-time proxy for `/api/*`, so `npm run dev` alone won't reach the AI endpoints locally — use `vercel dev` (serves frontend + functions together) when working on `AIDiagnosis` or the jobs-report generator.

Everything git tracks at `HEAD` (`ab3f2fd`) belongs to a **previous, different** architecture (Supabase-backed, multi-file components under `src/components/`) and shows as deleted in `git status` — it's fully superseded on disk but still readable via `git show HEAD:<path>` if any of its patterns need to be revisited.

## Architecture of `App.jsx` (the single-file artifact)

Everything lives in one file, all styled with inline style objects (no CSS files, no CSS-in-JS library, no Tailwind). Key structure, top to bottom:

- **Design tokens**: `LIGHT` / `DARK` color objects and style-object factories (`card()`, `btn()`, `inp()`, `tag()`, `ava()`) that every component calls with the active theme (`C`) — this is the app's only "design system."
- **i18n**: `LANGS` (available languages) + `TR` (translation dict) + `getTR(lang, key)`; components read via `useLang()`/`t(key)` from `LangCtx`. Falls back to Portuguese (`TR.pt`) for missing keys.
- **Persistence**: `usePersistentState(key, initial)` wraps `window.storage.get/set` (the Claude.ai artifact sandbox API) instead of `localStorage` — this will not work in a normal browser/Vercel deploy without being swapped out first.
- **Mock data block** (`// ── Mock Data ──`): `USERS`, `POSTS`, `JOBS`, `SUPPLIERS`, `CASES_SOAP`, `DRUGS`, `PROTOCOLS`, `EXPERTS_MAP`, `SYMPTOMS`, lab-panel field defs (`BLOOD_P`/`URINE_P`/`FECES_P`), etc. — still all client-side constants, EXCEPT the feed (`POSTS` itself is now dead code / unused by `Home`, kept only because `Profile`'s "posts" sub-tab and `Onboarding` step 3 still render mock content elsewhere). **Auth, profiles, and the feed (posts/likes/comments/attachments) are real** (Supabase); jobs/messages/SOAP-case *content* still renders from mock constants — see "Auth & database" below for the exact boundary.
- **Top-level tab components**, wired up in `TABS` inside `export default function VetConnect()`: `Home`, `Community`, `Learn`, `Market` (with `SupplierDetail`), `Clinic` (hosting `AIDiagnosis`, `ClinicalCalc`, `DrugDB`, `Protocols`, `SOAPCases`, `ExpertMap`), `Profile`, plus an inline `Settings`. Navigation is `useState` tab-switching (`mainTab`), not a router. `ActiveComp` is rendered with a `me` prop (see below) in addition to `C`/`t`/`isMobile`/`setMainTab`.
- **AI features call two backend routes**: `AIDiagnosis` POSTs to `/api/diagnosis` with `{species, breed, age, sex, symptoms, extra, labText}` and expects back `{resumo, urgencia, proximos_passos, diagnosticos:[{nome, probabilidade, justificacao, testes, tratamento_inicial}]}`; the jobs-report generator in `Market` POSTs to `/api/jobs-report` with `{criteria, jobCount, jobList}` and expects `{report}`. `api/diagnosis.js`/`api/jobs-report.js` implement these directly against `https://api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY`, no shared helper module (unlike the old `api/_anthropic.js`) — each file inlines its own prompt building, fetch call, and `{`...`}`-slice JSON extraction from the model's text response.
- **Notification engine**: `VetConnect()` simulates incoming notifications/live-event reminders via `setTimeout` and a `pushNotif()` helper that also fires the browser Notification API — purely client-side demo behavior, not driven by any real event source.

## Auth & database (Supabase)

Real authentication and a real `profiles` table were added on top of the single-file artifact — this is the one part of the app backed by an actual database; everything else in "Mock data block" above is still client-side only.

- **`src/lib/supabase.js`** — the only client instance, built from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Logs an error (doesn't throw) if those env vars are missing.
- **`supabase/migrations/0001_profiles.sql`** — `profiles` table (`full_name`, `specialty`, `country`, `license`, `interests text[]`, `bio`, `avatar_url`), RLS (`select` for any authenticated user, `insert`/`update` only your own row), and a `handle_new_user()` trigger on `auth.users` that auto-creates the profile row from `raw_user_meta_data` on signup — this SQL has to be run manually in the Supabase SQL editor (or via the CLI), it is not applied automatically.
- **`VetConnect()`** owns all auth state: `session` (via `supabase.auth.getSession()` + `onAuthStateChange`), `profile` (fetched from `profiles` by `session.user.id`, refetchable via `refreshProfile`), and a derived **`me`** object shaped exactly like a `USERS[]` entry (`id`, `name`, `spec`, `avatar` (initials), `country`, `license`, `bio`, `interests`) so existing code that expected `USERS[0]` as "the current user" only needed its reference swapped, not restructured. `me` is passed down as a prop to `Home`, `Clinic`→`SOAPCases`, and `Profile`; the top bar avatar and sidebar footer read it directly since those are defined inside `VetConnect()`'s own closure.
- **`onboarded` = `!!session`**, **`onboardLoaded` = `session !== undefined`** — same two variable names the old `usePersistentState("vc_onboarded", …)` gate used, so the splash-screen/login-vs-app branching logic further down didn't need to change, only what feeds those two booleans.
- **`LoginScreen`** calls `supabase.auth.signInWithPassword` / `signInWithOAuth({provider:"google"})` / `resetPasswordForEmail`. Google sign-in only works once the provider is enabled in the Supabase dashboard (Authentication → Providers) — until then it fails gracefully with the returned error message.
- **`Onboarding`** now collects name/email/password *and* specialty/country/license/interests in one wizard, then calls `supabase.auth.signUp({ email, password, options: { data: {...} } })` on finish — that metadata is what `handle_new_user()` reads to populate the new profile row. If the Supabase project requires email confirmation, `data.session` comes back empty and Onboarding shows a "check your email" screen instead of proceeding.
- **`Profile`** reads/writes the real row (`supabase.from("profiles").update(...)`) instead of local-only state; it shows a skeleton until `profileLoaded` (`!!profile`) is true. Its "posts"/"cases" sub-tabs still render from the mock `POSTS`/`CASES_SOAP` constants (filtered by the mock `USERS[0].id === 1`, unrelated to the real logged-in user) — that's demo content, not yours.
- **Settings → Sessão → "Terminar Sessão"** calls `supabase.auth.signOut()`.
- **`supabase/migrations/0002_posts.sql`** — `posts` (`author_id`, `type`, `content`, `tags`, `soap jsonb`, denormalized `likes_count`/`comments_count`), `post_attachments` (`type`/`url`/`name`, RLS keyed off the parent post's `author_id`), `post_likes` (composite PK `(post_id, user_id)`) and `post_comments`, plus `AFTER INSERT/DELETE` triggers on `post_likes`/`post_comments` that keep `posts.likes_count`/`comments_count` in sync (the feed reads those denormalized columns directly rather than joining+counting on every load). Also provisions a **public** Storage bucket `post-media` with policies restricting uploads/deletes to a path prefixed by the uploader's own `auth.uid()` (`storage.foldername(name))[1] = auth.uid()::text`) — public read is a deliberate simplicity trade-off (plain `<img>`/`<video src>`, no signed URLs) since the whole feed already sits behind login; the only gap is a direct file URL being viewable without a session.
- **`Home`** now loads the feed from `posts` (joined with `profiles`, `post_attachments`, `post_likes`) via `loadPosts()`/`mapPostRow()` on mount, instead of `usePersistentState("vc_posts", POSTS)`. `submitPost` inserts the row, then uploads any attachment `File`s (kept on each `postAttachments` entry as `.file` — the photo/doc/video picker handlers all set this now) to `post-media/${me.id}/${Date.now()}-${filename}`, then inserts the resulting public URLs into `post_attachments`. Likes (`toggleLike`) and comments (`submitComment`, comments lazy-fetched per post in `toggleComments`) write straight to their tables with an optimistic local update alongside. `POSTS`/`USERS` mock data is no longer used by `Home` at all.
- **`SearchHub`**'s people results ("vets") query `profiles` directly (debounced `ilike` on `full_name`/`specialty`) instead of filtering the mock `USERS` array — real signups are searchable, but there's no online-presence tracking so results always render with `online:false`/`verified:false`. The "cases"/"training"/"marketplace" result sections in the same search are still mock-only.
- **Not yet DB-backed**: messages/groups/meetings (`Community`), jobs (`Market`), SOAP cases (`SOAPCases`, the dedicated Clinic tab — distinct from a post's optional embedded SOAP block, which *is* real) still live in local component state / `usePersistentState`, seeded from mock constants. Wiring any of these to real tables is separate work, following `0002_posts.sql` as the template.

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
