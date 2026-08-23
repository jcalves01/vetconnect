-- ============================================================================
-- 0012_courses_and_live_events.sql
-- Learn tab: courses + live events, replacing COURSES/LIVE_EVENTS mock arrays.
--
-- The actual video stream/playback stays a non-functional placeholder (no
-- third-party streaming service is integrated) — only the metadata,
-- registration/enrollment, and live chat around it are made real. "status"
-- (live vs upcoming) is therefore derived client-side from `scheduled_at` +
-- `duration_minutes` vs now(), never stored, so it can't drift from reality.
-- Fake `rating`/`reviews`/`viewers` fields from the mock data are dropped
-- (no review or presence system exists) rather than persisted as fake
-- numbers — registrant/enrollment counts are shown instead, which are real.
-- ============================================================================

create table public.courses (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  type       text not null default 'Curso' check (type in ('Curso','Webinar','Certificação','Masterclass','E-book')),
  price      text not null default 'Gratuito',
  duration   text not null default '',
  icon       text not null default '📚',
  cpd        int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "courses_select_authenticated" on public.courses for select to authenticated using (true);
create policy "courses_insert_own" on public.courses for insert to authenticated with check (auth.uid() = author_id);
create policy "courses_update_own" on public.courses for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "courses_delete_own" on public.courses for delete to authenticated using (auth.uid() = author_id);

create table public.course_enrollments (
  course_id  uuid not null references public.courses(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, user_id)
);

alter table public.course_enrollments enable row level security;

create policy "course_enrollments_select_own" on public.course_enrollments for select to authenticated using (auth.uid() = user_id);
create policy "course_enrollments_insert_own" on public.course_enrollments for insert to authenticated with check (auth.uid() = user_id);
create policy "course_enrollments_delete_own" on public.course_enrollments for delete to authenticated using (auth.uid() = user_id);

create table public.live_events (
  id               uuid primary key default gen_random_uuid(),
  host_id          uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  description      text not null default '',
  scheduled_at     timestamptz not null,
  duration_minutes int not null default 60,
  price            text not null default 'Gratuito',
  tags             text[] not null default '{}',
  icon             text not null default '📡',
  cpd              int not null default 0,
  created_at       timestamptz not null default now()
);

alter table public.live_events enable row level security;

create policy "live_events_select_authenticated" on public.live_events for select to authenticated using (true);
create policy "live_events_insert_own" on public.live_events for insert to authenticated with check (auth.uid() = host_id);
create policy "live_events_update_own" on public.live_events for update to authenticated using (auth.uid() = host_id) with check (auth.uid() = host_id);
create policy "live_events_delete_own" on public.live_events for delete to authenticated using (auth.uid() = host_id);

-- Public headcount (like meeting_participants) rather than private
-- (like saved_jobs) — "who's coming to this public event" is meant to be
-- visible to anyone browsing it, not just the registrant.
create table public.live_event_registrations (
  event_id   uuid not null references public.live_events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.live_event_registrations enable row level security;

create policy "live_event_registrations_select_authenticated" on public.live_event_registrations for select to authenticated using (true);
create policy "live_event_registrations_insert_own" on public.live_event_registrations for insert to authenticated with check (auth.uid() = user_id);
create policy "live_event_registrations_delete_own" on public.live_event_registrations for delete to authenticated using (auth.uid() = user_id);

create table public.live_event_messages (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.live_events(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

alter table public.live_event_messages enable row level security;

create policy "live_event_messages_select_authenticated" on public.live_event_messages for select to authenticated using (true);
create policy "live_event_messages_insert_own" on public.live_event_messages for insert to authenticated with check (auth.uid() = author_id);

alter publication supabase_realtime add table public.live_event_messages;
