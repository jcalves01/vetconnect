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
supabase/migrations/0001_profiles.sql   — profiles table + RLS + auto-provisioning trigger
supabase/migrations/0002_posts.sql      — posts/attachments/likes/comments + post-media bucket
supabase/migrations/0003_soap_cases.sql — soap_cases + soap_case_comments
supabase/migrations/0004_jobs.sql       — jobs + saved_jobs
supabase/migrations/0005_messages.sql   — conversations/messages (1:1) + realtime
supabase/migrations/0006_notifications.sql      — notifications + triggers on likes/comments/messages
supabase/migrations/0007_groups_and_meetings.sql — group chats (extends 0005's tables) + meetings
supabase/migrations/0008_fix_group_conversation_select.sql — RLS fix for group creation (see below)
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
- **Mock data block** (`// ── Mock Data ──`): `SUPPLIERS`, `DRUGS`, `PROTOCOLS`, `SYMPTOMS`, `COURSES`, `MARKET_ITEMS`, lab-panel field defs (`BLOOD_P`/`URINE_P`/`FECES_P`), etc. — still all client-side constants (`POSTS`/`JOBS`/`MSGS`/`CHAT_INIT`/`GROUPS`/`EXPERTS_MAP`/`USERS`/`CASES_SOAP` were removed outright, one by one, as each area they backed went real). **Auth, profiles, the feed, SOAP cases, jobs, direct+group messages, meetings, notifications, the colleague directory (`ExpertMap`), and search over people/cases are all real** (Supabase) — the remaining mock surfaces are `Learn` (courses/live streaming), `Market`'s marketplace sub-tab and `SUPPLIERS`, and `SearchHub`'s "training"/"marketplace" results (which mirror those same two unbuilt areas). See "Auth & database" below for the exact boundary.
- **Top-level tab components**, wired up in `TABS` inside `export default function VetConnect()`: `Home`, `Community`, `Learn`, `Market` (with `SupplierDetail`), `Clinic` (hosting `AIDiagnosis`, `ClinicalCalc`, `DrugDB`, `Protocols`, `SOAPCases`, `ExpertMap`), `Profile`, plus an inline `Settings`. Navigation is `useState` tab-switching (`mainTab`), not a router. `ActiveComp` is rendered with a `me` prop (see below) in addition to `C`/`t`/`isMobile`/`setMainTab`.
- **AI features call two backend routes**: `AIDiagnosis` POSTs to `/api/diagnosis` with `{species, breed, age, sex, symptoms, extra, labText}` and expects back `{resumo, urgencia, proximos_passos, diagnosticos:[{nome, probabilidade, justificacao, testes, tratamento_inicial}]}`; the jobs-report generator in `Market` POSTs to `/api/jobs-report` with `{criteria, jobCount, jobList}` and expects `{report}`. `api/diagnosis.js`/`api/jobs-report.js` implement these directly against `https://api.anthropic.com/v1/messages` with `ANTHROPIC_API_KEY`, no shared helper module (unlike the old `api/_anthropic.js`) — each file inlines its own prompt building, fetch call, and `{`...`}`-slice JSON extraction from the model's text response.
- **Notification engine**: real, backed by `supabase/migrations/0006_notifications.sql` — see the "Auth & database" bullet on that migration below. The engine only covers types with a real trigger behind them (`like`/`comment`/`case_comment`/`msg`); there's no follow system or live-event RSVP, so those old mock notification types have no real equivalent.

## Auth & database (Supabase)

Real authentication and a real `profiles` table were added on top of the single-file artifact — this is the one part of the app backed by an actual database; everything else in "Mock data block" above is still client-side only.

- **`src/lib/supabase.js`** — the only client instance, built from `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`. Logs an error (doesn't throw) if those env vars are missing.
- **`supabase/migrations/0001_profiles.sql`** — `profiles` table (`full_name`, `specialty`, `country`, `license`, `interests text[]`, `bio`, `avatar_url`), RLS (`select` for any authenticated user, `insert`/`update` only your own row), and a `handle_new_user()` trigger on `auth.users` that auto-creates the profile row from `raw_user_meta_data` on signup — this SQL has to be run manually in the Supabase SQL editor (or via the CLI), it is not applied automatically.
- **`VetConnect()`** owns all auth state: `session` (via `supabase.auth.getSession()` + `onAuthStateChange`), `profile` (fetched from `profiles` by `session.user.id`, refetchable via `refreshProfile`), and a derived **`me`** object shaped exactly like a `USERS[]` entry (`id`, `name`, `spec`, `avatar` (initials), `country`, `license`, `bio`, `interests`) so existing code that expected `USERS[0]` as "the current user" only needed its reference swapped, not restructured. `me` is passed down as a prop to every `ActiveComp` (so `Home`, `Community`, `Market`, `Clinic`→`SOAPCases`, and `Profile` all receive it, whether or not they currently use it); the top bar avatar and sidebar footer read it directly since those are defined inside `VetConnect()`'s own closure.
- **`onboarded` = `!!session`**, **`onboardLoaded` = `session !== undefined`** — same two variable names the old `usePersistentState("vc_onboarded", …)` gate used, so the splash-screen/login-vs-app branching logic further down didn't need to change, only what feeds those two booleans.
- **`LoginScreen`** calls `supabase.auth.signInWithPassword` / `signInWithOAuth({provider:"google"})` / `resetPasswordForEmail`. Google sign-in only works once the provider is enabled in the Supabase dashboard (Authentication → Providers) — until then it fails gracefully with the returned error message.
- **`Onboarding`** now collects name/email/password *and* specialty/country/license/interests in one wizard, then calls `supabase.auth.signUp({ email, password, options: { data: {...} } })` on finish — that metadata is what `handle_new_user()` reads to populate the new profile row. If the Supabase project requires email confirmation, `data.session` comes back empty and Onboarding shows a "check your email" screen instead of proceeding.
- **`Profile`** reads/writes the real row (`supabase.from("profiles").update(...)`) instead of local-only state; it shows a skeleton until `profileLoaded` (`!!profile`) is true. Its "posts"/"cases" sub-tabs load the real `posts`/`soap_cases` tables filtered by `author_id = me.id` (fetched once on mount, capped at 10 each) — no longer the old mock `POSTS`/`CASES_SOAP` filtered by the hardcoded `USERS[0].id === 1`.
- **Settings → Sessão → "Terminar Sessão"** calls `supabase.auth.signOut()`.
- **`supabase/migrations/0002_posts.sql`** — `posts` (`author_id`, `type`, `content`, `tags`, `soap jsonb`, denormalized `likes_count`/`comments_count`), `post_attachments` (`type`/`url`/`name`, RLS keyed off the parent post's `author_id`), `post_likes` (composite PK `(post_id, user_id)`) and `post_comments`, plus `AFTER INSERT/DELETE` triggers on `post_likes`/`post_comments` that keep `posts.likes_count`/`comments_count` in sync (the feed reads those denormalized columns directly rather than joining+counting on every load). Also provisions a **public** Storage bucket `post-media` with policies restricting uploads/deletes to a path prefixed by the uploader's own `auth.uid()` (`storage.foldername(name))[1] = auth.uid()::text`) — public read is a deliberate simplicity trade-off (plain `<img>`/`<video src>`, no signed URLs) since the whole feed already sits behind login; the only gap is a direct file URL being viewable without a session.
- **`Home`** now loads the feed from `posts` (joined with `profiles`, `post_attachments`, `post_likes`) via `loadPosts()`/`mapPostRow()` on mount, instead of `usePersistentState("vc_posts", POSTS)`. `submitPost` inserts the row, then uploads any attachment `File`s (kept on each `postAttachments` entry as `.file` — the photo/doc/video picker handlers all set this now) to `post-media/${me.id}/${Date.now()}-${filename}`, then inserts the resulting public URLs into `post_attachments`. Likes (`toggleLike`) and comments (`submitComment`, comments lazy-fetched per post in `toggleComments`) write straight to their tables with an optimistic local update alongside. `POSTS`/`USERS` mock data is no longer used by `Home` at all.
- **`SearchHub`**'s people results ("vets") query `profiles` directly (debounced `ilike` on `full_name`/`specialty`) instead of the old mock `USERS` array (now deleted, along with `CASES_SOAP`, since nothing reads either anymore) — real signups are searchable, but there's no online-presence tracking so results always render with `online:false`/`verified:false`. Its "cases" results also now query real `soap_cases` (`ilike` on `title`/`subjective`, same debounce). "training"/"marketplace" results are still mock (`COURSES`/`MARKET_ITEMS`) — `Learn` and `Market`'s marketplace sub-tab have no backing tables at all yet, so making search "real" there first needs those tabs wired up, which is separate, larger work.
- **`supabase/migrations/0003_soap_cases.sql`** — `soap_cases` (`author_id`, `title`, `species`/`breed`/`age`/`sex`, `status`, `subjective`/`objective`/`assessment`/`plan`, denormalized `replies_count`) + `soap_case_comments`, same select-authenticated/insert-own RLS and comment-count trigger pattern as `0002_posts.sql`. **`SOAPCases`** (Clinic → Casos SOAP) loads via `loadCases()`/`mapCaseRow()`, creates cases with `createCase()`, and lazy-loads/posts comments per case (`openCase()`/`submitCaseComment()`) exactly like `Home`'s post-comment flow — this is a separate table from a post's optional embedded SOAP block (`posts.soap` jsonb), which was already real.
- **`supabase/migrations/0004_jobs.sql`** — `jobs` (`author_id`, `title`, `company`, `type`, `loc`, `salary`, `description`, `urgent`) + `saved_jobs` (composite PK `(job_id,user_id)`, own-rows-only RLS, mirrors `post_likes`). The mock `JOBS` data had a random 60–90% "match" field simulating AI matching; that's not persisted — `computeJobMatch(job, me)` in `Market` derives a lightweight relevance % client-side from overlap between the job's text and the viewer's `interests`/`spec`, so the badge is an honest (if simple) heuristic rather than a stored fake number. "Candidatar" (apply) is still just a client-side confirmation toast — there's no employer inbox/applications table.
- **`supabase/migrations/0005_messages.sql`** — `conversations`/`conversation_participants`/`messages`, originally 1:1-only. A `is_conversation_participant()` SECURITY DEFINER function backs the RLS policies (needed to avoid recursive-RLS on `conversation_participants` checking itself), and `get_or_create_dm(other_user_id)` is an RPC the client calls to find-or-create a *direct* thread without duplicating it on repeat opens. Message attachments reuse the existing `post-media` bucket under `${me.id}/messages/...`. `messages` is added to the `supabase_realtime` publication so `Community` can subscribe to new messages in the open conversation via `supabase.channel(...).on("postgres_changes", ...)`.
- **`supabase/migrations/0008_fix_group_conversation_select.sql`** — corrective migration found during testing: creating a group does `insert into conversations(...).select().single()` from the client, unlike DMs (which go through the RLS-bypassing `get_or_create_dm()` RPC). Right after that insert, the creator isn't a participant yet — `conversation_participants` rows are added in a separate, later request — so the original `conversations_select_participant` policy blocked reading the just-created row back. Fixed by widening that policy to `is_conversation_participant(id) or created_by = auth.uid()`.
- **`supabase/migrations/0007_groups_and_meetings.sql`** — **groups reuse 0005's tables** rather than a parallel schema: it adds `is_group`/`name`/`avatar` columns to `conversations` and re-scopes `get_or_create_dm` (via `create or replace`) to only match non-group, exactly-2-participant conversations, so a 2-person group can never be mistaken for a DM. No new RLS was needed for group messaging itself — `conversation_participants_insert` (from 0005) already allows the creator to add N invitees at creation time. In `Community`, `loadThreads()` fetches both DMs and groups in one pass (splitting on `is_group` client-side) into separate `conversations`/`groups` state; the messages sub-tab and groups sub-tab now share one merged chat pane (`(sub==="messages"||sub==="groups")`), branching only the left-hand list and the chat header (`sel.isGroup`) — `sendMsg`/`handleFile`/`Bubble`/realtime are all shared unchanged. Opening a group also fetches its participant list into `groupMembers`, used to label non-`me` senders in the thread (group chats have no such disambiguation need for DMs). This migration also adds `meetings` (`host_id`, `title`, `scheduled_at timestamptz`, `type`) + `meeting_participants` (same insert-policy shape as `conversation_participants`) — `scheduled_at` is a real timestamp (the UI already collected a `datetime-local` value), which let the Community "calendar" sub-tab's date bucketing ("hoje"/"amanhã"/"próximos dias") be computed from actual dates instead of the string-prefix match the old hardcoded mock array used (that mock array also shadowed the outer `meetings` state under the same name — a pre-existing bug, now fixed as a side effect).
- **`supabase/migrations/0006_notifications.sql`** — `notifications` (`recipient_id`, `actor_id`, `type` restricted to `like`/`comment`/`case_comment`/`msg`, `target` text snippet, `read`), RLS scoped to `recipient_id = auth.uid()` for select/update/delete and **no insert policy at all** — rows are only ever created by four SECURITY DEFINER trigger functions (`notify_post_like`/`notify_post_comment`/`notify_case_comment`/`notify_new_message`, mirroring the `security definer` pattern already used for `handle_post_comment_change` etc.) that fire on `post_likes`/`post_comments`/`soap_case_comments`/`messages` inserts. `notify_new_message` fans out to every other participant, so a group message notifies the whole group. `notifications` is added to `supabase_realtime`; `VetConnect()` loads the initial list on mount and subscribes to new inserts (`mapNotifRow()`), replacing the old client-only `pushNotif()` + `setTimeout` demo engine entirely. `NotifPanel`'s mark-read/mark-all/dismiss now write through to the table (`supabase.from("notifications").update/delete`) instead of only touching local state.
- **`ExpertMap`** (Clinic → 🗺️ Mapa de Especialistas) now queries `profiles` directly (excluding yourself, filterable by `specialty`) instead of the mock `EXPERTS_MAP` array — since `profiles` has no city-level location field, the old fake "interactive map with pins" visual was dropped in favor of a plain filtered list (matching `SearchHub`'s honest-data style); "Contactar" calls the same `get_or_create_dm()` RPC as `Community`'s ✉️+ button and switches to the Community tab, rather than the old fake "✓ Enviado!" toast that didn't do anything. `Onboarding` step 3 previously showed a "colegas sugeridos" list from the mock `USERS` array with a fake follow button (there's no real follow system anywhere in the app) — that's been replaced with a plain review card of what the user just entered (name/specialty/country/license/interests) before account creation.
- **Not yet DB-backed**: `SearchHub`'s "training"/"marketplace" search result sections (its "vets" and "cases" results are both real now) — `Learn` and `Market`'s marketplace sub-tab themselves have no backing tables yet.

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
