-- ============================================================================
-- 0013_certifications.sql
-- Professional certifications shown on the Profile > Certificações tab.
-- Readable by any authenticated user (profiles are a public directory);
-- only the owner can add or remove their own entries.
-- ============================================================================

create table public.certifications (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  title       text not null,
  issuer      text not null default '',
  year        int,
  created_at  timestamptz not null default now()
);

create index certifications_owner_idx on public.certifications (owner_id);

alter table public.certifications enable row level security;

create policy "certifications_select_authenticated"
  on public.certifications for select to authenticated
  using (true);

create policy "certifications_insert_own"
  on public.certifications for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "certifications_delete_own"
  on public.certifications for delete to authenticated
  using (auth.uid() = owner_id);
