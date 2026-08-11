-- ============================================================================
-- 0005_soap_cases.sql
-- SOAP notes with a private/shared visibility flag. Shared cases are visible
-- to other authenticated vets and support peer-discussion comments.
-- ============================================================================

create table public.soap_cases (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references public.profiles (id) on delete cascade,
  patient_name  text,
  species       text,
  subjective    text,
  objective     text,
  assessment    text,
  plan          text,
  visibility    text not null default 'private' check (visibility in ('private', 'shared')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index soap_cases_author_id_idx  on public.soap_cases (author_id);
create index soap_cases_visibility_idx on public.soap_cases (visibility);
create index soap_cases_created_at_idx on public.soap_cases (created_at desc);

alter table public.soap_cases enable row level security;

create policy "soap_cases_select_own_or_shared"
  on public.soap_cases for select
  to authenticated
  using (auth.uid() = author_id or visibility = 'shared');

create policy "soap_cases_insert_own"
  on public.soap_cases for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "soap_cases_update_own"
  on public.soap_cases for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "soap_cases_delete_own"
  on public.soap_cases for delete
  to authenticated
  using (auth.uid() = author_id);

create trigger soap_cases_set_updated_at
  before update on public.soap_cases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Peer-discussion comments on shared cases. Visible/insertable only to users
-- who can already see the case (its author, or anyone, since it's shared).
-- ---------------------------------------------------------------------------
create table public.soap_case_comments (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.soap_cases (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index soap_case_comments_case_id_idx on public.soap_case_comments (case_id, created_at);

alter table public.soap_case_comments enable row level security;

create policy "soap_case_comments_select_if_case_visible"
  on public.soap_case_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.soap_cases sc
      where sc.id = soap_case_comments.case_id
        and (sc.author_id = auth.uid() or sc.visibility = 'shared')
    )
  );

create policy "soap_case_comments_insert_if_case_visible"
  on public.soap_case_comments for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.soap_cases sc
      where sc.id = soap_case_comments.case_id
        and (sc.author_id = auth.uid() or sc.visibility = 'shared')
    )
  );

create policy "soap_case_comments_delete_own"
  on public.soap_case_comments for delete
  to authenticated
  using (auth.uid() = author_id);
