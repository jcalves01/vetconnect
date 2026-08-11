-- ============================================================================
-- 0001_profiles.sql
-- Public profile table (extends auth.users) + auto-provisioning trigger for
-- both email/password signup and Google OAuth.
-- ============================================================================

create extension if not exists pgcrypto;

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  specialty   text,   -- especialidade (free text, e.g. "Cirurgia", "Exóticos")
  avatar_url  text,
  bio         text,
  location    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users; profile info. Row is created automatically by handle_new_user().';

alter table public.profiles enable row level security;

-- Profiles are only visible to authenticated members of the network, not to
-- logged-out visitors.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No delete policy: profile rows only disappear via the auth.users FK cascade
-- (account deletion), not client-side deletes.

-- ---------------------------------------------------------------------------
-- Shared updated_at trigger helper, reused by posts/jobs/soap_cases too.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profiles row whenever a new auth.users row appears, whether
-- signup came via email/password or Google OAuth. SECURITY DEFINER lets this
-- bypass RLS (it must insert as an unauthenticated/newly-authenticating user).
--
-- Prefill logic:
--   full_name  <- raw_user_meta_data.full_name (email/password signup, if you
--                 pass { data: { full_name } } to supabase.auth.signUp())
--                 OR .name (Google's field) OR email local-part as last resort.
--   avatar_url <- raw_user_meta_data.avatar_url OR .picture (Google's field).
--   specialty, bio, location are NEVER available from either provider — they
--   stay NULL and must be filled in by the user in a "complete your profile"
--   step after first login.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
