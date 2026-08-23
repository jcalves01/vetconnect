-- ============================================================================
-- 0005_messages.sql
-- Direct (1:1) messaging for Community > Mensagens.
--
-- Scope note: this covers direct conversations only. Groups and
-- meetings/calendar (also under Community) still render from mock data —
-- they're a separate, larger piece of work (group membership + realtime
-- multi-party chat vs. simple 2-party threads) and were intentionally left
-- out of this pass.
-- ============================================================================

create table public.conversations (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations(id) on delete cascade,
  author_id        uuid not null references public.profiles(id) on delete cascade,
  text             text not null default '',
  attachment_type  text check (attachment_type in ('image','video','document')),
  attachment_url   text,
  attachment_name  text,
  created_at       timestamptz not null default now()
);

alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- Membership check as a SECURITY DEFINER function: policies on
-- conversation_participants can't select from itself to check membership
-- (that's exactly the recursive case Postgres RLS forbids), so both that
-- table's and the other tables' policies call this instead.
-- ---------------------------------------------------------------------------
create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

create policy "conversations_select_participant"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));

create policy "conversations_insert_own"
  on public.conversations for insert to authenticated
  with check (auth.uid() = created_by);

create policy "conversation_participants_select_participant"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));

-- Insert is allowed either for yourself, or by whoever created the
-- conversation (so they can add the other party right after creating it).
create policy "conversation_participants_insert"
  on public.conversation_participants for insert to authenticated
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.created_by = auth.uid()
    )
  );

create policy "messages_select_participant"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "messages_insert_own"
  on public.messages for insert to authenticated
  with check (auth.uid() = author_id and public.is_conversation_participant(conversation_id));

-- ---------------------------------------------------------------------------
-- Find-or-create a direct conversation between the caller and one other
-- user, so the client doesn't have to juggle the two-insert dance (and
-- doesn't create duplicate threads on repeat opens of the same person).
-- ---------------------------------------------------------------------------
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
  where cp1.user_id = auth.uid() and cp2.user_id = other_user_id
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

-- Realtime: let the client subscribe to new messages in the open conversation.
alter publication supabase_realtime add table public.messages;
