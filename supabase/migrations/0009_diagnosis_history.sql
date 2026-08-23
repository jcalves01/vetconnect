-- ============================================================================
-- 0009_diagnosis_history.sql
-- AI diagnosis history (Clinic > Diagnóstico IA), replacing the per-browser
-- usePersistentState("vc_ai_history", ...) with real per-user storage.
--
-- Unlike posts/soap_cases/jobs, this is private clinical scratch data, not
-- something meant to be visible to other vets — so select is scoped to the
-- author only, not "any authenticated user" like the public-content tables.
-- ============================================================================

create table public.diagnosis_history (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  species    text not null,
  breed      text not null default '',
  age        text not null default '',
  sex        text not null default '',
  symptoms   text not null default '',
  result     jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.diagnosis_history enable row level security;

create policy "diagnosis_history_select_own" on public.diagnosis_history for select to authenticated using (auth.uid() = author_id);
create policy "diagnosis_history_insert_own" on public.diagnosis_history for insert to authenticated with check (auth.uid() = author_id);
create policy "diagnosis_history_delete_own" on public.diagnosis_history for delete to authenticated using (auth.uid() = author_id);
