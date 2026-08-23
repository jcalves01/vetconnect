-- ============================================================================
-- 0006_notifications.sql
-- Real notifications, replacing the client-only setTimeout demo engine.
--
-- Scope: only events with a real backing table generate notifications —
-- post likes/comments, SOAP case comments, and new direct/group messages.
-- The old mock engine also had "follow"/"live"/"match"/"job" types, but
-- there's no real follow system, live-event RSVP, or job-matching engine
-- behind those, so they're intentionally not reproduced here.
-- ============================================================================

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id     uuid references public.profiles(id) on delete set null,
  type         text not null check (type in ('like','comment','case_comment','msg')),
  target       text not null default '',
  read         boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications for select to authenticated using (auth.uid() = recipient_id);
create policy "notifications_update_own" on public.notifications for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create policy "notifications_delete_own" on public.notifications for delete to authenticated using (auth.uid() = recipient_id);
-- No insert policy for `authenticated` — rows are only ever created by the
-- SECURITY DEFINER trigger functions below, never directly by the client.

create or replace function public.notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_snippet text;
begin
  select author_id, left(content, 80) into v_author, v_snippet from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, target)
    values (v_author, new.user_id, 'like', coalesce(v_snippet, ''));
  end if;
  return new;
end;
$$;
create trigger post_likes_notify after insert on public.post_likes
  for each row execute function public.notify_post_like();

create or replace function public.notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is not null and v_author <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, target)
    values (v_author, new.author_id, 'comment', left(new.text, 120));
  end if;
  return new;
end;
$$;
create trigger post_comments_notify after insert on public.post_comments
  for each row execute function public.notify_post_comment();

create or replace function public.notify_case_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_title text;
begin
  select author_id, title into v_author, v_title from public.soap_cases where id = new.case_id;
  if v_author is not null and v_author <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, target)
    values (v_author, new.author_id, 'case_comment', coalesce(v_title, ''));
  end if;
  return new;
end;
$$;
create trigger soap_case_comments_notify after insert on public.soap_case_comments
  for each row execute function public.notify_case_comment();

-- One new message can fan out to several recipients (group chats), unlike
-- the single-recipient triggers above.
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, target)
  select cp.user_id, new.author_id, 'msg',
         left(coalesce(nullif(new.text, ''), '📎 enviou um anexo'), 120)
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id and cp.user_id <> new.author_id;
  return new;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row execute function public.notify_new_message();

alter publication supabase_realtime add table public.notifications;
