-- ============================================================================
-- 0010_job_applications.sql
-- Job applications (Market > Emprego, "Candidatar"), replacing the old
-- fire-and-forget confirmation toast that recorded nothing.
-- ============================================================================

create table public.job_applications (
  job_id       uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (job_id, applicant_id)
);

alter table public.job_applications enable row level security;

create policy "job_applications_select_own" on public.job_applications for select to authenticated using (auth.uid() = applicant_id);
create policy "job_applications_insert_own" on public.job_applications for insert to authenticated with check (auth.uid() = applicant_id);

-- The job's poster can see who applied to their own listing (there's no
-- "view applicants" screen yet, but the access boundary should exist from
-- the start — an application nobody can ever read isn't meaningful data).
create policy "job_applications_select_employer"
  on public.job_applications for select to authenticated
  using (exists (select 1 from public.jobs j where j.id = job_id and j.author_id = auth.uid()));
