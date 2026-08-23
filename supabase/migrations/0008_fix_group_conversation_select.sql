-- ============================================================================
-- 0008_fix_group_conversation_select.sql
-- Fixes a chicken-and-egg RLS gap introduced by 0007: creating a group does
-- `insert into conversations(...).select().single()` from the client (unlike
-- DMs, which go through the get_or_create_dm() SECURITY DEFINER RPC and so
-- never hit RLS at all). At the instant right after that insert, the creator
-- isn't a participant yet — the conversation_participants rows are inserted
-- in a separate, subsequent request — so `conversations_select_participant`
-- blocked reading the just-created row back, and PostgREST's insert+select
-- (`Prefer: return=representation`, which supabase-js's `.select()` sends)
-- failed with a 403 even though the insert itself succeeded.
-- ============================================================================

drop policy "conversations_select_participant" on public.conversations;

create policy "conversations_select_participant"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(id) or created_by = auth.uid());
