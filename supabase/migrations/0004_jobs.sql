-- ============================================================================
-- 0004_jobs.sql
-- Job listings (Market > Emprego) + per-user saved jobs.
--
-- Note: the mock JOBS data had a random "match %" field simulating an AI
-- matching score. There's no real matching model here, so that field is
-- intentionally NOT persisted — the client computes a lightweight relevance
-- hint from the viewer's own profile instead of storing a fabricated number.
-- ============================================================================

create table public.jobs (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  company     text not null,
  type        text not null default 'Full-time',
  loc         text not null default '',
  salary      text not null default 'A definir',
  description text not null default '',
  urgent      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.jobs enable row level security;

create policy "jobs_select_authenticated" on public.jobs for select to authenticated using (true);
create policy "jobs_insert_own" on public.jobs for insert to authenticated with check (auth.uid() = author_id);
create policy "jobs_update_own" on public.jobs for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "jobs_delete_own" on public.jobs for delete to authenticated using (auth.uid() = author_id);

create trigger jobs_set_updated_at before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Saved jobs ("★ Guardado" toggle) — per-user bookmark, same shape as
-- post_likes (composite PK, no separate id column needed).
-- ---------------------------------------------------------------------------
create table public.saved_jobs (
  job_id     uuid not null references public.jobs(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (job_id, user_id)
);

alter table public.saved_jobs enable row level security;

create policy "saved_jobs_select_own" on public.saved_jobs for select to authenticated using (auth.uid() = user_id);
create policy "saved_jobs_insert_own" on public.saved_jobs for insert to authenticated with check (auth.uid() = user_id);
create policy "saved_jobs_delete_own" on public.saved_jobs for delete to authenticated using (auth.uid() = user_id);
