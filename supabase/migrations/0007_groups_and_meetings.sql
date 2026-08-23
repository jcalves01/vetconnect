-- ============================================================================
-- 0007_groups_and_meetings.sql
-- Group chats (reusing 0005's conversations/messages tables) + meetings.
--
-- Groups deliberately reuse `conversations`/`conversation_participants`/
-- `messages` rather than a parallel schema: those tables and their RLS
-- already generalize to N participants (only `get_or_create_dm`'s 1:1
-- lookup assumed exactly 2), so a "group" is just a conversation with
-- `is_group = true`, a `name`, and 2+ participants added at creation time
-- by whoever created it — which `conversation_participants_insert` (from
-- 0005) already allows.
-- ============================================================================

alter table public.conversations add column is_group boolean not null default false;
alter table public.conversations add column name text;
alter table public.conversations add column avatar text not null default '👥';

-- Re-scope the 1:1 lookup so a 2-person group can never be mistaken for a
-- DM thread (and vice versa) when starting a new direct conversation.
create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  select cp1.conversation_id into existing_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  join public.conversations c on c.id = cp1.conversation_id
  where cp1.user_id = auth.uid() and cp2.user_id = other_user_id
    and c.is_group = false
    and (select count(*) from public.conversation_participants cp3 where cp3.conversation_id = cp1.conversation_id) = 2
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (created_by) values (auth.uid()) returning id into new_id;
  insert into public.conversation_participants (conversation_id, user_id) values
    (new_id, auth.uid()),
    (new_id, other_user_id);

  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Meetings (Community > Reuniões). `scheduled_at` is a real timestamptz
-- (the UI already collects a datetime-local value) so the calendar tab can
-- bucket "hoje/amanhã/próximos dias" from actual dates instead of the
-- string-prefix matching the mock version used.
-- ---------------------------------------------------------------------------
create table public.meetings (
  id            uuid primary key default gen_random_uuid(),
  host_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  scheduled_at  timestamptz,
  type          text not null default 'Reunião',
  created_at    timestamptz not null default now()
);

alter table public.meetings enable row level security;

create policy "meetings_select_authenticated" on public.meetings for select to authenticated using (true);
create policy "meetings_insert_own" on public.meetings for insert to authenticated with check (auth.uid() = host_id);
create policy "meetings_delete_own" on public.meetings for delete to authenticated using (auth.uid() = host_id);

create table public.meeting_participants (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meeting_id, user_id)
);

alter table public.meeting_participants enable row level security;

create policy "meeting_participants_select_authenticated" on public.meeting_participants for select to authenticated using (true);

-- Same shape as conversation_participants_insert: add yourself, or the host
-- adds invitees right after creating the meeting.
create policy "meeting_participants_insert"
  on public.meeting_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (select 1 from public.meetings m where m.id = meeting_id and m.host_id = auth.uid())
  );
