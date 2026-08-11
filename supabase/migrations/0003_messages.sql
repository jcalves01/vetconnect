-- ============================================================================
-- 0003_messages.sql
-- Group-capable messaging: a conversation has N participants (2 for a plain
-- DM, more for a group thread), and messages belong to a conversation.
-- Append-only: no update/delete policy on messages (no edit/unsend in v1).
-- ============================================================================

create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table public.conversation_participants (
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  joined_at        timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_id_idx on public.conversation_participants (user_id);

alter table public.conversation_participants enable row level security;

create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null references public.profiles (id) on delete cascade,
  content          text not null,
  created_at       timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- ---------------------------------------------------------------------------
-- conversations: readable/insertable only by participants; a conversation is
-- created by its creator (who then adds participants, including themself,
-- via conversation_participants inserts below).
-- ---------------------------------------------------------------------------
-- `auth.uid() = created_by` is included (not just the participants check)
-- so that INSERT ... RETURNING on `conversations` can see its own new row
-- immediately — at that point no conversation_participants row exists yet
-- (the creator is added as a participant in a second insert right after),
-- and Postgres RLS filters INSERT/UPDATE RETURNING output through SELECT
-- policies too, so without this clause that second insert would 0-row it.
create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id
        and cp.user_id = auth.uid()
    )
  );

create policy "conversations_insert_as_creator"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- conversation_participants: a participant can see the participant list of
-- any conversation they're in. Rows can be inserted either by a user adding
-- themself, or by the conversation's creator adding other participants
-- (covers the "create group + add members" flow in one go).
-- ---------------------------------------------------------------------------
create policy "conversation_participants_select_if_participant"
  on public.conversation_participants for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp2
      where cp2.conversation_id = conversation_participants.conversation_id
        and cp2.user_id = auth.uid()
    )
  );

create policy "conversation_participants_insert_self_or_as_creator"
  on public.conversation_participants for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_participants.conversation_id
        and c.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- messages: readable/insertable only by participants of the conversation.
-- ---------------------------------------------------------------------------
create policy "messages_select_participant"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );

create policy "messages_insert_as_participant_sender"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id
        and cp.user_id = auth.uid()
    )
  );
