-- ============================================================================
-- 0014_user_settings.sql
-- Backs the Definições screen:
--   * profiles.directory_visible — hides the user from people search / the
--     specialists map when false (the profile still shows on their own posts).
--   * profiles.settings          — per-user preferences (notifications, the
--     identity-verification submission state). Written by the owner only via
--     the existing profiles_update_own policy.
--   * account_deletion_requests  — GDPR erasure requests. The client can only
--     insert its own request; processing (actually deleting the auth user and
--     cascading rows) has to run server-side with the service role.
-- ============================================================================

alter table public.profiles
  add column if not exists directory_visible boolean not null default true;

alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;

create table public.account_deletion_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  status       text not null default 'pending' check (status in ('pending','processed','cancelled'))
);

alter table public.account_deletion_requests enable row level security;

create policy "account_deletion_requests_select_own"
  on public.account_deletion_requests for select to authenticated
  using (auth.uid() = user_id);

create policy "account_deletion_requests_insert_own"
  on public.account_deletion_requests for insert to authenticated
  with check (auth.uid() = user_id);
