-- ============================================================================
-- 0004_jobs.sql
-- Job postings ("Vagas") + expressions of interest / applications.
-- ============================================================================

create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  description    text,
  employer_name  text,   -- clinic/company name; may differ from author's profile name
  location       text,
  salary_range   text,   -- free text, e.g. "1200-1500€" or "a negociar"
  contact_info   text,   -- free text: email/phone/instructions
  status         text not null default 'open' check (status in ('open', 'closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index jobs_status_idx     on public.jobs (status);
create index jobs_created_at_idx on public.jobs (created_at desc);
create index jobs_author_id_idx  on public.jobs (author_id);

alter table public.jobs enable row level security;

create policy "jobs_select_authenticated"
  on public.jobs for select
  to authenticated
  using (true);

create policy "jobs_insert_own"
  on public.jobs for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "jobs_update_own"
  on public.jobs for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "jobs_delete_own"
  on public.jobs for delete
  to authenticated
  using (auth.uid() = author_id);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Expressions of interest / applications. One per (job, applicant); no status
-- tracking (accepted/rejected) — presence of the row is enough for v1.
-- ---------------------------------------------------------------------------
create table public.job_applications (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs (id) on delete cascade,
  applicant_id  uuid not null references public.profiles (id) on delete cascade,
  message       text,
  created_at    timestamptz not null default now(),
  unique (job_id, applicant_id)
);

create index job_applications_job_id_idx       on public.job_applications (job_id);
create index job_applications_applicant_id_idx on public.job_applications (applicant_id);

alter table public.job_applications enable row level security;

-- Visible to the applicant themself, or to the job's author (to see who applied).
create policy "job_applications_select_own_or_job_owner"
  on public.job_applications for select
  to authenticated
  using (
    auth.uid() = applicant_id
    or exists (
      select 1 from public.jobs j
      where j.id = job_applications.job_id
        and j.author_id = auth.uid()
    )
  );

create policy "job_applications_insert_own"
  on public.job_applications for insert
  to authenticated
  with check (auth.uid() = applicant_id);

create policy "job_applications_delete_own"
  on public.job_applications for delete
  to authenticated
  using (auth.uid() = applicant_id);
