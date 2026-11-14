# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

VetConnect — a professional social network for veterinarians. The UI is a single React file (`src/App.jsx`, ~5300 lines) deployed as a Vite static site on Vercel. Two serverless functions proxy LLM providers, and Supabase provides auth and all persistent data.

```
index.html / src/main.jsx   — mount point; renders <VetConnect/>
src/App.jsx                 — the entire UI (theme, i18n, every tab, Settings, auth screens)
src/lib/supabase.js         — Supabase client singleton (anon key)
api/diagnosis.js            — POST /api/diagnosis (differential diagnosis, 4 providers)
api/jobs-report.js          — POST /api/jobs-report (job-market report, 4 providers)
supabase/migrations/0001…0014 — schema, RLS, triggers; run manually, in order, in the Supabase SQL editor
vercel.json / vite.config.js / env.example
```

## Commands

```bash
npm install
npm run dev       # Vite, frontend only — /api/* is NOT proxied, so AI features 404
vercel dev        # frontend + api/*.js together; needs ANTHROPIC_API_KEY in .env.local
npm run build     # vite build -> dist/
npm run preview   # serve dist/
```

- No lint, no test runner, no test files. There is no test command and no single-test command. Verify UI changes by running the app, and verify the build with `npm run build`.
- Local env: `cp env.example .env.local`, then fill in `ANTHROPIC_API_KEY` (and the optional provider keys), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Architecture of `App.jsx`

Everything is one file, styled with inline style objects. There is no CSS framework.

- **Theme**: `LIGHT`/`DARK` tokens and the style factories `card()`, `btn()`, `inp()`, `tag()`, `ava()`. Each takes the active theme `C`.
- **i18n**: `LANGS`, `TR`, `getTR(lang, key)`, read via `t(key)`. Missing keys fall back to Portuguese.
- **Navigation**: `useState` tab switching (`mainTab`), no router. The `TABS` map at the bottom of `VetConnect()` maps tab ids to components. `ActiveComp` receives `C`, `t`, `isMobile`, `setMainTab`, `me`, `profileLoaded`, `onSignOut`, `onProfileSaved`, and the settings props (`email`, `settings`, `directoryVisible`, `dark`, `setDark`, `currentLang`, `setLangOpen`, `onSettingsSaved`).
- **Components must stay at module scope.** `Settings` used to be defined inside `VetConnect()`, which made React remount it on every render and lose its local state. `SettingsScreen` is now top-level. Any new tab component should follow the same rule.
- **Auth state** lives in `VetConnect()`: `session` (`getSession` + `onAuthStateChange`), `profile` (row from `profiles`, refetched via `refreshProfile`), and a derived `me` object shaped like a user record (`id`, `name`, `spec`, `avatar`, `country`, `license`, `bio`, `interests`). `onboarded = !!session` and `onboardLoaded = session !== undefined` gate the splash/login/app branching.
- **Notifications**: `notifications` rows arrive through a realtime subscription in `VetConnect()` and are shown in `NotifPanel` and as toasts. The browser `Notification` is gated by `profile.settings.notif_push`, read through `notifPrefsRef` because the subscription is set up once per user.
- **AI calls**: `AIDiagnosis` posts to `/api/diagnosis` and `Market`'s report modal posts to `/api/jobs-report`. Both send `provider` (`anthropic` default, `gemini`, `openai`, `deepseek`). The response echoes `provider`, and a diagnosis is stored in `diagnosis_history.result`. Errors carry `.status` and `{error: string}`.
- **Mock data**: only reference/catalog content remains (`SUPPLIERS`, `DRUGS`, `PROTOCOLS`, `SYMPTOMS`, `LEARN_ADS`, lab panel definitions). Everything that represents user or clinical activity reads from Supabase.
- **Persistence gap**: `usePersistentState` uses `window.storage`, which exists only in the Claude.ai artifact sandbox. In the Vercel build it is `undefined`, so `vc_dark`, `vc_lang` and `vc_beta_dismissed` silently don't persist. Use `localStorage` (with try/catch) for these.
- **Not real**: live video and calls. `Learn`'s watch screen and the `meet.vetconnect.pt` room links are placeholders, because no streaming or calling service is integrated.

## Data access and RLS

Two access patterns, and they must not be mixed:

- **AI calls** go through `api/*.js` with secret keys on the server. Never call a provider from the browser.
- **Supabase** is called directly from the browser with the anon key. All access control lives in RLS. Add the table with its policies in a new migration before you write the query.

Patterns in the schema:

- Most tables: `select` for any authenticated user, writes only by the owner (`auth.uid() = author_id` or the equivalent column).
- Private tables, owner-only `select`: `diagnosis_history`, `notifications`, `saved_jobs`, `course_enrollments`, `account_deletion_requests`. `job_applications` is readable by the applicant and by the job's author.
- `is_conversation_participant()` is `SECURITY DEFINER`. It exists to avoid recursive RLS on `conversation_participants`.
- DMs are created with the `get_or_create_dm(other_user_id)` RPC. Groups reuse the `conversations` table with `is_group = true`, and the creator inserts the participants afterwards.
- Counters (`likes_count`, `comments_count`, `replies_count`) are maintained by triggers. Read them, don't recount.
- Notifications are created only by `SECURITY DEFINER` triggers. Clients have no insert policy on `notifications`.
- Live-event status ("live" / "upcoming") is never stored. It is derived from `scheduled_at` and `duration_minutes` on the client.
- `profiles.directory_visible` hides a user from people search and the specialists map. `profiles.settings` (jsonb) holds that user's preferences. Both are written by the owner through `profiles_update_own`.
- `account_deletion_requests` accepts client inserts only. Actually deleting an auth user needs the service-role key on the server, which doesn't exist in this repo yet.
- Storage: public bucket `post-media`. Uploads go under `${auth.uid()}/…`, and public read is deliberate because the UI uses plain `<img>`/`<video>` tags.

## Known gaps

Don't assume these are safe, and check them before relying on the surrounding code:

- `/api/diagnosis` and `/api/jobs-report` have **no authentication**, no rate limit, no input-size limit, and `Access-Control-Allow-Origin: *`. Any caller can spend the provider keys. `ALLOWED_ORIGIN` is documented in `env.example` but not read by the code.
- `conversation_participants_insert` (migration 0005) allows `user_id = auth.uid()` on any conversation. Any authenticated user who knows a conversation UUID can join it and read its history. `meeting_participants` has the same shape, but meetings are public by design.
- `api/*.js` sends the Gemini key in the URL query string (`?key=`). Move it to the `x-goog-api-key` header.
- Settings options that are stored but have no effect yet: email digests and live-event notifications (no sender or reminder job), identity verification (a submission is recorded, but there is no review or "verified" state), and account deletion (a request is recorded, but nothing processes it).

## Gotchas

- **Migrations are not applied automatically.** A new migration only takes effect after you run it in the Supabase SQL editor. Settings writes and certification writes fail until migrations 0013 and 0014 have run.
- `README.md` is the Portuguese deployment guide. It is the only place that documents the Vercel steps.
- The previous Supabase/Vercel multi-file architecture (`src/components/`, `src/lib/db.js`, `api/_anthropic.js`) exists only in git history, before commit `16dbeae`. Use `git show ab3f2fd:<path>` to read it.
